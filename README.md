# Auto Matica — base app

Next.js (App Router) base project with JWT-based authentication and a sample dashboard, ready to deploy on Vercel.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- [`jose`](https://github.com/panva/jose) — signs/verifies JWTs, edge-runtime compatible (used in `proxy.ts`)
- [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) — password hashing

## Auth flow

- `POST /api/auth/login` — validates email/password against `src/lib/users.ts`, signs a JWT (`src/lib/auth.ts`) and sets it as an `httpOnly` cookie (`session`).
- `POST /api/auth/logout` — clears the cookie.
- `src/proxy.ts` (Next's middleware convention) — guards `/dashboard/*`, redirecting unauthenticated visitors to `/login`, and bounces already-authenticated users away from `/login`.
- `src/app/dashboard/layout.tsx` — re-checks the session server-side and reads the logged-in email to display it.

## Demo credentials

```
email:    agente@recoautos.com
password: +Segovia1
```

These live in `.env.local` as `AUTH_USER_EMAIL` and a bcrypt hash (`AUTH_USER_PASSWORD_HASH`). See `.env.example` for the format.

> ⚠️ **Env var gotcha:** bcrypt hashes contain `$` (e.g. `$2b$10$...`). Next.js expands `$VAR` references in `.env*` files, so every `$` in the hash must be escaped as `\$`, or it will be silently corrupted at load time.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/login`.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel, or run `vercel` from this directory.
2. Set the environment variables from `.env.local` in the Vercel project settings (Production/Preview/Development):
   - `JWT_SECRET` — generate a new one for real deployments: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `AUTH_USER_EMAIL`
   - `AUTH_USER_PASSWORD_HASH` (escape `$` as `\$` if you set it via a `.env` file; the Vercel dashboard UI does not need escaping)
3. Deploy.

## Project structure

```
src/
  app/
    login/page.tsx           # login form (client component)
    dashboard/layout.tsx     # session guard + shell (header, logout)
    dashboard/page.tsx       # sample dashboard (stat cards + table)
    api/auth/login/route.ts
    api/auth/logout/route.ts
  components/logout-button.tsx
  lib/auth.ts                 # JWT sign/verify helpers
  lib/users.ts                 # credential check (env-backed demo user)
  proxy.ts                     # route protection (Next's middleware convention)
```

This is a sample/demo auth setup (single hardcoded user via env vars). Swap `src/lib/users.ts` for a real database lookup before using this in production with multiple users.
