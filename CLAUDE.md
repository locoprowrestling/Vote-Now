# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173/
npm run build     # Build to ./dist
npm run preview   # Preview production build
npm run lint      # Run ESLint (flat config format)
```

No test framework is configured.

### Supabase Edge Functions

```bash
supabase functions serve admin-action   # Run Edge Function locally (Deno runtime)
supabase db push                        # Apply schema changes
```

## Architecture

Vote-Now is a **real-time fan voting app** for LoCo Pro Wrestling events. It uses React + Vite on the frontend with Supabase (PostgreSQL + Realtime + Edge Functions) as the backend.

### Security model

Admin mutations never use the service role key in the browser. All writes go through the `admin-action` Supabase Edge Function ([supabase/functions/admin-action/index.ts](supabase/functions/admin-action/index.ts)), which validates the admin password server-side before using the service key. The browser only holds the anon key and `VITE_ADMIN_PASSWORD`.

Votes are deduplicated via a `UNIQUE(poll_id, session_id)` constraint in the DB. The session ID is generated once per browser and stored in `localStorage` ([src/lib/localVotes.js](src/lib/localVotes.js)).

### Data flow

- **Reads:** `usePolls.js` and `useVoteCounts.js` fetch from `polls`, `options`, and the `vote_counts` view (anon-readable aggregate — individual votes are never exposed to the frontend)
- **Realtime:** Both hooks subscribe to Supabase Realtime on `votes` and `polls` tables to refresh live counts without polling
- **Writes (fans):** `supabase.from('votes').insert(...)` directly from the browser using the anon key
- **Writes (admin):** `adminAction(action, payload)` in [src/lib/supabaseClient.js](src/lib/supabaseClient.js) calls the Edge Function

### Key files

| File | Purpose |
|------|---------|
| [src/App.jsx](src/App.jsx) | HashRouter with `/` (FanPage) and `/admin` routes |
| [src/pages/FanPage.jsx](src/pages/FanPage.jsx) | Public voting UI — shows open polls in real-time |
| [src/pages/AdminPage.jsx](src/pages/AdminPage.jsx) | Password-gated dashboard: create, edit, toggle, copy, delete polls |
| [src/hooks/usePolls.js](src/hooks/usePolls.js) | Fetches polls + Realtime subscription |
| [src/hooks/useVoteCounts.js](src/hooks/useVoteCounts.js) | Fetches vote_counts view + Realtime subscription |
| [src/lib/supabaseClient.js](src/lib/supabaseClient.js) | Supabase client init + `adminAction()` helper |
| [supabase/functions/admin-action/index.ts](supabase/functions/admin-action/index.ts) | Edge Function — all admin mutations with server-side auth |
| [supabase/schema.sql](supabase/schema.sql) | Full DB schema (tables, view, RLS, indexes) |

### Database schema

- `polls` — title, description, type (`prediction`|`favorite`|`custom`|`reaction`), status (`open`|`closed`)
- `options` — poll choices with label, emoji, sort_order; cascade-deleted with poll
- `votes` — session_id + option_id + poll_id; unique constraint enforces one vote per session per poll
- `vote_counts` — public-readable view aggregating vote counts per option (no individual rows exposed)

RLS: anon can SELECT polls/options, INSERT votes, SELECT vote_counts. All admin mutations bypass RLS via service key in the Edge Function.

### Deployment

- Deployed to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml) on push to `main`
- Supabase env vars are injected as GitHub Actions secrets at build time
- `ADMIN_PASSWORD` must also be set as a Supabase Edge Function secret (separate from the Vite env var)

## Environment variables

Copy `.env.example` to `.env.local` for local development:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_PASSWORD=
```

The Edge Function reads `ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase secrets (set via `supabase secrets set`), not from `.env.local`.
