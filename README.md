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
| `PASSCODE_HASH` | scrypt hash of your login passcode                      |

Generate the last two:

```bash
npm run --silent hash-passcode -- "your passcode here"
```

The `--silent` matters — without it npm prints its own banner into the output.
The passcode itself is never stored; only the scrypt hash is.

Changing `AUTH_SECRET` signs every device out. Changing `PASSCODE_HASH` changes
the passcode.

## Setting up the database

1. In the Vercel dashboard, open the project → **Storage** → **Create Database**
   → **Neon** (listed as Postgres). Pick the region closest to you.
2. Connect it to the project when prompted, for all three environments
   (Production, Preview, Development). Vercel then sets `DATABASE_URL` on every
   deployment automatically — there is no secret to copy by hand.
3. Add `AUTH_SECRET` and `PASSCODE_HASH` under **Settings → Environment
   Variables**, for all three environments.
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
| `npm run hash-passcode` | Generate `PASSCODE_HASH` and `AUTH_SECRET`     |
| `npm run db:generate`   | Generate a migration from schema changes       |
| `npm run db:migrate`    | Apply pending migrations                       |
| `npm run db:studio`     | Browse the database                            |

## How auth works

`src/proxy.ts` gates every route by default; only `/login` and the login API are
public. New routes are therefore protected the moment they are created, rather
than the moment someone remembers to guard them.

Submitting the passcode hits `POST /api/auth/login`, which verifies it against
`PASSCODE_HASH` using scrypt (constant-time comparison) and sets a signed
HTTP-only JWT cookie lasting 90 days. Because the session lives in a cookie and
all data lives in Postgres, signing in on a second device shows exactly the same
state.

scrypt runs in Node, so the login route pins `runtime = "nodejs"`. Cookie
verification uses `jose`, which works on the edge runtime, so route gating stays
in the proxy layer.

## Project layout

```
src/
  app/
    api/auth/login/    passcode → session cookie
    api/auth/logout/   clears the cookie
    api/health/        proves Postgres read + write
    login/             passcode form
    page.tsx           placeholder home
  db/
    index.ts           Drizzle client over Neon HTTP
    schema.ts          table definitions
  lib/
    env.ts             validated env access
    passcode.ts        scrypt hash + verify (Node only)
    session.ts         JWT sign + verify (edge safe)
  proxy.ts             route gating
drizzle/               generated migrations
```

## Status

Foundation only. The schema currently holds a single `app_meta` table used by
the health check — the feature tables are designed once the spec is agreed.
