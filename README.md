# Lunaria

プラグイン方式とルールエンジンを備えた、コミュニティ運営向け高機能 Discord Bot ＋ 管理ダッシュボード

A production-ready Discord community management platform with a plugin system, rule engine, and web dashboard.

---

## Architecture

```
lunaria/
├── apps/
│   ├── api/          # Fastify REST API (port 4000)
│   ├── bot/          # discord.js v14 bot
│   ├── dashboard/    # Next.js 14 App Router dashboard (port 3000)
│   └── worker/       # BullMQ background job workers
└── packages/
    ├── db/           # Prisma client + audit log + RBAC helpers
    ├── types/        # Shared TypeScript types
    ├── shared/       # Utilities, constants, Zod schemas
    ├── plugin-sdk/   # Plugin registry (15 plugins)
    ├── rule-engine/  # Trigger → Condition → Action engine
    └── ui/           # Shared React UI components
```

**Stack:** TypeScript · Fastify · discord.js v14 · Next.js 14 · Prisma · PostgreSQL · Redis · BullMQ · pnpm workspaces · Turbo

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + Redis)

---

## Quick Start

```bash
# 1. Clone and install dependencies
git clone <repo>
cd lunaria
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your Discord credentials and secrets

# 4. Run database migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Start all services in development mode
pnpm dev
```

Services:
- Dashboard: http://localhost:3000
- API: http://localhost:4000
- API Docs (Swagger): http://localhost:4000/docs

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `BOT_INTERNAL_SECRET` | Shared secret for bot→API requests |
| `NEXT_PUBLIC_API_URL` | API base URL for dashboard client |

---

## Database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations (dev)
pnpm db:seed        # Seed dev data
pnpm db:studio      # Open Prisma Studio
```

---

## Plugin System

Plugins are defined in `packages/plugin-sdk/src/index.ts`. Each plugin has:
- `pluginKey` — unique identifier
- `name`, `description`, `category`
- `billingTier` — `free` | `pro` | `enterprise`
- `defaultConfig` — JSON config schema
- `isStub` — if true, cannot be enabled (stub/planned feature)

**Active plugins (12):** quote, poll, event, lfg, team_split, faq, reminder, moderation, daily_content, auto_response, analytics, template

**Stub plugins (3):** hoyolink, voice_consent, external_server

---

## Rule Engine

Rules follow a **Trigger → Conditions → Actions** pattern.

**Triggers:** messageCreate, memberJoin, memberLeave, reactionAdd, scheduledTime, pollClose, eventStart, lfgPost

**Conditions (9):** messageContains, memberHasRole, memberJoinedBefore, pollOptionWins, channelIs, timeOfDay, memberCountAbove, lfgGameIs, alwaysTrue

**Actions (8):** sendMessage, addRole, removeRole, kickMember, banMember, dmUser, createLfgPost, pinMessage

Rules can be tested via `POST /api/v1/guilds/:id/rules/:ruleId/test` (dry run, no actions executed).

---

## RBAC

Four system roles with hierarchical permissions:

| Role | Key Permissions |
|------|----------------|
| `owner` | All 34 permissions |
| `admin` | All except guild.manage, rbac.manage |
| `moderator` | View + moderation.manage |
| `member` | View-only access |

Custom role overrides can be created per guild, mapping Discord roles to permission sets.

---

## API

Base URL: `http://localhost:4000/api/v1`

All responses use the envelope format:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

Authentication: Discord OAuth2 → JWT stored in `HttpOnly` cookie.

See Swagger docs at `/docs` for full API reference.

---

## Dashboard

Built with Next.js 14 App Router, dark theme (zinc palette), server components by default.

All guild management pages are under `/dashboard/[guildId]/`:
plugins, rules, quotes, polls, events, lfg, team-splits, faqs, reminders, rbac, auto-responses, daily-content, moderation, analytics, audit-logs, config-versions

---

## Worker

Background jobs run via BullMQ:
- **daily_content** — Posts scheduled content to Discord channels
- **reminder** — Sends reminders via DM or channel mention
- **analytics_aggregate** — Hourly rollup of analytics events
- **moderation_expire** — Expires time-limited mod actions
- **scheduled_rule** — Runs rules with `scheduledTime` trigger

---

## Development Commands

```bash
pnpm dev              # Start all apps in watch mode
pnpm build            # Build all packages + apps
pnpm lint             # ESLint across all workspaces
pnpm typecheck        # tsc --noEmit across all workspaces
pnpm test             # Run tests
```
