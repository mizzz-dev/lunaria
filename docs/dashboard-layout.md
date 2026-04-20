# Dashboard Layout System (MVP)

## Scope
- Target page: Dashboard Top (`/dashboard/[guildId]`).
- Model: slot swap (Swapy-like UX) with HTML5 drag and drop.

## Widget registry
Current widgets:
- `members`
- `plugins`
- `rules`
- `audit`

Visibility is controlled by server-side RBAC filtering (`/dashboard/widgets`).

## API
- `GET /api/v1/guilds/:guildId/dashboard/layout`
- `PUT /api/v1/guilds/:guildId/dashboard/layout`
- `POST /api/v1/guilds/:guildId/dashboard/layout/reset`
- `GET /api/v1/guilds/:guildId/dashboard/widgets`

## Audit / config-version
- Layout update/reset creates audit log entries.
- Layout update stores config version scope `dashboard_layout`.

## Persistence
- Stored per guild in `Guild.dashboardLayout` JSON.
- Payload shape:
```json
{
  "order": ["members", "plugins", "rules", "audit"],
  "hidden": [],
  "updatedAt": "2026-04-20T00:00:00.000Z"
}
```
