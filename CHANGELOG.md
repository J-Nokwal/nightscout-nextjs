# Changelog

All notable changes to this project will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

---

## [Unreleased] — Under Active Development

> This project has not yet reached a stable release. The entries below describe what has been built so far. Breaking changes may occur at any time.

### Added

#### Core Infrastructure
- Next.js 16 App Router project with TypeScript and Tailwind CSS v4
- MongoDB adapter (`lib/db/adapters/mongo.ts`) with full CRUD for all Nightscout collections
- PostgreSQL adapter stub (`lib/db/adapters/postgres.ts`) — interface defined, not yet functional
- Database abstraction layer (`lib/db/index.ts`) — swap adapters via `DB_ADAPTER` env var
- Optional Redis cache layer (`lib/db/cached.ts`) with 55s TTL for glucose data, 5m for profiles
- Auth.js v5 with credentials provider and role-based access (`admin` | `readable`)
- `proxy.ts` — Next.js 16 route protection (replaces `middleware.ts`)
- `AUTH_DEFAULT_ROLES=readable` — fully public dashboard without login
- Central env var parser (`lib/nightscout/serverConfig.ts`) covering 60+ Nightscout variables
- Server-Sent Events stream (`/api/sse`) for real-time dashboard updates

#### API
- Nightscout v3 REST API — full CRUD + history endpoints for entries, treatments, devicestatus, profiles, activity
- Nightscout v1 legacy API — entries, treatments, devicestatus, status.json
- `/pebble` endpoint for Pebble watches, xDrip+, and Garmin
- CORS enabled on all API routes
- `API_SECRET` header and query param auth for uploaders
- MongoDB duplicate key fix — strips client `_id` before insert to prevent E11000 errors on re-uploads

#### Dashboard
- Real-time glucose graph with 3h/6h/12h/24h time windows
- BG value display with direction arrow, delta, and time-ago
- IOB (Insulin on Board) and COB (Carbs on Board) calculations
- Time-in-Range (TIR) widget
- Device / pump / loop status widget
- Scheduled basal rate display
- Alarm system with snooze (persisted to `sessionStorage`)
- Dark / light / system theme via `ThemeProvider`

#### Reports
- AGP (Ambulatory Glucose Profile) graph
- Hourly stats heatmap
- BG distribution chart
- Time-in-Range breakdown table
- Printable report view

#### History
- Calendar-based day browser
- Daily BG graph per selected day

#### CarePortal / Treatments
- Log insulin, carbs, corrections, temp basals, site changes, announcements, notes
- mmol/L input support with automatic mg/dL storage conversion
- Announcement treatments trigger push notifications

#### Settings
- Display units (mg/dL / mmol/L), time format, dark mode toggle
- BG alarm thresholds with live preview
- Custom site title

#### CGM Connect
- LibreLink Up poller (`lib/nightscout/connect/librelinkup.ts`) — all regions
- Dexcom Share poller (`lib/nightscout/connect/dexcomshare.ts`) — US and international
- Cron endpoint (`/api/cron/connect`) — polls source and inserts new entries

#### Notifications
- Pushover — BG alarms and announcements with separate routing keys (`PUSHOVER_ALARM_KEY`, `PUSHOVER_ANNOUNCEMENT_KEY`)
- Telegram — BG alarm notifications
- IFTTT Maker — `ns_alarm` and `ns_announcement` webhook events

#### Alerts
- CAGE / SAGE / IAGE / BAGE device age alerts
- Pump reservoir and battery alerts (percentage and voltage)
- Loop / OpenAPS last-loop-age alerts
- Cron endpoint (`/api/cron/alerts`)

#### Clock Views
- BG Clock — full-screen glucose display
- Color Clock — background changes with BG zone
- Custom Clock — builder with configurable layout

#### Public Follow View
- `/follow/<token>` — read-only public view, no login required

#### UI / UX
- Nightscout logo SVG (browser tab icon + login/register pages)
- 404 Not Found page
- Global error boundary page
- Medical Disclaimer page (`/disclaimer`)
- Footer disclaimer link on dashboard and login
- Dark mode chart axis colors fixed (Recharts `axisLine={false}`)
- Removed all Create Next App boilerplate

---

## About Version Numbering

This project will follow [Semantic Versioning](https://semver.org/) once it reaches a stable `1.0.0` release. Until then, any `0.x.y` release may contain breaking changes.
