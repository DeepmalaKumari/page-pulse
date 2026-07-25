# Page Pulse

A production-oriented URL audit service built for the Digital Heroes Software Development qualification task.

Page Pulse accepts a URL, performs a controlled HTTP audit, and returns reachability, HTTP status, response time, and cache information.

The implementation focuses on resilience when external websites are slow, unavailable, or unreliable.

---

# Task A — Production-Grade Page Pulse

## Features

- URL input validation
- HTTP request timeout protection
- Controlled outbound concurrency
- Redis-backed caching
- Configurable cache TTL
- In-memory cache fallback when Redis is unavailable
- Per-client rate limiting
- Request IDs for request tracing
- Structured JSON error responses
- Structured logging
- Automated API tests
- GitHub Actions CI
- Production-oriented project structure
- Architecture designed for queue-based scaling

---

# Technology Stack

- Node.js
- TypeScript
- Express
- Axios
- Redis
- Zod
- Vitest
- Supertest
- GitHub Actions

---

# API Contract

## Health Check

### Request

```http
GET /health
Response
{
  "status": "ok",
  "service": "page-pulse"
}
Audit a URL
Request
POST /api/v1/page-pulse
Content-Type: application/json
Body
{
  "url": "https://example.com"
}
Successful Response
{
  "data": {
    "url": "https://example.com",
    "status": 200,
    "reachable": true,
    "responseTimeMs": 123,
    "cached": false
  }
}
URL Validation

Requests are validated before any outbound network request is made.

Invalid input is rejected with:

400 Bad Request

Example:

{
  "url": "not-a-url"
}

Response:

{
  "error": {
    "code": "INVALID_URL",
    "message": "A valid URL is required"
  }
}

This prevents malformed input from reaching the audit service.

HTTP Audit Behaviour

The service performs an outbound HTTP request to the requested URL.

The result records:

Requested URL
HTTP status code
Reachability
Response time
Cache status

The service distinguishes between:

Successful HTTP responses
Non-2xx HTTP responses
Request timeouts
Connection failures
DNS failures
Other external HTTP failures

A reachable page returning 404, 500, or another HTTP status is still an HTTP response and is handled separately from a network failure.

This distinction is important because:

HTTP 404 ≠ Network failure
HTTP 500 ≠ Timeout
Timeout ≠ DNS failure
Timeout Protection

External websites are outside the control of Page Pulse.

Every outbound request has a strict timeout.

This prevents an external server from holding an application resource indefinitely.

Without a timeout:

Client Request
      |
      v
Page Pulse
      |
      v
Slow External Website
      |
      X
  Hangs indefinitely

With timeout protection:

Page Pulse
      |
      v
External Website
      |
      X
Timeout
      |
      v
Structured Failure

Timeouts prevent slow dependencies from consuming unlimited resources.

Concurrency Control

The service limits the number of simultaneous outbound audits.

This protects the application from traffic bursts.

For example:

500 incoming requests
        |
        v
Concurrency limit
        |
        v
Only controlled number of external requests

This prevents the application from immediately creating hundreds of uncontrolled outbound network requests.

At larger scale, concurrency limits should be applied at the worker level.

Caching

Repeated audits of the same URL are cached for a configurable period.

Example cache key:

page-pulse:audit:<normalized-url>

Example:

page-pulse:audit:https://example.com

A cache hit avoids another outbound request.

Cache flow
Request
   |
   v
Normalize URL
   |
   v
Check cache
   |
   +---- Cache hit ----> Return cached result
   |
   +---- Cache miss ---> Perform audit
                              |
                              v
                         Store result
                              |
                              v
                         Return result

The cache TTL is configurable.

A shorter TTL provides fresher data.

A longer TTL reduces external network usage.

The correct value depends on the freshness requirement of the product.

Redis and Fallback Behaviour

Redis is preferred for shared production state.

Redis can store:

Cached audit results
Rate-limit counters
Short-lived job state
Distributed locks
Queue state in the scaled architecture

If Redis is unavailable, the current service continues with an in-memory cache fallback.

This provides limited degraded-mode operation.

However, an in-memory fallback has important limitations:

It is not shared between instances.
It is lost when the process restarts.
It cannot provide reliable distributed rate limiting.
It cannot coordinate multiple workers.

Therefore:

Development / single instance
        |
        v
In-memory fallback is acceptable

Production / multiple instances
        |
        v
Shared Redis is required
Rate Limiting

The API applies per-client rate limiting.

The purpose is to:

Prevent abuse
Protect external dependencies
Protect application resources
Control sudden traffic spikes

When the limit is exceeded:

429 Too Many Requests

Response:

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}

The current implementation uses process-level rate-limit state.

For horizontally scaled production deployments, rate-limit state should be moved to Redis or another shared store.

Request IDs

Every request receives a request ID.

Request IDs make it possible to trace a request across:

Client
  |
  v
API
  |
  v
Controller
  |
  v
Service
  |
  v
External HTTP Request

A request ID should be included in logs and error responses where appropriate.

This makes debugging and incident investigation easier.

Structured Logging

Important log fields include:

requestId
HTTP method
route
statusCode
durationMs
cacheHit
targetUrl
errorCode

Example conceptual log:

{
  "requestId": "abc-123",
  "method": "POST",
  "route": "/api/v1/page-pulse",
  "statusCode": 200,
  "durationMs": 142,
  "cacheHit": false
}

Secrets, credentials, tokens, and sensitive data must never be logged.

Error Handling

The service returns consistent structured errors.

Invalid Input
400 Bad Request
{
  "error": {
    "code": "INVALID_URL",
    "message": "A valid URL is required"
  }
}
Rate Limit
429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
Internal Failure
500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Something went wrong"
  }
}

The API does not expose internal stack traces or implementation details to clients.

HTTP Status Handling

The service treats HTTP responses and network failures differently.

Examples:

Situation	Meaning
200	Page reachable
301/302	Redirect response
404	Server reachable but resource not found
500	Server reachable but returned an error
Timeout	Server did not respond within the limit
DNS failure	Domain could not be resolved
Connection failure	Connection could not be established

This distinction provides more useful audit results than treating every non-200 result as the same failure.

Testing

The automated test suite covers:

Health endpoint
Valid URL audit
Invalid URL validation
Missing URL input
Malformed URL input
Successful reachable URL
Non-existent page / 404 response
External HTTP failure
Structured internal error handling
API response shape
Request handling

The test suite uses:

Vitest
Supertest

Run:

npm test

Expected result:

6 passed

The tests are designed to validate behaviour rather than implementation details.

CI

GitHub Actions runs automatically on pushes and pull requests.

The CI pipeline:

Checks out the repository.
Installs dependencies.
Runs the test suite.
Builds the TypeScript project.

The purpose is to catch regressions before changes are merged.

Local Setup
Requirements
Node.js 20+
npm
Redis is optional for local development

Install dependencies:

npm install

Run development mode:

npm run dev

Build:

npm run build

Run production build:

npm start

Run tests:

npm test
Environment Variables

Example:

PORT=3000
CACHE_TTL_SECONDS=300
AUDIT_TIMEOUT_MS=10000
MAX_CONCURRENT_AUDITS=10
REDIS_URL=redis://localhost:6379

Environment variables should be used for operational configuration instead of hardcoding production values.

Project Structure
src/
├── app.ts
├── index.ts
│
├── controllers/
│   └── pagePulseController.ts
│
├── middleware/
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   └── requestId.ts
│
├── routes/
│   └── pagePulse.ts
│
├── services/
│   └── pagePulseService.ts
│
├── types/
│
└── utils/
    ├── cache.ts
    ├── logger.ts
    └── redis.ts

tests/
└── pagePulse.test.ts

The application separates:

Routes
   |
   v
Controllers
   |
   v
Services
   |
   v
Infrastructure Utilities

This keeps HTTP handling separate from business logic.

Task B — Architecture for Scale
Target Workload

The target system must support:

10,000 audits per day
Bursts of up to 500 concurrent requests
Customer-facing response-time expectations
Slow or unavailable external websites

The primary scaling risk is not the API itself.

The primary risk is the external websites being audited.

Therefore, the architecture separates:

Request Acceptance
        |
        v
Cache Lookup
        |
        v
Work Scheduling
        |
        v
External Auditing
        |
        v
Result Storage
Scalable Architecture
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
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌──────────────┐         ┌──────────────┐
             │    Redis     │         │  Audit Queue │
             │              │         │              │
             │ Cache        │         │ Backpressure │
             │ Rate limits  │         │              │
             │ Job state    │         │              │
             └──────────────┘         └──────┬───────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Audit Workers  │
                                    │                 │
                                    │ Concurrency     │
                                    │ limits          │
                                    │ Timeouts        │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ External URLs   │
                                    └─────────────────┘
Data Flow
A client sends an audit request.
The API validates the URL.
A request ID is assigned.
The rate limiter checks the client.
The URL is normalized.
Redis is checked for a fresh cached result.
A cache hit is returned immediately.
A cache miss is submitted for processing.
A worker performs the external HTTP request.
The worker applies strict timeout and concurrency limits.
The result is stored with a configurable TTL.
The result is returned to the client or made available through job status.
Queueing Strategy

The API should not create unlimited outbound requests.

A queue provides backpressure between incoming traffic and external auditing.

Incoming Traffic
       |
       v
      API
       |
       v
     Queue
       |
       v
 Controlled Workers
       |
       v
External Websites

Workers should have controlled concurrency.

For example:

500 incoming requests
        |
        v
Queue
        |
        v
10 controlled workers

The exact worker count should be tuned based on:

CPU
Memory
Network capacity
External dependency behaviour
SLA requirements
Asynchronous Response Model

If a request cannot complete within the customer-facing SLA, the system can return:

202 Accepted

Example:

{
  "data": {
    "status": "pending",
    "requestId": "request-id"
  }
}

The client can then retrieve the result using a job-status endpoint.

This is preferable to keeping a connection open indefinitely while waiting for an unreliable external website.

Technology Decision Record
Redis
Decision

Use Redis for caching and distributed short-lived state.

Why
Fast read/write operations
Shared across application instances
Suitable for caching
Suitable for rate limiting
Can support queue-based workers
Alternative Rejected

In-memory Map.

Why Rejected

An in-memory Map:

Is not shared between application instances.
Loses data when the process restarts.
Cannot provide reliable distributed rate limiting.
Cannot coordinate multiple workers.
Queue
Decision

Use a Redis-backed queue such as BullMQ when asynchronous processing is introduced.

Why
Supports retries
Supports delayed jobs
Supports worker concurrency
Provides queue metrics
Reuses existing Redis infrastructure
Alternative Rejected

RabbitMQ.

Why Rejected

RabbitMQ is an excellent messaging system.

However, adding another infrastructure dependency increases operational complexity when Redis is already required for caching and rate limiting.

RabbitMQ would become more attractive if the system evolved into a larger event-driven platform with many independent message consumers.

HTTP Client
Decision

Use a controlled HTTP client with explicit resource limits.

Important controls:

Connection timeout
Response timeout
Redirect limits
Error classification
Response-size limits where appropriate
Alternative Rejected

Unbounded HTTP requests.

Why Rejected

An external website can hang indefinitely and consume application resources.

Caching
Decision

Cache successful and classified audit results with a configurable TTL.

Why

Repeated audits of the same URL should not repeatedly consume network capacity.

The cache window should be configurable because customers may have different freshness requirements.

Failure Mode Analysis
Failure 1 — External Websites Become Slow
Impact
Workers remain occupied longer.
Queue depth increases.
API latency may increase.
Timeouts may increase.
Mitigation
Strict outbound timeout
Worker concurrency limits
Queue backpressure
Retry only appropriate transient failures
Circuit breaker for repeated failures
Monitor timeout rate
Alert on queue growth
Failure 2 — Redis Becomes Unavailable
Impact
Caching is affected.
Distributed rate limiting may be affected.
Shared state may become unavailable.
Mitigation
Redis connection timeout
Connectivity monitoring
Safe degraded operation
Limited in-memory fallback
Managed Redis availability features in production
Explicit degraded-mode limits

The current application already supports continuing with an in-memory cache fallback when Redis is unavailable.

For a larger production system, degraded-mode behaviour should be explicitly limited and monitored.

Failure 3 — Traffic Exceeds Capacity
Impact
API latency increases.
Queue depth grows.
Workers become saturated.
Mitigation
Rate limiting
Queue backpressure
Horizontal API scaling
Independent worker scaling
Queue-depth alerts
Load testing before increasing limits
Observability Plan
API Latency

Track:

p50
p95
p99

The customer-facing SLA should primarily be evaluated using p95 latency.

Request Rate

Track requests per minute.

This helps identify:

Traffic spikes
Abuse
Unexpected traffic patterns
Cache Hit Ratio

A low cache hit ratio may indicate:

Poor URL normalization
TTL too short
Unexpected traffic patterns
Low repeat-audit demand
Queue Depth

A continuously increasing queue indicates that work is arriving faster than workers can process it.

Audit Timeout Rate

A sudden increase may indicate:

External website problems
Network problems
Worker saturation
Error Rate

Track:

Invalid requests
Rate-limit responses
External HTTP failures
Internal server errors
Structured Logs

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

Initial Alert Thresholds

These are starting thresholds and should be tuned using production baseline data.

Signal	Initial Threshold	Action
API p95 latency	> 2 seconds for 10 minutes	Investigate
API 5xx rate	> 2% for 5 minutes	Escalate
Queue depth	> 1,000 jobs	Investigate or scale workers
Audit timeout rate	> 10% for 10 minutes	Investigate external dependency
Redis connection failures	Sustained failure	Investigate degraded mode
Deployment Plan
Run automated tests.
Run TypeScript build.
Deploy the new version.
Verify the health endpoint.
Run a production smoke test.
Monitor errors and latency.

Example validation:

GET /health

Expected:

{
  "status": "ok",
  "service": "page-pulse"
}
Rollback Plan

Rollback if the deployment causes:

Increased 5xx errors
Unacceptable latency
Worker failures
Cache corruption
Unexpected resource usage

Rollback process:

Stop the rollout.
Revert to the last known-good version.
Verify the health endpoint.
Run a production smoke test.
Inspect logs and metrics.
Identify the root cause.
Fix and test before attempting another deployment.

Rollback should be performed by deploying a known-good version rather than editing production code directly.

Scaling Roadmap
Current Stage

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
Next Stage

Introduce:

Redis-backed audit queue
Dedicated audit workers
Job status endpoint
Queue monitoring
Detailed metrics
Larger Scale

Introduce:

Horizontally scaled API instances
Independently scaled workers
Managed Redis
Centralized observability
Autoscaling based on queue depth and latency

This avoids prematurely adding unnecessary infrastructure while providing a clear path to handling burst traffic.

Design Principle

The main scaling risk is not the API itself.

It is the dependency on external websites.

Therefore, the architecture separates:

Request Acceptance
        |
        v
Cache Lookup
        |
        v
Work Scheduling
        |
        v
External Auditing
        |
        v
Result Storage

This allows the API to remain responsive even when external websites are slow or unavailable.

AI Usage Disclosure

AI tools were used as a development and review assistant to help clarify architectural trade-offs, identify edge cases, improve test coverage, and structure the scaling documentation.

I reviewed, adapted, and tested the resulting implementation myself, including validating the API behaviour, error handling, caching, rate limiting, and automated test suite.