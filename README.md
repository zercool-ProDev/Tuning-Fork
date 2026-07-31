# Tuning Fork

Personal music development tracker — ear training, music theory, Logic Pro
production skills, four-instrument mastery, genre versatility, and EP release
tracking.

Single user, accessed from phone and laptop interchangeably.

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 16, App Router, TypeScript              |
| Styling    | Tailwind CSS v4                                 |
| Database   | Postgres (Neon, via the Vercel integration)     |
| Data layer | Drizzle ORM + drizzle-kit migrations            |
| Auth       | Single passcode → signed, HTTP-only JWT cookie  |
| Hosting    | Vercel                                          |

### The one rule about state

**All user data lives in Postgres. Nothing is stored in `localStorage` or
`sessionStorage` as a source of truth.** Browser storage is per-device, so
anything kept there would make the phone and the laptop disagree. Those APIs are
acceptable only for throwaway UI preferences that are *meant* to be per-device
(a collapsed sidebar, say) — never for practice logs, progress, or settings.

## Environment variables

See `.env.example`. Three are required:

| Variable        | Where it comes from                                    |
| --------------- | ------------------------------------------------------ |
| `DATABASE_URL`  | Injected automatically by the Neon/Vercel integration   |
| `AUTH_SECRET`   | Random string; signs the session cookie                 |
| `APP_PASSCODE`  | Your login passcode, in plain text                      |

Generate `AUTH_SECRET`:

```bash
npm run --silent gen-secret
```

The `--silent` matters — without it npm prints its own banner into the output.
`APP_PASSCODE` needs no generator: it is simply whatever passcode you choose.

It is stored unhashed on purpose. For a single-user personal app, the Vercel
account that can read the variable is already what guards the deployment, so
hashing would defend against a threat that does not really exist here while
costing a setup step that requires a terminal. See `src/lib/passcode.ts`.

Changing `AUTH_SECRET` signs every device out. Changing `APP_PASSCODE` changes
the passcode.

## Setting up the database

1. In the Vercel dashboard, open the project → **Storage** → **Create Database**
   → **Neon** (listed as Postgres). Pick the region closest to you.
2. Connect it to the project when prompted, for all three environments
   (Production, Preview, Development). Vercel then sets `DATABASE_URL` on every
   deployment automatically — there is no secret to copy by hand.
3. Add `AUTH_SECRET` and `APP_PASSCODE` under **Settings → Environments**,
   for all three environments.
4. Pull everything down for local work: `vercel env pull .env.local`
5. Apply migrations: `npm run db:migrate`
6. Visit `/api/health`. A healthy response looks like:

   ```json
   { "ok": true, "database": "connected", "readWrite": "verified" }
   ```

## Local development

```bash
npm install
vercel env pull .env.local   # or fill in .env.example by hand
npm run db:migrate
npm run dev
```

## Scripts

| Script                  | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Development server                             |
| `npm run build`         | Production build                               |
| `npm run lint`          | ESLint                                         |
| `npm run gen-secret`    | Generate `AUTH_SECRET`                         |
| `npm run db:generate`   | Generate a migration from schema changes       |
| `npm run db:migrate`    | Apply pending migrations                       |
| `npm run db:seed`       | Load/refresh reference content (idempotent)    |
| `npm run db:studio`     | Browse the database                            |
| `npm run e2e`           | Playwright end-to-end tests                    |

## Data model

Practice history is **one append-only timeline**, not six per-section logs:

- `practice_sessions` — one row per sitting
- `session_segments` — the unified log. Each carries a `domain`, its minutes,
  and optional foreign keys naming the instrument, genre, EP track, skill node
  or production project it was about. Those nullable FKs are what stop the
  domains becoming silos.

Streaks, the heatmap, time-per-domain and "this week's focus" are all a single
`GROUP BY` over `session_segments`. There is no heatmap table.

Everything else is **current state** that hangs off that timeline — skill tree
progress, repertoire, genre ratings, EP tracks, the SRS queue, roadmap
milestones. State rows reference the session that moved them, so the heatmap and
the skill tree cannot drift apart.

Two deliberate choices worth knowing:

- **SRS is scheduled per concept, not per question.** A review pulls a fresh
  question from a weak concept rather than re-showing one whose shape you have
  memorised. Moving to per-question later is an additive migration.
- **`ep_track_stage_events` records every stage transition.** Current stage
  alone cannot tell you where you stall; the history is what says "tracking took
  three weeks, mixing has been sitting for five".

### Seed content

`npm run db:seed` loads 4 instruments, 12 genres, 9 drill types, a 19-concept
theory curriculum with prerequisites, 22 starter quiz questions, 44 skill-tree
nodes (four instrument trees plus Logic Pro), an EP shell with 5 tracks, and 4
roadmap quarters. It is idempotent and conflicts on natural keys, so it never
clobbers edits made in the app and can be re-run as new seed content lands.

## How auth works

`src/proxy.ts` gates every route by default; only `/login` and the login API are
public. New routes are therefore protected the moment they are created, rather
than the moment someone remembers to guard them.

Submitting the passcode hits `POST /api/auth/login`, which verifies it against
`APP_PASSCODE` (constant-time comparison) and sets a signed
HTTP-only JWT cookie lasting 90 days. Because the session lives in a cookie and
all data lives in Postgres, signing in on a second device shows exactly the same
state.

The compare runs in Node, so the login route pins `runtime = "nodejs"`. Cookie
verification uses `jose`, which works on the edge runtime, so route gating stays
in the proxy layer.

## Project layout

```
src/
  app/
    (app)/             signed-in shell: dashboard, skills, log, sessions
    actions/sessions   create / update / delete a session
    api/auth/          login, logout
    api/health/        setup and connectivity check
    login/             passcode form
  components/
    ui.tsx             buttons, fields, cards, domain tag
    heatmap.tsx        contribution grid, scrolled to the recent weeks
    week-bars.tsx      last seven days
    nav.tsx            bottom bar on mobile, top bar on desktop
    session-form.tsx   the logger, shared by new and edit
    session-card.tsx   one sitting, with its domain split
    skill-tree.tsx     shared by all five trees
    repertoire.tsx     songs learned, per instrument
    fluency.tsx        self-rated fluency over time
  db/
    index.ts           Drizzle client, driver chosen from the URL
    queries.ts         read helpers and aggregates
    schema.ts          table definitions
  lib/
    dates.ts           timezone-aware day maths
    streaks.ts         streak, consistency and heatmap grid maths
    domains.ts         domain labels and colours
    env.ts             validated env access
    passcode.ts        constant-time passcode compare (Node only)
    session.ts         JWT sign + verify (edge safe)
  proxy.ts             route gating
e2e/                   Playwright end-to-end tests
drizzle/               generated migrations
```

## Testing

`npm run e2e` drives a real browser through sign-in, logging a multi-domain
session, editing it and deleting it. That path is worth covering end to end
because the server actions — form encoding, segment index parsing, the delete
cascade — only really run when a browser submits the form.

It expects a server already running on `:3000` against a database you are happy
to write to; the tests create and delete real rows.

```bash
npm run build && npm run start   # .env.local pointing at a test database
npm run e2e
```

`src/db/index.ts` picks its driver from the connection string — Neon's HTTP
driver for Neon hosts, node-postgres for anything else — which is what makes
running against a local Postgres possible.

## Status

Stages 1-4 are done: schema and seed content; the design system, session logger,
journal and session list; the dashboard; and the skill-tree engine covering the
four instruments and Logic Pro.

Stage 5 is ear training and sight reading - drill logging and accuracy trends.
