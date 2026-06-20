# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js replacement/replication of [Nightscout](https://nightscout.github.io/) — an open-source CGM (Continuous Glucose Monitor) remote monitoring system for diabetes management. This app receives, stores, and visualizes glucose readings and diabetes treatment data.

## Tech Stack

- **Framework**: Next.js (latest, App Router) with TypeScript
- **Auth**: Auth.js v5 (next-auth@5)
- **Database**: MongoDB (primary), with an adapter layer to support PostgreSQL later
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: (for glucose graphs — pick recharts or similar when scaffolding)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Architecture

### Directory Structure

```
app/
  (auth)/            # Auth.js route group — login, register
  (dashboard)/       # Protected app routes — main UI
  api/
    auth/[...nextauth]/  # Auth.js handler
    v3/              # Nightscout-compatible REST API (entries, treatments, devicestatus, profile)
  layout.tsx
  page.tsx
components/
  ui/                # shadcn/ui generated components (do not hand-edit)
  charts/            # Glucose graph components
  dashboard/         # Dashboard-specific widgets
lib/
  db/
    index.ts         # Exports the active adapter (resolves to mongo or postgres)
    adapters/
      mongo.ts       # MongoDB implementation
      postgres.ts    # PostgreSQL implementation (stub for later)
    models/          # Shared TypeScript types — source of truth for data shapes
  auth.ts            # Auth.js config (providers, callbacks, session shape)
  nightscout/        # Business logic: unit conversion, alarm evaluation, carb/insulin math
    serverConfig.ts  # Central env var parser — getServerConfig() (server-side only)
    connect/         # CGM data pollers: librelinkup.ts, dexcomshare.ts
    ifttt.ts         # IFTTT Maker webhook helpers
app/api/cron/
  connect/route.ts   # Polls CONNECT_SOURCE, inserts new entries (requires API_SECRET)
  alerts/route.ts    # Evaluates device age / pump / loop alerts (requires API_SECRET)
types/               # Global TS types, Nightscout protocol types
```

### Database Abstraction

All DB access goes through `lib/db/index.ts`, which exports a single adapter instance. The adapter is selected at startup via `DB_ADAPTER=mongo|postgres` in env. Both adapters implement the same `NightscoutDB` interface defined in `lib/db/models/`. Never import from `adapters/mongo.ts` or `adapters/postgres.ts` directly — always go through `lib/db/index.ts`.

### Nightscout Data Model

Core collections/tables (match Nightscout v3 schema):

| Resource | Description |
|---|---|
| `entries` | CGM readings: `sgv` (sensor glucose), `mbg` (manual BG), `cal` (calibration). Key fields: `date` (ms epoch), `sgv` (mg/dL), `direction`, `device` |
| `treatments` | Insulin doses, carbs, notes, temp basals, site changes. Key field: `eventType` |
| `devicestatus` | Pump/CGM telemetry — battery, reservoir, loop status |
| `profiles` | Basal schedules, ISF, carb ratios, BG targets, timezone. `store` dict supports multiple named profiles; `defaultProfile` names the active one |
| `activity` | Optional fitness data |
| `ui_settings` | Single-document collection storing UI preferences server-side (singleton `_id: "default"`) |

Always store `sgv`/glucose values in **mg/dL** internally; convert to mmol/L in the UI layer only.

### Auth.js v5

Config lives in `lib/auth.ts`. The session is extended to include user role (`admin` | `readable`). Route protection is handled in `proxy.ts` (Next.js 16 replaced `middleware.ts` with `proxy.ts` — the file convention and export name changed but the API is identical). Public routes: `/login`, `/api/v3/**` (API secret header auth for uploader devices).

> **Next.js 16 note**: Use `proxy.ts` not `middleware.ts`. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code — this version has breaking changes from prior training data.

### Nightscout API Compatibility

`app/api/v3/` implements the Nightscout REST API v3 so existing uploaders (xDrip+, Loop, Spike) can POST data without changes. Auth for these endpoints uses the `API_SECRET` env var (hashed token in `Authorization` header), not Auth.js sessions.

## Environment Variables

All env var parsing is centralised in `lib/nightscout/serverConfig.ts` (`getServerConfig()`). Server-side defaults are merged into the settings GET response so the UI reflects env config automatically.

### Core (required)
```
MONGODB_URI=
POSTGRESQL_URI=            # required when DB_ADAPTER=postgres
DB_ADAPTER=mongo           # or postgres
API_SECRET=                # Nightscout uploader secret (min 12 chars)
AUTH_SECRET=               # Auth.js secret
AUTH_URL=                  # e.g. http://localhost:3000
```

### Display
```
DISPLAY_UNITS=mg/dl        # or mmol
CUSTOM_TITLE=Nightscout
TIME_FORMAT=24             # or 12
NIGHT_MODE=false           # on/true to force dark mode
LANGUAGE=en
```

### BG Thresholds
```
BG_HIGH=260                # urgent high threshold (mg/dL)
BG_TARGET_TOP=180          # in-range upper bound
BG_TARGET_BOTTOM=70        # in-range lower bound
BG_LOW=55                  # urgent low threshold
```

### Alarms
```
ALARM_TYPES=simple         # or predict
ALARM_URGENT_HIGH=true
ALARM_HIGH=true
ALARM_LOW=true
ALARM_URGENT_LOW=true
ALARM_TIMEAGO_WARN=true
ALARM_TIMEAGO_WARN_MINS=15
ALARM_TIMEAGO_URGENT=true
ALARM_TIMEAGO_URGENT_MINS=30
```

### Plugins
```
ENABLE=                    # space-separated plugin names to enable
DISABLE=                   # space-separated plugin names to disable
```

### Auth
```
AUTH_DEFAULT_ROLES=readable  # readable = public dashboard (no login required); denied = block all unauthenticated
```

### Device Age Alerts (cron: GET /api/cron/alerts?token=<hash>)
```
CAGE_ENABLE_ALERTS=false   CAGE_INFO=44   CAGE_WARN=48   CAGE_URGENT=72
SAGE_ENABLE_ALERTS=false   SAGE_INFO=144  SAGE_WARN=164  SAGE_URGENT=166
IAGE_ENABLE_ALERTS=false   IAGE_INFO=44   IAGE_WARN=48   IAGE_URGENT=72
BAGE_ENABLE_ALERTS=false   BAGE_INFO=312  BAGE_WARN=336  BAGE_URGENT=360
UPBAT_ENABLE_ALERTS=false  UPBAT_WARN=30  UPBAT_URGENT=20
```

### Pump / Loop Alerts
```
PUMP_ENABLE_ALERTS=false   PUMP_WARN_ON_SUSPEND=false
PUMP_WARN_RES=10           PUMP_URGENT_RES=5
PUMP_WARN_BATT_P=30        PUMP_URGENT_BATT_P=20
PUMP_WARN_BATT_V=1.35      PUMP_URGENT_BATT_V=1.30
LOOP_ENABLE_ALERTS=false   LOOP_WARN=30   LOOP_URGENT=60
OPENAPS_ENABLE_ALERTS=false OPENAPS_WARN=30 OPENAPS_URGENT=60
```

### Notifications
```
PUSHOVER_APP_TOKEN=        # Pushover app token
PUSHOVER_USER_KEY=         # default user/group key (fallback)
PUSHOVER_ALARM_KEY=        # key used for BG/device alarms (overrides PUSHOVER_USER_KEY)
PUSHOVER_ANNOUNCEMENT_KEY= # key used for Announcement treatments
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
MAKER_KEY=                 # IFTTT Maker webhook key (space-separated for multiple)
MAKER_ANNOUNCEMENT_KEY=    # IFTTT key for announcements (falls back to MAKER_KEY)
```

### Data Source Connect (cron: GET /api/cron/connect?token=<hash>)
```
CONNECT_SOURCE=            # linkup | dexcomshare
# LibreLink Up
CONNECT_LINK_UP_USERNAME=
CONNECT_LINK_UP_PASSWORD=
CONNECT_LINK_UP_REGION=EU  # US EU DE FR JP AP AU AE
CONNECT_LINK_UP_PATIENT_ID= # optional; auto-resolved from first connection
# Dexcom Share
CONNECT_SHARE_ACCOUNT_NAME=
CONNECT_SHARE_PASSWORD=
CONNECT_SHARE_REGION=us    # us | ous
```

### Caching
```
REDIS_URL=                 # optional (e.g. redis://localhost:6379)
SHARE_TOKEN=               # enables /follow/<token> public read-only view
```

### Redis Cache

When `REDIS_URL` is set, all DB reads are served from Redis with short TTLs (55s for glucose data, 5min for profiles). Writes automatically invalidate the relevant collection's keys using `SCAN`-based pattern deletion. The layer is transparent — if Redis is unreachable, all calls fall through to the DB adapter silently. See `lib/db/cached.ts` and `lib/cache/redis.ts`.

## Key Conventions

- All API route handlers live under `app/api/` and are typed with `NextRequest` / `NextResponse`.
- Server Components fetch data directly via the DB adapter; Client Components use SWR or fetch against `/api/v3/`.
- shadcn/ui components are added with `npx shadcn@latest add <component>` — never scaffold them by hand.
- Glucose direction arrows use Nightscout's `direction` string enum: `DoubleUp`, `SingleUp`, `FortyFiveUp`, `Flat`, `FortyFiveDown`, `SingleDown`, `DoubleDown`, `NONE`.
