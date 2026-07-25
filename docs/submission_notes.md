Digital Heroes — Software Development Qualification Task

Candidate: Deepmala Kumari

Project: Page Pulse

Task A:
Production-grade URL audit API with validation, timeout protection, concurrency limiting, caching, rate limiting, request IDs, structured errors, automated tests, and CI.

Task B:
Architecture designed for 10,000 audits/day and bursts of 500 concurrent requests using Redis, queue-based backpressure, controlled workers, caching, monitoring, failure mitigation, and rollback procedures.

GitHub Repository:
https://github.com/DeepmalaKumari/page-pulse

Live Application:
https://page-pulse-vpnk.onrender.com

Health Check:
https://page-pulse-vpnk.onrender.com/health

Live Verification:
GET /health — Working
POST /api/v1/page-pulse — Working

Tests:
6 tests passing

CI:
GitHub Actions configured to run tests and build on pushes and pull requests.

The deployed Page Pulse service was tested successfully and is publicly accessible.

AI Usage:
AI was used as a development and review assistant. I reviewed, adapted, and tested the implementation myself.