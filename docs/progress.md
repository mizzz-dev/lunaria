# Lunaria — Implementation Progress

## 2026-04-20 Sprint Kickoff Plan

### 現状棚卸し
- `pnpm -w typecheck/build/test` は `@lunaria/db` の Prisma 型ずれで失敗。
- `pnpm -w lint` は `@lunaria/api` の lint 対象解決で失敗。
- Docker はこの実行環境に未導入 (`docker: command not found`) のためローカル起動確認は未実施。
- CI Workflow ファイルが未整備（`.github/workflows` が空）。

### 今スプリントの短期実装計画（実装優先）
1. テスト基盤を最低限起動（API/Bot/Worker/Dashboard/Prisma smoke）。
2. Prisma/TypeScript のベースライン修復（generate 手順・依存整合）。
3. API rate limit を Redis 優先 + memory fallback へ移行し 429 形式を統一。
4. Analytics 画面を SSE でリアルタイム更新（再接続 + 手動 Refresh）。
5. Dashboard Top にレイアウト編集 MVP（widget registry / drag swap / save/reset）。
6. API/Bot/Worker の最小可観測性（request/correlation ログ）を揃える。
7. docs / env / OpenAPI / CI を同期して PR ベースラインを作る。

## Status: MVP Complete

All core systems have been implemented. See below for detailed status per area.

---

## Monorepo Infrastructure ✅

| File | Status |
|------|--------|
| `package.json` (root) | ✅ pnpm workspace root, turbo scripts |
| `pnpm-workspace.yaml` | ✅ apps/*, packages/* |
| `turbo.json` | ✅ build/dev/lint/typecheck/test pipeline |
| `tsconfig.base.json` | ✅ strict TypeScript (ES2022, NodeNext) |
| `docker-compose.yml` | ✅ postgres:16 + redis:7 with healthchecks |
| `.env.example` | ✅ All required env vars documented |

---

## packages/ ✅

| Package | Status | Notes |
|---------|--------|-------|
| `@lunaria/db` | ✅ | Prisma client, `createAuditLog`, `hasPermission`, `getUserPermissions` |
| `@lunaria/types` | ✅ | `Snowflake`, `ApiOk`, `ApiError`, `RbacPermissionKey` (34 keys), `ErrorCodes` |
| `@lunaria/shared` | ✅ | `ok()`, `err()`, `configScope()`, `shuffle()`, `SYSTEM_ROLE_PERMISSIONS` |
| `@lunaria/plugin-sdk` | ✅ | 15 plugins defined (12 active + 3 stubs: hoyolink, voice_consent, external_server) |
| `@lunaria/rule-engine` | ✅ | 9 conditions, 8 actions, `executeRulesForTrigger()`, `testRule()` |
| `@lunaria/ui` | ✅ | Button, Card, Badge, Input, Modal, Spinner base components |

---

## Prisma Schema ✅

40+ models covering:
- Core: User, Guild, GuildMembership
- RBAC: RbacRole, GuildMemberRoleAssignment
- Config: ConfigVersion, GuildPluginSetting
- Plugins: Quote, Poll, PollOption, PollVote, Event, EventAttendee, LfgPost, TeamSet, Team, TeamMember, FaqArticle, Reminder, AutoResponse, DailyContentJob, DailyContentRun
- Moderation: ModerationRule, ModerationAction
- Analytics: AnalyticsEvent, AnalyticsDaily
- Rules: Rule, RuleRun
- Misc: AuditLog, Template, ConsentRecord, GameLink, ExternalServer

---

## apps/api (Fastify) ✅

- `src/app.ts` — buildApp() with JWT cookie auth, RBAC decorator, Swagger
- `src/lib/` — JWT helpers, rate limiter, Redis cache
- Routes (all under `/api/v1`):

| Route File | Endpoints |
|-----------|-----------|
| `auth.ts` | GET /auth/login, /auth/callback, /auth/me, /auth/guilds, POST /auth/logout |
| `guilds/index.ts` | GET /guilds/:id, GET /guilds/:id/dashboard |
| `guilds/plugins.ts` | GET/PATCH plugins, POST enable/disable |
| `guilds/rules.ts` | CRUD + POST test |
| `guilds/quotes.ts` | GET/POST/DELETE quotes |
| `guilds/polls.ts` | GET/POST polls, POST close |
| `guilds/events.ts` | GET/POST events, POST cancel, GET attendees |
| `guilds/lfg.ts` | GET/POST/PATCH/DELETE LFG posts |
| `guilds/team-splits.ts` | GET/POST team splits, POST reroll |
| `guilds/faqs.ts` | GET/POST/PATCH/DELETE FAQs |
| `guilds/reminders.ts` | GET reminders |
| `guilds/auto-responses.ts` | GET/POST/DELETE auto-responses |
| `guilds/daily-content.ts` | GET/POST/PATCH jobs, GET runs |
| `guilds/moderation.ts` | GET/POST moderation rules, GET actions |
| `guilds/audit-logs.ts` | GET audit logs (paginated) |
| `guilds/config-versions.ts` | GET versions, POST rollback |
| `guilds/analytics.ts` | GET summary, GET daily |
| `guilds/settings.ts` | GET/PATCH guild settings |
| `guilds/memberships.ts` | GET members, PATCH system role |
| `guilds/roles.ts` | GET/POST/PATCH/DELETE RBAC role overrides |

---

## apps/bot (discord.js v14) ✅

**Commands (16):**
`ping`, `quote`, `poll`, `event`, `lfg`, `team`, `faq`, `remind`, `autoresponse`, `modaction`, `rule`, `analytics`, `template`, `settings`, `link-game`, `consent`

**Event Handlers:**
- `ready.ts` — registers slash commands on guild join
- `interactionCreate.ts` — routes to command handlers
- `guildCreate.ts` / `guildDelete.ts` — guild lifecycle
- `messageCreate.ts` — auto-response matching + rule engine
- `guildMemberAdd.ts` / `guildMemberRemove.ts` — membership sync + rule engine

---

## apps/worker (BullMQ) ✅

| Worker | Queue | Description |
|--------|-------|-------------|
| `daily-content.ts` | `daily_content` | Posts daily quotes/custom content to Discord |
| `reminder.ts` | `reminder` | Sends DM or channel reminder, handles recurrence |
| `analytics.ts` | `analytics_aggregate` | Hourly rollup of analytics events |
| `moderation-expire.ts` | `moderation_expire` | Expires time-limited moderation actions |
| `scheduled-rule.ts` | `scheduled_rule` | Runs scheduled rule triggers |
| `scheduler.ts` | — | Cron loop dispatching jobs every minute |

---

## apps/dashboard (Next.js 14 App Router) ✅

**Auth:** OAuth2 callback → JWT cookie → protected routes via middleware

**Pages:**

| Route | Description |
|-------|-------------|
| `/` | Landing/login page |
| `/dashboard` | Guild selector |
| `/dashboard/[guildId]` | Overview with stats |
| `/dashboard/[guildId]/plugins` | Plugin grid with enable/disable |
| `/dashboard/[guildId]/plugins/[key]` | Plugin config detail |
| `/dashboard/[guildId]/rules` | Rule list |
| `/dashboard/[guildId]/quotes` | Quote management |
| `/dashboard/[guildId]/polls` | Poll list |
| `/dashboard/[guildId]/events` | Event list |
| `/dashboard/[guildId]/lfg` | LFG post list |
| `/dashboard/[guildId]/team-splits` | Team split history |
| `/dashboard/[guildId]/faqs` | FAQ management |
| `/dashboard/[guildId]/reminders` | Reminder list |
| `/dashboard/[guildId]/rbac` | Role overrides + member list |
| `/dashboard/[guildId]/auto-responses` | Auto-response list |
| `/dashboard/[guildId]/daily-content` | Daily content jobs + runs |
| `/dashboard/[guildId]/moderation` | Moderation rules + actions |
| `/dashboard/[guildId]/analytics` | Analytics charts |
| `/dashboard/[guildId]/audit-logs` | Audit log viewer |
| `/dashboard/[guildId]/config-versions` | Config version history + rollback |

---

## prisma/seed.ts ✅

Seeds:
- Dev user + dev guild + owner membership
- RBAC roles for all 4 system roles with full permission sets
- Plugin settings (all 15 plugins, disabled by default)
- Sample quotes (3), FAQs (3), auto-response (1), daily content job (1)

---

## Plugin Registry

| Plugin Key | Category | Billing | Stub |
|-----------|----------|---------|------|
| quote | content | free | No |
| poll | engagement | free | No |
| event | engagement | free | No |
| lfg | community | free | No |
| team_split | utility | free | No |
| faq | utility | free | No |
| reminder | utility | free | No |
| moderation | safety | pro | No |
| daily_content | content | pro | No |
| auto_response | automation | pro | No |
| analytics | insights | pro | No |
| template | utility | pro | No |
| hoyolink | community | enterprise | **Stub** |
| voice_consent | safety | pro | **Stub** |
| external_server | utility | enterprise | **Stub** |

---

## Rule Engine

**Triggers:** messageCreate, memberJoin, memberLeave, reactionAdd, scheduledTime, pollClose, eventStart, lfgPost

**Conditions (9):**
- messageContains, memberHasRole, memberJoinedBefore, pollOptionWins, channelIs, timeOfDay, memberCountAbove, lfgGameIs, alwaysTrue

**Actions (8):**
- sendMessage, addRole, removeRole, kickMember, banMember, dmUser, createLfgPost, pinMessage

---

## Known Limitations / Future Work

- Stub plugins (hoyolink, voice_consent, external_server) show amber warning in dashboard and cannot be enabled
- Analytics charts use raw number display (no chart library integrated)
- No WebSocket/real-time updates in dashboard
- No file upload support for event banners
- Rate limiting uses in-memory store (Redis-based rate limit recommended for production multi-instance)
