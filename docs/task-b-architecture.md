# Page Pulse — Task B: Architecture for Scale

## 1. Objective and assumptions

The current Page Pulse service audits URLs by making outbound HTTP requests and returning the HTTP status, reachability, and response time.

The target workload is:

- 10,000 audits per day
- Bursts of up to 500 concurrent requests
- A customer-facing response-time SLA
- External websites that may be slow, unavailable, or unreliable

The architecture should protect the service from slow external dependencies while keeping the system simple enough to operate.

---

## 2. Proposed architecture

```text
                    ┌─────────────────┐
                    │    API Client    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   API Service    │
                    │                 │
                    │ - Validation     │
                    │ - Request IDs    │
                    │ - Rate limiting  │
                    │ - Cache lookup   │
                    └───────┬─────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
          ┌──────────────┐      ┌──────────────┐
          │    Redis     │      │ Audit Queue  │
          │              │      │              │
          │ Cache        │      │ Backpressure │
          │ Rate limits  │      │              │
          └──────────────┘      └──────┬───────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Audit Workers  │
                              │                 │
                              │ Concurrency     │
                              │ limits          │
                              │                 │
                              │ Timeouts        │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ External URLs   │
                              └─────────────────┘

## 3. Request data flow
A client sends an audit request.
The API validates the URL.
A request ID is assigned.
The rate limiter checks the client.
The service normalizes the URL and checks Redis.
If a fresh cached result exists, it is returned immediately.
If there is no cached result, the audit is submitted for processing.
A worker performs the outbound HTTP request.
The worker applies a strict timeout and concurrency limit.
The result is stored in Redis with a configurable TTL.
The result is returned to the client or made available through a job-status endpoint.

At larger scale, I would prefer an asynchronous queue-based flow. This prevents 500 simultaneous external requests from directly consuming all API resources.

4. Queueing strategy

The API layer should not create unlimited outbound requests.

A queue provides backpressure between incoming traffic and external URL auditing.

Proposed behaviour
API instances accept and validate requests.
Cache hits are returned immediately.
New audits are added to a queue.
Workers consume jobs with controlled concurrency.
Each outbound request has a strict timeout.
Queue depth is monitored.
If the queue becomes too large, the system can reject or defer new work.

For requests that cannot complete within the customer-facing SLA, the API can return:

{
  "data": {
    "status": "pending",
    "requestId": "request-id"
  }
}

with HTTP 202 Accepted.

This is preferable to keeping a connection open indefinitely while waiting for an unreliable external website.

5. Where state lives
Redis

Redis stores:

Cached audit results
Rate-limit counters
Short-lived job state
Queue state
Request deduplication locks

Example cache key:

page-pulse:audit:<normalized-url>
Application memory

Application memory should only contain temporary request-local state and configuration.

Important shared state should not depend on process memory because multiple application instances may run simultaneously.

Persistent database

A database would be introduced if the product requires:

Long-term audit history
User accounts
Usage reporting
Billing
Customer-level analytics

For the current audit service, Redis is sufficient for short-lived caching and queue state.

Technology Decision Record
Redis
Decision

Use Redis for caching and distributed short-lived state.

Why
Fast read/write operations
Shared across multiple application instances
Suitable for caching
Suitable for rate limiting
Can support queue-based workers
Alternative rejected

An in-memory Map.

Why rejected

An in-memory Map:

Is not shared between application instances
Loses data when the process restarts
Cannot provide reliable distributed rate limiting
Cannot coordinate multiple workers
Queue
Decision

Use a Redis-backed queue such as BullMQ when asynchronous processing is introduced.

Why
Supports retries
Supports delayed jobs
Supports worker concurrency
Provides queue metrics
Uses infrastructure already required for Redis
Alternative rejected

RabbitMQ.

Why rejected for this workload

RabbitMQ is an excellent messaging system, but adding another infrastructure dependency would increase operational complexity when Redis is already required for caching and rate limiting.

I would reconsider RabbitMQ if the system evolved into a larger event-driven platform with many independent message consumers.

HTTP client
Decision

Use a controlled HTTP client with explicit timeout and redirect limits.

The specific library is less important than enforcing:

Connection timeout
Response timeout
Redirect limits
Error classification
Response-size limits where appropriate
Alternative rejected

Unbounded HTTP requests.

Why rejected

An external website can hang indefinitely and consume application resources.

Caching
Decision

Cache successful and classified audit results with a configurable TTL.

Why

Repeated audits of the same URL should not repeatedly consume network capacity.

The cache window should be configurable because different customers may require different freshness guarantees.

Failure Mode Analysis
Failure 1: External websites become slow
Impact

Workers remain occupied for longer and queue depth increases.

Mitigation
Strict outbound request timeout
Worker concurrency limits
Queue backpressure
Retry only appropriate transient failures
Circuit breaker for repeated failures
Alert on timeout rate and queue growth
Failure 2: Redis becomes unavailable
Impact

Caching and distributed rate limiting may be affected.

Mitigation
Use connection timeouts
Monitor Redis connectivity
Fail safely
Avoid exposing Redis credentials
Use managed Redis availability features in production
Allow limited degraded operation where appropriate

The current application already supports continuing with an in-memory cache fallback when Redis is unavailable. For a larger production system, I would make the degraded-mode limits explicit and monitor them carefully.

Failure 3: Traffic exceeds capacity
Impact

API latency increases and the queue may grow.

Mitigation
Rate limiting
Queue-based backpressure
Horizontal API scaling
Independent worker scaling
Queue-depth alerts
Load testing before increasing limits
Observability Plan
API latency

Track:

p50
p95
p99

The customer-facing SLA should primarily be evaluated using p95 latency.

Request rate

Track requests per minute and identify traffic spikes.

Cache hit ratio

A low cache hit ratio may indicate:

Poor URL normalization
TTL too short
Unexpected traffic patterns
Queue depth

A continuously increasing queue indicates that work is arriving faster than workers can process it.

Audit timeout rate

A sudden increase may indicate:

External website problems
Network problems
Worker saturation
Error rate

Track:

Invalid requests
Rate-limit responses
External HTTP failures
Internal server errors
Structured logs

Each request should include:

requestId
method
route
statusCode
durationMs
cacheHit
targetUrl
errorCode

Sensitive credentials and secrets must never be logged.

Alert Thresholds

These are initial thresholds and should be tuned after production baseline data is available.

Signal	Initial threshold	Action
API p95 latency	> 2 seconds for 10 minutes	Investigate
API 5xx rate	> 2% for 5 minutes	Escalate
Queue depth	> 1,000 jobs	Investigate or scale workers
Audit timeout rate	> 10% for 10 minutes	Investigate external dependency
Redis connection failures	Sustained failure	Investigate degraded mode
Deployment and Rollback Plan
Deployment
Run the test suite.
Run the TypeScript build.
Deploy the new version.
Verify the health endpoint.
Run a production smoke test.
Monitor errors and latency.
Rollback triggers

Rollback if the deployment causes:

Increased 5xx errors
Unacceptable latency
Worker failures
Cache corruption
Unexpected resource usage
Rollback process
Stop the rollout.
Revert to the last known-good version.
Verify the health endpoint.
Run a production smoke test.
Inspect logs and metrics.
Identify the root cause.
Fix and test before attempting another deployment.

Rollback should be performed by deploying a known-good version rather than editing production code directly.

Scaling Roadmap
Current stage

The current implementation provides:

Express API
Input validation
Request timeouts
Concurrency limiting
Redis caching with fallback
Rate limiting
Request IDs
Structured errors
Automated tests
CI
Next stage

Introduce:

Redis-backed audit queue
Dedicated audit workers
Job status endpoint
Queue monitoring
More detailed metrics
Larger scale

Introduce:

Horizontally scaled API instances
Independently scaled workers
Managed Redis
Centralized observability
Autoscaling based on queue depth and latency

This approach avoids prematurely adding unnecessary infrastructure while providing a clear path from the current implementation to a system capable of handling burst traffic.

Final Design Principle

The main scaling risk is not the API itself. It is the dependency on external websites.

Therefore, the architecture separates:

Request acceptance
Cache lookup
Work scheduling
External auditing
Result storage

This separation allows the API to remain responsive even when external websites are slow or unavailable.


AI usage disclosure: I used AI as a development and review assistant to help clarify architectural trade-offs, identify edge cases, improve test coverage, and structure the scaling documentation. I reviewed, adapted, and tested the resulting implementation myself, including validating the API behavior, error handling, caching, rate limiting, and test suite.