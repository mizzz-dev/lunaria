# Operations Runbook (Oracle Always Free single VM)

## 1. Health checks
- API: `GET /healthz` should return `{ ok: true }`.
- Dashboard SSE: verify `/api/v1/guilds/:guildId/analytics/stream` opens and emits `summary` events every 15s.
- Worker/Bot: startup logs are JSON and include `service`, `event`, `correlationId`.

## 2. Rate limit triage
- Headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `X-RateLimit-Backend` (`redis` or `memory`)
- If backend becomes `memory`, Redis is degraded/unreachable. Check Redis service first.

## 3. Correlation guide
- API request tracing: `x-request-id` is generated/propagated.
- Dashboard layout changes emit audit actions:
  - `dashboard.layout.update`
  - `dashboard.layout.reset`
- Use audit logs + request ID to correlate user action and API log line.

## 4. Worker failure first response
- Look for `startup.begin`, `workers.registered`, `startup.ready`.
- Missing env causes `env.missing` JSON error and immediate exit.
- Queue lag/failure should be inspected from worker logs first, then Redis health.
