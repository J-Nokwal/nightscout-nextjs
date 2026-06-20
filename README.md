# Nightscout Next.js

> **A modern, open-source CGM (Continuous Glucose Monitor) remote monitoring system built with Next.js.**
> A community-driven reimplementation of [Nightscout cgm-remote-monitor](https://nightscout.github.io/) using the modern Next.js App Router stack.

---

## ⚠️ IMPORTANT: Under Active Development

**This project is currently under active development and is NOT production-ready.**

Features may be incomplete, unstable, or subject to breaking changes without notice. Do not rely on this software as your primary or sole method of glucose monitoring. Always use your CGM device's native app and follow your healthcare provider's guidance.

---

## ⚕️ Medical Disclaimer

**READ THIS CAREFULLY BEFORE USING THIS SOFTWARE.**

This software is intended for **informational and educational purposes only**. It is **not a medical device** and is **not approved or certified** by any regulatory authority (including but not limited to the FDA, CE, TGA, or Health Canada).

- This software **does not provide medical advice**, diagnosis, or treatment.
- Glucose readings displayed may be **delayed, inaccurate, or missing** due to network issues, sensor errors, or software bugs.
- **Never make insulin dosing or treatment decisions based solely on data shown in this application.**
- Always cross-reference with your CGM device's native display or a calibrated blood glucose meter before taking any clinical action.
- This software is provided **"as-is" with no warranty** of any kind, express or implied.
- The authors, contributors, and maintainers of this project **accept no liability** for any harm, injury, or loss resulting from the use or misuse of this software.

**By using this software, you acknowledge that you have read and understood this disclaimer and agree to use it at your own risk.**

If you are experiencing a medical emergency, contact emergency services immediately. Do not rely on this application during emergencies.

---

## What is Nightscout?

Nightscout is an open-source, DIY project that allows real-time access to CGM data via a personal website. It was originally created in 2013 by parents of children with Type 1 Diabetes to enable remote monitoring — often described as the "#WeAreNotWaiting" movement.

This project reimplements Nightscout using Next.js 16 (App Router), TypeScript, MongoDB, and modern tooling, while maintaining compatibility with existing Nightscout uploaders (xDrip+, AAPS, Loop, Spike, etc.).

---

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <strong>Dashboard</strong><br/>
      Real-time BG, glucose chart, TIR, pump, loop and device age widgets — drag-and-drop grid layout
      <br/><br/>
      <img src="docs/screenshots/01-dashboard.png" alt="Dashboard" width="100%"/>
    </td>
    <td align="center" width="50%">
      <strong>Dark Mode</strong><br/>
      Full dark theme toggle directly in the sidebar — persists across sessions
      <br/><br/>
      <img src="docs/screenshots/07-dark-mode.png" alt="Dark Mode" width="100%"/>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Customizable Dashboard</strong><br/>
      Live drag-and-resize preview at Mobile / Tablet / Desktop widths with per-widget toggles and style options
      <br/><br/>
      <img src="docs/screenshots/02-customize-dashboard.png" alt="Customize Dashboard" width="100%"/>
    </td>
    <td align="center" width="50%">
      <strong>Responsive — Mobile</strong><br/>
      Automatically stacks to a single-column layout on phone screens
      <br/><br/>
      <img src="docs/screenshots/08-responsive-mobile.png" alt="Mobile Responsive" width="100%"/>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Reports</strong><br/>
      AGP, Day to Day, Week to Week, Hourly Stats, Distribution, Loopalyzer — with CSV / JSON export
      <br/><br/>
      <img src="docs/screenshots/04-reports.png" alt="Reports" width="100%"/>
    </td>
    <td align="center" width="50%">
      <strong>History</strong><br/>
      Calendar-based day browser with per-day glucose chart and summary stats
      <br/><br/>
      <img src="docs/screenshots/05-history.png" alt="History" width="100%"/>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Clock Views</strong><br/>
      BG Clock, Color Clock, Clock + BG, and a fully configurable Custom Clock for bedside or tablet mounting
      <br/><br/>
      <img src="docs/screenshots/03-clock.png" alt="Clock Views" width="100%"/>
    </td>
    <td align="center" width="50%">
      <strong>Nightscout API Compatibility</strong><br/>
      Full v1 + v3 REST API — existing uploaders (xDrip+, AAPS, Loop, Spike) connect without any changes
      <br/><br/>
      <img src="docs/screenshots/06-api-entries.png" alt="API Compatibility" width="100%"/>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Settings & Configuration</strong><br/>
      Units, thresholds, alarms, notifications and auth all configurable via env vars or the settings UI
      <br/><br/>
      <img src="docs/screenshots/10-settings.png" alt="Settings" width="100%"/>
    </td>
    <td align="center" width="50%">
      <strong>Zero-Cost Deployment</strong><br/>
      Deploy free to Vercel (hosting) + MongoDB Atlas M0 (database) + Upstash (Redis cache) — <strong>$0/month</strong>
      <br/><br/>
      <img src="docs/screenshots/10-settings.png" alt="Settings and configuration" width="100%"/>
      <br/><em>See <a href="#option-a-vercel-recommended--free-tier-available">deployment guide below</a></em>
    </td>
  </tr>
</table>

---

## Features

### Dashboard
- **Drag-and-drop, resizable widget grid** (react-grid-layout) — rearrange and resize any widget freely
- Separate, independently configurable widgets:
  - **BG Reading** — current glucose, direction arrow, delta, alarm badge, bolus calculator, snooze; compact mode collapses to a single coloured status strip
  - **Glucose Chart** — AR2 forecast cone, Loop/OpenAPS predicted curve, bolus/carb markers, basal timeline; auto-scale or fixed Y-axis; 15m–24h focus window; scrollable time buttons
  - **Time in Range (TIR)** — stacked bar with per-zone breakdown; compact mode shows bar + in-range % only; container-responsive legend (5-col → 2-col → compact)
  - **Active (IOB / COB)** — Insulin on Board and Carbs on Board at a glance
  - **Pump** — reservoir level, battery voltage, active temp basal rate
  - **Loop / Phone** — loop enacted rate, loop IOB, uploader phone battery
  - **Device Age** — sensor (SAGE), cannula (CAGE), insulin (IAGE), battery (BAGE) age with colour-coded badges
- **Customize screen** — live drag/resize preview at Mobile / Tablet / Desktop widths; per-widget show/hide toggles; BG and TIR style (Full / Compact) chips; font size, spacing, padding options
- Color-coded alarm status: urgent low / low / in-range / high / urgent high
- Predictive alarms via AR2 cone (predict mode)
- Server-Sent Events (SSE) for live push updates without polling
- Settings export / import with version stamping (v2 envelope format)

### Reports
- AGP (Ambulatory Glucose Profile) graph
- Hourly stats heatmap
- BG distribution chart
- Time-in-Range breakdown
- Printable report view

### History
- Calendar-based day browser
- Daily BG graph per selected day

### Treatments / CarePortal
- Log insulin boluses, carbs, corrections, temp basals, notes
- Announcement treatments with push notification dispatch
- mmol/L input support with automatic mg/dL storage conversion
- Edit and delete existing treatments

### Entries
- View, edit, and delete raw CGM entries
- Export entries as JSON

### Activity Log
- Track physical activity and its effect on glucose

### Food Database
- Custom food entries with carb counts

### Profile
- Basal schedule, ISF (Insulin Sensitivity Factor), carb ratios, BG targets
- Multiple named profiles with active profile selection

### Settings
- Display units (mg/dL or mmol/L)
- 12h / 24h time format
- Dark / light / system theme
- BG alarm thresholds (urgent low, low, high, urgent high)
- Custom site title
- Alarm enable/disable per type

### Clock Views
- BG Clock — full-screen glucose display for bedside or secondary monitor
- Color Clock — background color changes with BG zone
- Custom Clock — configurable layout builder

### Public Follow View
- `/follow/<token>` — read-only public view for caregivers, requiring no login

### API Compatibility
- **Nightscout API v3** — full CRUD for entries, treatments, devicestatus, profiles, activity
- **Nightscout API v1** — legacy endpoints for older uploaders (entries, treatments, devicestatus, status)
- **Pebble / xDrip+ / Garmin** compatible `/pebble` endpoint
- CORS enabled on all API routes

### CGM Data Connect (Polling)
- **LibreLink Up** — poll glucose data from FreeStyle LibreLink Up (all regions)
- **Dexcom Share** — poll glucose data from Dexcom Share (US and international)

### Notifications
- **Pushover** — BG alarms and announcements with separate routing keys
- **Telegram** — BG alarm notifications
- **IFTTT Maker** — webhooks for alarms and announcements

### Alerts (Cron)
- Cannula Age (CAGE), Sensor Age (SAGE), Insulin Age (IAGE), Battery Age (BAGE)
- Pump reservoir, pump battery (percentage and voltage)
- Loop / OpenAPS last-loop age alerts

### Auth
- Auth.js v5 with credentials provider
- Role-based access: `admin` | `readable`
- `AUTH_DEFAULT_ROLES=readable` for fully public dashboards (no login required)
- API v1/v3 endpoints use `API_SECRET` header auth for uploaders

### Caching
- Optional Redis cache layer with automatic invalidation
- Falls through to MongoDB silently if Redis is unreachable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Auth | Auth.js v5 (next-auth) |
| Database | MongoDB (primary) / PostgreSQL (stub) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Grid layout | react-grid-layout v2 (drag, resize, responsive breakpoints) |
| Data fetching | SWR (client) + Next.js Server Components (initial data) |
| Real-time | Server-Sent Events (SSE) |
| Cache | Redis (optional, via ioredis) |
| Runtime | Node.js 20+ |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 6+ (or a free MongoDB Atlas cluster — see setup below)
- (Optional) Redis for caching — Upstash free tier recommended

### 1. Clone and install

```bash
git clone https://github.com/your-username/nightscout-nextjs.git
cd nightscout-nextjs
npm install
```

### 2. Configure environment variables

Copy the example below to a `.env.local` file and fill in your values:

```env
# ── Required ──────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/nightscout
API_SECRET=my_very_long_api_secret_here
AUTH_SECRET=any_random_32_char_string
AUTH_URL=http://localhost:3000

# ── Database ──────────────────────────────────────────────────────
DB_ADAPTER=mongo          # mongo | postgres
# POSTGRESQL_URI=         # required when DB_ADAPTER=postgres

# ── Display ───────────────────────────────────────────────────────
DISPLAY_UNITS=mg/dl       # mg/dl | mmol
CUSTOM_TITLE=Nightscout
TIME_FORMAT=24            # 24 | 12
NIGHT_MODE=false          # true | false

# ── BG Thresholds (mg/dL) ─────────────────────────────────────────
BG_HIGH=260
BG_TARGET_TOP=180
BG_TARGET_BOTTOM=70
BG_LOW=55

# ── Alarms ────────────────────────────────────────────────────────
ALARM_TYPES=simple        # simple | predict
ALARM_URGENT_HIGH=true
ALARM_HIGH=true
ALARM_LOW=true
ALARM_URGENT_LOW=true
ALARM_TIMEAGO_WARN=true
ALARM_TIMEAGO_WARN_MINS=15
ALARM_TIMEAGO_URGENT=true
ALARM_TIMEAGO_URGENT_MINS=30

# ── Auth ──────────────────────────────────────────────────────────
# readable = public dashboard (no login required for viewing)
# denied   = block all unauthenticated access
AUTH_DEFAULT_ROLES=readable

# ── Plugins ───────────────────────────────────────────────────────
# ENABLE=iob cob basal
# DISABLE=

# ── Pushover Notifications ────────────────────────────────────────
# PUSHOVER_APP_TOKEN=
# PUSHOVER_USER_KEY=
# PUSHOVER_ALARM_KEY=        # overrides USER_KEY for BG alarms
# PUSHOVER_ANNOUNCEMENT_KEY= # overrides USER_KEY for announcements

# ── Telegram ──────────────────────────────────────────────────────
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=

# ── IFTTT Maker ───────────────────────────────────────────────────
# MAKER_KEY=                    # space-separated for multiple keys
# MAKER_ANNOUNCEMENT_KEY=       # falls back to MAKER_KEY

# ── CGM Connect Source ────────────────────────────────────────────
# CONNECT_SOURCE=linkup          # linkup | dexcomshare

# LibreLink Up
# CONNECT_LINK_UP_USERNAME=
# CONNECT_LINK_UP_PASSWORD=
# CONNECT_LINK_UP_REGION=EU      # US EU DE FR JP AP AU AE
# CONNECT_LINK_UP_PATIENT_ID=    # auto-resolved if left empty

# Dexcom Share
# CONNECT_SHARE_ACCOUNT_NAME=
# CONNECT_SHARE_PASSWORD=
# CONNECT_SHARE_REGION=us        # us | ous

# ── Device Age Alerts ─────────────────────────────────────────────
# CAGE_ENABLE_ALERTS=false   CAGE_INFO=44   CAGE_WARN=48   CAGE_URGENT=72
# SAGE_ENABLE_ALERTS=false   SAGE_INFO=144  SAGE_WARN=164  SAGE_URGENT=166
# IAGE_ENABLE_ALERTS=false   IAGE_INFO=44   IAGE_WARN=48   IAGE_URGENT=72
# BAGE_ENABLE_ALERTS=false   BAGE_INFO=312  BAGE_WARN=336  BAGE_URGENT=360
# UPBAT_ENABLE_ALERTS=false  UPBAT_WARN=30  UPBAT_URGENT=20

# ── Pump / Loop Alerts ────────────────────────────────────────────
# PUMP_ENABLE_ALERTS=false   PUMP_WARN_RES=10    PUMP_URGENT_RES=5
# PUMP_WARN_BATT_P=30        PUMP_URGENT_BATT_P=20
# PUMP_WARN_BATT_V=1.35      PUMP_URGENT_BATT_V=1.30
# PUMP_WARN_ON_SUSPEND=false
# LOOP_ENABLE_ALERTS=false   LOOP_WARN=30   LOOP_URGENT=60
# OPENAPS_ENABLE_ALERTS=false OPENAPS_WARN=30 OPENAPS_URGENT=60

# ── Optional Caching ──────────────────────────────────────────────
# REDIS_URL=redis://localhost:6379

# ── Public Follow View ────────────────────────────────────────────
# SHARE_TOKEN=some_secret_token   # enables /follow/<token>
```

### 3. Create the first admin user

Start the dev server and navigate to `/register` to create the initial admin account.

```bash
npm run dev
```

Then open [http://localhost:3000/register](http://localhost:3000/register).

---

## Commands

```bash
npm run dev           # Start development server (http://localhost:3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint
npm run type-check    # TypeScript check (no emit)

# Simulated CGM data (for local development)
npm run fake-cgm              # Inject fake readings every 5 minutes
npm run fake-cgm:fast         # Inject every 5 seconds (rapid testing)
```

---

## Uploader Compatibility

This app is designed to be a drop-in replacement for cgm-remote-monitor. Existing uploaders can point at this server's URL without changes:

| Uploader | API Used | Notes |
|---|---|---|
| xDrip+ | v1 / v3 | Set "Nightscout URL" to your server URL |
| AAPS (AndroidAPS) | v3 | Full v3 support |
| Loop (iOS) | v1 | Uses `/api/v1/` endpoints |
| Spike | v1 | Uses `/api/v1/` endpoints |
| Nightscout Companion | v1 | Status and entries |
| Pebble / Garmin | pebble | `/pebble` endpoint |

**Auth for uploaders:** Pass `API-SECRET: <sha1-of-your-API_SECRET>` as an HTTP header, or use the `token=<hash>` query parameter.

---

## Cron Jobs

Two cron endpoints must be called on a schedule for alert and connect features:

| Endpoint | Recommended interval | Purpose |
|---|---|---|
| `GET /api/cron/connect?token=<hash>` | Every 5 minutes | Polls LibreLink Up / Dexcom Share and inserts new entries |
| `GET /api/cron/alerts?token=<hash>` | Every 5 minutes | Evaluates device age and pump/loop alerts, sends notifications |

The `token` parameter is the SHA-1 hash of your `API_SECRET`. You can use any cron service (Vercel Cron, cron-job.org, GitHub Actions, etc.).

### Example: Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/connect?token=YOUR_HASH", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/alerts?token=YOUR_HASH",  "schedule": "*/5 * * * *" }
  ]
}
```

---

## Deployment

---

### Option A: Vercel (Recommended — Free Tier Available)

Vercel is the easiest way to deploy. The free Hobby plan is enough for personal use.

#### Step 1 — Sign up for Vercel

1. Go to [vercel.com](https://vercel.com) and click **Sign Up**
2. Choose **Continue with GitHub** (recommended — connects your repo automatically)
3. Complete the signup flow

#### Step 2 — Set up MongoDB Atlas (free database)

MongoDB Atlas offers a permanently free M0 cluster (512 MB — more than enough for years of CGM data).

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Click **Create** → choose **M0 Free** tier → select your closest region → click **Create Cluster**
3. On the **Security** tab → **Database Access** → **Add New Database User**
   - Username: `nightscout`
   - Password: generate a strong password and save it
   - Role: **Read and write to any database**
4. On **Network Access** → **Add IP Address** → choose **Allow Access from Anywhere** (`0.0.0.0/0`)
   - *(Vercel uses dynamic IPs, so you must allow all or use a static IP proxy)*
5. On **Database** → **Connect** → **Connect your application** → copy the connection string
   - It looks like: `mongodb+srv://nightscout:<password>@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your actual password
   - Append the database name: `mongodb+srv://nightscout:yourpassword@cluster0.xxxxx.mongodb.net/nightscout`

#### Step 3 — Set up Redis with Upstash (optional but recommended)

Upstash offers a free serverless Redis instance (10,000 requests/day free). It works in headless/serverless environments like Vercel with no persistent TCP connections — uses HTTP REST.

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Click **Create Database** → name it `nightscout` → choose your region → click **Create**
3. On the database page, scroll to **REST API** section
4. Copy the two values:
   - **UPSTASH_REDIS_REST_URL** — looks like `https://xxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN** — a long JWT token

> **Note:** Upstash also provides a standard Redis URL (`rediss://...`) which works with `REDIS_URL`. Both modes are supported — Upstash REST is preferred for Vercel serverless.

#### Step 4 — Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → click **Import** next to your repository
3. Vercel auto-detects Next.js — no build config needed
4. Before clicking **Deploy**, click **Environment Variables** and add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `API_SECRET` | A random string of 12+ characters (your admin password) |
| `AUTH_SECRET` | A random 32+ char string (run `openssl rand -base64 32`) |
| `AUTH_URL` | Your Vercel app URL, e.g. `https://myname.vercel.app` |
| `DB_ADAPTER` | `mongo` |
| `DISPLAY_UNITS` | `mg/dl` or `mmol` |
| `UPSTASH_REDIS_REST_URL` | *(optional)* Your Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | *(optional)* Your Upstash REST token |

5. Click **Deploy** — Vercel builds and deploys automatically (takes ~1 minute)
6. Your app is live at `https://your-project-name.vercel.app`

#### Step 5 — First login

1. Open your app URL + `/register` — this shows your environment variable setup status
2. Navigate to `/login` and enter your `API_SECRET` as the password
3. You're in!

#### Step 6 — Set up Cron Jobs on Vercel (for CGM connect + alerts)

Add a `vercel.json` to the root of your project:

```json
{
  "crons": [
    {
      "path": "/api/cron/connect?token=REPLACE_WITH_SHA1_OF_API_SECRET",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/alerts?token=REPLACE_WITH_SHA1_OF_API_SECRET",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

To generate the token (SHA-1 of your API_SECRET):
```bash
echo -n "your_api_secret_here" | sha1sum
```

> Vercel Cron requires a Pro plan for sub-minute intervals. The free plan supports `*/5 * * * *` (every 5 minutes) for up to 2 cron jobs.

---

### Option B: Docker / Self-hosted

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Set `output: "standalone"` in `next.config.ts` for this to work.

For self-hosted, use a standard `REDIS_URL=redis://localhost:6379` or `REDIS_URL=rediss://...` (with TLS) — ioredis handles the connection. Upstash also works in self-hosted mode via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

### Option C: Railway / Render / Fly.io

Set environment variables through the platform dashboard and deploy directly from the repository. All platforms that support Node.js and environment variables are compatible. For Redis on these platforms, use [Upstash](https://upstash.com) (REST mode, works everywhere) or provision a managed Redis add-on.

---

## Project Structure

```
app/
  (auth)/               # Login and register pages
  (dashboard)/          # Protected routes: dashboard, reports, treatments, entries, history, etc.
    dashboard/
      page.tsx          # Main dashboard — server component that seeds widget initial data
      customize/        # Live drag/resize customise screen
  api/
    auth/[...nextauth]/ # Auth.js handler
    v1/                 # Nightscout v1 legacy API (entries, treatments, devicestatus, status, pebble)
    v3/                 # Nightscout v3 REST API (full CRUD + history + export)
    cron/
      connect/          # CGM data poller cron endpoint
      alerts/           # Alarm evaluation cron endpoint
    settings/           # UI settings GET/POST
    sse/                # Server-Sent Events stream
  clock/                # Clock view pages (bg, color, custom)
  follow/[token]/       # Public read-only follow view
components/
  ui/                   # shadcn/ui components (do not hand-edit)
  charts/
    GlucoseChart.tsx    # Recharts glucose graph (AR2 cone, loop prediction, basal overlay)
  dashboard/
    DashboardGrid.tsx   # react-grid-layout v2 responsive widget grid
    BGWidget.tsx        # BG reading widget (full + compact modes)
    ChartWidget.tsx     # Glucose chart widget (focus hours, auto-scale, compact)
    TIRWidget.tsx       # Time-in-Range widget (full + compact modes)
    ActiveWidget.tsx    # IOB / COB (part of DeviceStatus.tsx)
    PumpWidget.tsx      # Pump status (part of DeviceStatus.tsx)
    LoopWidget.tsx      # Loop / phone status (part of DeviceStatus.tsx)
    DeviceAgeWidget.tsx # SAGE/CAGE/IAGE/BAGE (part of DeviceStatus.tsx)
lib/
  db/
    index.ts            # Active DB adapter (resolves to mongo or postgres)
    adapters/           # mongo.ts, postgres.ts
    models/             # Shared TypeScript interfaces
    cached.ts           # Redis cache layer
  auth.ts               # Auth.js config
  nightscout/
    serverConfig.ts     # Central env var parser (getServerConfig)
    settings.ts         # UI settings helpers
    dashboardConfig.ts  # Grid layout defaults, DashboardConfig type, migration logic
    useCGMData.ts       # Shared SWR hook — all CGM-derived values (deduplicates fetches)
    iob.ts              # IOB calculation
    cob.ts              # COB calculation
    ar2.ts              # AR2 forecast + predictive alarm cone
    alarms.ts           # Alarm level evaluation
    units.ts            # mg/dL ↔ mmol/L conversion
    basal.ts            # Basal timeline builder
    connect/
      librelinkup.ts    # LibreLink Up poller
      dexcomshare.ts    # Dexcom Share poller
    pushover.ts         # Pushover notification helpers
    ifttt.ts            # IFTTT Maker webhook helpers
    cors.ts             # CORS helpers for API routes
proxy.ts                # Next.js 16 route protection (replaces middleware.ts)
types/                  # Global TypeScript types and Nightscout protocol types
```

---

## API Reference

### Authentication

All API endpoints accept authentication via:

- **Header:** `API-SECRET: <sha1-of-API_SECRET>`
- **Query param:** `?token=<sha1-of-API_SECRET>`

### v3 Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v3/entries` | List CGM entries |
| POST | `/api/v3/entries` | Create entry |
| GET | `/api/v3/entries/:id` | Get entry by ID |
| PUT | `/api/v3/entries/:id` | Update entry |
| DELETE | `/api/v3/entries/:id` | Delete entry |
| GET | `/api/v3/entries/history` | Entries changed since timestamp |
| GET | `/api/v3/entries/export` | Export all entries as JSON |
| GET | `/api/v3/treatments` | List treatments |
| POST | `/api/v3/treatments` | Create treatment |
| GET | `/api/v3/treatments/:id` | Get treatment by ID |
| PUT | `/api/v3/treatments/:id` | Update treatment |
| DELETE | `/api/v3/treatments/:id` | Delete treatment |
| GET | `/api/v3/devicestatus` | List device statuses |
| POST | `/api/v3/devicestatus` | Create device status |
| GET | `/api/v3/profiles` | List profiles |
| POST | `/api/v3/profiles` | Create profile |
| GET | `/api/v3/profile` | Get active profile |
| GET | `/api/v3/lastModified` | Last modified timestamps per collection |
| GET | `/api/v3/status` | Server and settings status |
| GET | `/api/v3/version` | API version info |

### v1 Endpoints (Legacy)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/entries` | List entries (legacy format) |
| POST | `/api/v1/entries` | Create entries (legacy format) |
| GET | `/api/v1/treatments` | List treatments |
| POST | `/api/v1/treatments` | Create treatments |
| GET | `/api/v1/devicestatus` | List device statuses |
| POST | `/api/v1/devicestatus` | Create device status |
| GET | `/api/v1/status` | Nightscout status.json |
| GET | `/pebble` | Pebble / xDrip+ / Garmin endpoint |

---

## Data Model

All glucose values are stored internally in **mg/dL**. Conversion to mmol/L (÷ 18.01559) happens at the UI display layer only.

| Collection | Description |
|---|---|
| `entries` | CGM readings: `sgv` (sensor glucose), `mbg` (manual BG), `cal` (calibration) |
| `treatments` | Insulin doses, carbs, notes, temp basals, site changes, announcements |
| `devicestatus` | Pump/CGM telemetry — battery, reservoir, loop status |
| `profiles` | Basal schedules, ISF, carb ratios, BG targets, timezone |
| `activity` | Optional fitness data |
| `ui_settings` | UI preferences stored server-side (singleton) |

Direction strings follow Nightscout convention: `DoubleUp`, `SingleUp`, `FortyFiveUp`, `Flat`, `FortyFiveDown`, `SingleDown`, `DoubleDown`, `NONE`.

---

## Development

### Running tests / checks

```bash
npm run type-check    # TypeScript strict check
npm run lint          # ESLint
```

### Simulating CGM data locally

```bash
# Requires MONGODB_URI and API_SECRET in .env.local
npm run fake-cgm         # sends one reading every 5 minutes
npm run fake-cgm:fast    # sends one reading every 5 seconds
```

### Adding shadcn/ui components

```bash
npx shadcn@latest add <component-name>
```

Never scaffold shadcn components by hand — always use the CLI.

---

## Known Limitations (Work in Progress)

- PostgreSQL adapter is stubbed — not yet functional
- No automated test suite (unit/integration tests planned)
- No native mobile app; the web UI is fully responsive but not a PWA yet
- Docker/standalone build configuration not bundled (manual Dockerfile setup required)
- Raw BG and calibration entry types are stored but not charted separately
- Some advanced Nightscout plugins (delta bands, raw BG overlay) not yet implemented

---

## Contributing

Contributions are welcome. Please open an issue before submitting large PRs so the change can be discussed first.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run type-check and lint before committing: `npm run type-check && npm run lint`
4. Open a pull request with a clear description of the change

---

## License

This project is open-source software released under the **MIT License**.

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## Acknowledgements

- The original [Nightscout / cgm-remote-monitor](https://github.com/nightscout/cgm-remote-monitor) project and the entire #WeAreNotWaiting community
- [Nightscout Foundation](https://www.nightscoutfoundation.org/) for supporting open-source diabetes technology
- All CGM manufacturers whose data formats and APIs made this ecosystem possible

---

*This project is not affiliated with, endorsed by, or connected to Abbott, Dexcom, Medtronic, or any other medical device manufacturer.*
