# Page Pulse

Production-oriented URL audit API built with Node.js, Express, TypeScript, Redis, and Vitest.

Page Pulse accepts a URL, fetches the page, and returns a lightweight audit result while applying validation, timeout protection, concurrency control, caching, rate limiting, request IDs, structured errors, and structured logging.

## Features

- URL validation
- HTTP request timeout protection
- Concurrency limiting for outbound audits
- Redis caching for repeated URL audits
- Configurable cache TTL
- Per-client rate limiting
- Request ID on every request
- Structured JSON error responses
- Health check endpoint
- Automated tests with Vitest and Supertest
- GitHub Actions CI for every push and pull request

## Running locally

### Requirements

- Node.js 20+
- Redis

### Install

```bash
npm install
