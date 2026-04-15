# Live Fan Voting App — Recreation Guide

A complete step-by-step guide for setting up this real-time fan voting tool for a new organization from scratch.

---

## What This Tool Is

A mobile-first web app where fans scan a QR code at a live event and vote on polls in real time. An admin controls which polls are open from a password-protected dashboard. Vote counts update live across all connected devices without page refreshes.

**Feature summary:**
- Create polls with 4 types: Match Prediction, Fan Favorite, Live Reaction (emoji buttons), Custom
- Open/close voting in one tap; optional auto-close timer (by duration or specific time)
- Real-time vote count updates via Supabase Realtime
- One vote per browser session enforced in the database
- Bot protection via Cloudflare Turnstile (invisible challenge)
- Admin can show/hide final results, copy polls, reset votes
- Email/mailing list opt-in from fans
- Free hosting on GitHub Pages

**Tech stack:** React 19 + Vite, Tailwind CSS v4, Supabase (PostgreSQL + Realtime + Edge Functions), Cloudflare Turnstile, GitHub Actions/Pages

---

## Prerequisites — Accounts to Create First

Before writing any code, create accounts at:

1. **GitHub** — github.com (for hosting the repo and deploying to GitHub Pages, free)
2. **Supabase** — supabase.com (database + backend, free tier is sufficient)
3. **Cloudflare** — cloudflare.com (for Turnstile bot protection, free)

---

## Step 1: Create the GitHub Repository

1. On GitHub, create a new **public** repository (private repos require a paid GitHub plan for Pages).
2. Name it something like `fan-vote` or `[org-name]-vote`.
3. Clone it locally:
   ```bash
   git clone https://github.com/YOUR_ORG/YOUR_REPO.git
   cd YOUR_REPO
   ```

---

## Step 2: Scaffold the React + Vite App

```bash
npm create vite@latest . -- --template react
```

When prompted, choose the current directory (`.`) and confirm overwriting.

Install dependencies:

```bash
npm install @supabase/supabase-js react-router-dom @marsidev/react-turnstile
npm install -D tailwindcss @tailwindcss/vite
```

---

## Step 3: Configure Vite

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
})
```

---

## Step 4: Set Up Tailwind + Brand Colors

Replace `src/index.css` with your brand colors. The current app uses this pattern:

```css
@import "tailwindcss";

@theme {
  --color-brand-primary:   #5a2488;   /* main brand color */
  --color-brand-dark:      #3d175d;   /* darker shade */
  --color-brand-deep:      #2f0b56;   /* deepest shade (card backgrounds) */
  --color-brand-green:     #008642;   /* success / live indicator */
  --color-brand-gold:      #cfac00;   /* accent / CTA */
  --color-brand-text:      #150d20;   /* dark text on light backgrounds */
  --color-brand-light:     #cfcfcf;   /* body text */
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: #3d175d;         /* match --color-brand-dark */
  color: #f5f5f5;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

**Customization:** Replace the hex values with your organization's brand colors. Every component references these CSS variables via Tailwind utility classes (e.g., `bg-brand-primary`, `text-brand-gold`). Changing the variables here changes the entire app.

---

## Step 5: Create the Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose your organization, pick a region close to your event venue
3. Set a strong database password (save it somewhere)
4. Wait ~2 minutes for the project to provision

From the project dashboard, collect these values (you'll need them later):
- **Project URL** — Settings → API → Project URL  
  e.g., `https://abcdefghijkl.supabase.co`
- **Anon (public) key** — Settings → API → Project API Keys → `anon public`
- **Service role key** — Settings → API → Project API Keys → `service_role` (keep secret)

---

## Step 6: Apply the Database Schema

In Supabase Dashboard → SQL Editor, run the following SQL:

```sql
-- TABLES

create table polls (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  type         text not null default 'custom'
                 check (type in ('prediction', 'favorite', 'custom', 'reaction')),
  status       text not null default 'closed'
                 check (status in ('open', 'closed')),
  show_results boolean not null default false,
  vote_reset_count integer not null default 0,
  closes_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references polls(id) on delete cascade,
  label      text not null,
  emoji      text,
  sort_order int  not null default 0
);

create table votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references polls(id) on delete cascade,
  option_id  uuid not null references options(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, session_id)
);

-- INDEXES

create index votes_poll_session on votes (poll_id, session_id);
create index votes_option_id    on votes (option_id);
create index options_poll_id    on options (poll_id);

-- VIEW (aggregated vote counts — no individual vote data exposed)

create or replace view vote_counts as
  select
    o.id         as option_id,
    o.poll_id,
    o.label,
    o.emoji,
    o.sort_order,
    count(v.id)  as vote_count
  from options o
  left join votes v on v.option_id = o.id
  group by o.id, o.poll_id, o.label, o.emoji, o.sort_order;

grant select on vote_counts to anon;

-- ROW LEVEL SECURITY

alter table polls   enable row level security;
alter table options enable row level security;
alter table votes   enable row level security;

create policy "polls_select"   on polls   for select to anon using (true);
create policy "options_select" on options for select to anon using (true);

create policy "votes_insert" on votes for insert to anon
  with check (
    exists (
      select 1 from polls
      where polls.id = votes.poll_id
        and polls.status = 'open'
        and (polls.closes_at is null or polls.closes_at > now())
    )
  );

-- EMAIL OPT-IN

create table voter_emails (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null unique,
  email        text not null,
  mailing_list boolean not null default false,
  created_at   timestamptz not null default now(),
  removed_at   timestamptz default null
);

alter table voter_emails enable row level security;

create policy "voter_emails_insert" on voter_emails for insert to anon with check (true);

grant insert on voter_emails to anon;
```

---

## Step 7: Enable Realtime

In Supabase Dashboard → Database → Replication (or "Realtime" in the left nav):

1. Enable Realtime for the **`votes`** table
2. Enable Realtime for the **`polls`** table

This is what makes vote counts update live across all connected browsers without polling.

---

## Step 8: Set Up Cloudflare Turnstile (Bot Protection)

Votes go through a Cloudflare Turnstile invisible challenge to prevent bots from stuffing ballots.

1. Log in to [cloudflare.com](https://cloudflare.com) → Turnstile (left nav)
2. Click **Add widget**
3. Give it a name (e.g., "Fan Vote")
4. Add your GitHub Pages domain: `https://YOUR_ORG.github.io` (you can also add `localhost` for local dev)
5. Widget type: **Invisible**
6. Save and collect:
   - **Site Key** (goes in the frontend env var)
   - **Secret Key** (goes in the Edge Function secret)

---

## Step 9: Set Up Supabase Edge Functions

The Edge Functions run server-side Deno code so the service role key never touches the browser.

### Install the Supabase CLI

```bash
npm install -g supabase
supabase login
```

### Initialize Supabase locally

In your project root:

```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is the subdomain in your Supabase URL (e.g., `abcdefghijkl` from `https://abcdefghijkl.supabase.co`).

### Create the three Edge Functions

```bash
supabase functions new admin-action
supabase functions new submit-vote
supabase functions new submit-email
```

### Populate `supabase/functions/admin-action/index.ts`

This function handles all admin mutations. It accepts either the raw admin password or a short-lived session token (issued at login, valid 12 hours). Copy the full file from this repo — it handles: `verify_admin`, `create_poll`, `update_poll`, `toggle_status`, `delete_poll`, `copy_poll`, `toggle_show_results`, `reset_poll`, `get_mailing_list`, `remove_from_mailing_list`.

Key parts to understand:
- `ADMIN_PASSWORD` env var is compared server-side; the browser never gets the service key
- On successful password login, a signed HMAC token is returned and cached in-memory on the client for the session
- All subsequent admin actions send the token instead of the password

### Populate `supabase/functions/submit-vote/index.ts`

This function verifies the Turnstile token with Cloudflare's API before inserting the vote using the service role key. Duplicate vote errors (Postgres code `23505`) are silently treated as success so users aren't shown errors for re-voting.

### Populate `supabase/functions/submit-email/index.ts`

Validates email format, then upserts into `voter_emails` on conflict of `session_id` (so re-submitting the same browser session updates rather than errors).

### Set Edge Function secrets

```bash
supabase secrets set ADMIN_PASSWORD="your-strong-admin-password"
supabase secrets set ADMIN_SESSION_SECRET="a-different-random-secret-string"
supabase secrets set TURNSTILE_SECRET_KEY="your-cloudflare-secret-key"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available inside Edge Functions — you do not need to set those manually.

### Deploy Edge Functions

```bash
supabase functions deploy admin-action
supabase functions deploy submit-vote
supabase functions deploy submit-email
```

---

## Step 10: Build the Frontend

### File structure to create

```
src/
  App.jsx                      # Router
  main.jsx                     # React root
  index.css                    # Tailwind + brand colors
  lib/
    supabaseClient.js          # Supabase client + adminAction() helper
    localVotes.js              # localStorage session/vote tracking
  hooks/
    usePolls.js                # Fetch + Realtime subscription for polls
    useVoteCounts.js           # Fetch + Realtime subscription for vote counts
    useCountdown.js            # Per-second countdown from closes_at
  components/
    PollCard.jsx               # Fan-facing poll (voting + results)
    ResultsBar.jsx             # Animated vote percentage bars
    PasswordGate.jsx           # Admin login form
    AdminPollForm.jsx          # Create/edit poll form
    AdminPollList.jsx          # List of polls with controls
    MailingListSignup.jsx      # Fan email opt-in
    AdminMailingList.jsx       # Admin view of collected emails
  pages/
    FanPage.jsx                # Public voting page
    AdminPage.jsx              # Password-gated admin dashboard
public/
  img/
    YourLogo.png               # Your organization's logo
```

### `src/App.jsx`

```jsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import FanPage from './pages/FanPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<FanPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  )
}
```

**Why HashRouter?** GitHub Pages serves a static `index.html` and can't handle server-side routing. HashRouter puts the route in the URL hash (`/#/admin`) so the browser never makes a server request for it.

### `src/lib/supabaseClient.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let _adminToken = ''

export function clearAdminAuth() { _adminToken = '' }

export async function verifyAdminPassword(password) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { adminPassword: password, action: 'verify_admin' },
  })
  if (error) throw error
  if (!data?.adminToken) throw new Error('Admin token was not returned')
  _adminToken = data.adminToken
  return data
}

export async function submitVote(poll_id, option_id, session_id, turnstileToken) {
  const { data, error } = await supabase.functions.invoke('submit-vote', {
    body: { poll_id, option_id, session_id, turnstileToken },
  })
  if (error) throw error
  return data
}

export async function adminAction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { adminToken: _adminToken, action, payload },
  })
  if (error) throw error
  return data
}
```

### `src/lib/localVotes.js`

```js
const SESSION_KEY = 'vote_session_id'

const memStore = new Map()
function storageGet(key) {
  try { return localStorage.getItem(key) } catch { return memStore.get(key) ?? null }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value) } catch { memStore.set(key, value) }
}

export function getSessionId() {
  let id = storageGet(SESSION_KEY)
  if (!id) { id = crypto.randomUUID(); storageSet(SESSION_KEY, id) }
  return id
}

export function hasVoted(pollId, voteResetCount = 0) {
  return !!storageGet(`voted_${pollId}_${voteResetCount}`)
}

export function recordVote(pollId, voteResetCount = 0) {
  storageSet(`voted_${pollId}_${voteResetCount}`, '1')
}
```

---

## Step 11: Customization Checklist

These are the places that contain organization-specific copy. Search and replace them for each new client:

| Location | What to change |
|----------|---------------|
| `src/index.css` `@theme` block | Brand colors |
| `public/img/` | Logo image file |
| `src/pages/FanPage.jsx` | Logo `src` + `alt`, header subtitle text ("Live Fan Vote") |
| `src/pages/AdminPage.jsx` | Organization name in the admin header |
| `src/components/PasswordGate.jsx` | Logo `src` + `alt` |
| `src/components/MailingListSignup.jsx` | "LoCo Pro mailing list" copy |
| `src/components/AdminPollForm.jsx` | Poll type labels if you want to rename them |
| `src/components/PollCard.jsx` | Poll type badge labels (e.g., "Match Prediction" → your equivalent) |
| `index.html` | `<title>` tag |

**Poll types** — The four types (`prediction`, `favorite`, `custom`, `reaction`) are stored as strings in the database. You can display any labels you want in the UI without changing the schema. `reaction` specifically triggers the emoji-button layout; the other three all use the same list layout.

---

## Step 12: Environment Variables

### Local development

Create `.env.local` in the project root (never commit this file):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_TURNSTILE_SITE_KEY=your-cloudflare-site-key
```

Create `.env.example` with the same keys but no values (commit this):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
```

Add `.env.local` to `.gitignore`.

### GitHub Actions secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_TURNSTILE_SITE_KEY` | Your Cloudflare Turnstile site key |

The service role key and admin password are **never** added as GitHub secrets — they live only in Supabase Edge Function secrets.

---

## Step 13: GitHub Pages Deployment

### Enable GitHub Pages

In your GitHub repo → Settings → Pages:
- Source: **GitHub Actions** (not "Deploy from a branch")

### Create the workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_TURNSTILE_SITE_KEY: ${{ secrets.VITE_TURNSTILE_SITE_KEY }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Every push to `main` triggers a build and deploys to `https://YOUR_ORG.github.io/YOUR_REPO/`.

---

## Step 14: Add the Logo to Turnstile

Go back to Cloudflare Turnstile → your widget → edit, and add the final GitHub Pages URL now that you know it. This is required for the bot challenge to work in production.

---

## Step 15: Test Before the Event

Run locally:

```bash
npm run dev
```

Go through this checklist:

- [ ] Fan page loads at `http://localhost:5173/`
- [ ] Admin page loads at `http://localhost:5173/#/admin`
- [ ] Admin password login works
- [ ] Create a test poll, open it on the fan page
- [ ] Vote on the fan page — count updates in real time on another browser tab
- [ ] Vote a second time from the same browser — should be silently blocked
- [ ] Close the poll from admin — poll disappears from fan view (or shows final results if "Show Results" is on)
- [ ] Email signup works on fan page
- [ ] Admin mailing list view shows submitted emails
- [ ] Timer-based auto-close works (set a 30-second timer, watch it close)

---

## Event Day Operations

The admin dashboard lives at `https://YOUR_ORG.github.io/#/admin`.

**Typical poll flow:**
1. Create all polls before the event (they start as Closed)
2. When ready: tap **Open Voting** → optionally set a timer → **Open Now**
3. Display the fan URL (`https://YOUR_ORG.github.io/`) on a screen
4. Watch votes come in live
5. Tap **Close Voting** when done
6. Tap **Show Results** to reveal final results on the fan page
7. Use **Copy** to quickly duplicate a poll for the next match

**Reset:** If you need to re-run a poll (e.g., fans didn't hear the question), use **Edit → Reset Poll** to clear all votes. Fans can vote again; their browser session is cleared by incrementing a `vote_reset_count` counter in the database.

---

## Architecture Reference

```
Browser (fans)                Browser (admin)
     │                              │
     │  SELECT polls/options        │  POST /admin-action (Edge Function)
     │  INSERT votes (anon key)     │  { adminToken, action, payload }
     │  Realtime subscription       │
     ▼                              ▼
Supabase PostgreSQL ──── Edge Functions (Deno)
     │                   admin-action   submit-vote   submit-email
     │                        │              │
     │                   service key    Turnstile verify → service key
     │
vote_counts VIEW (aggregated, no individual rows exposed to anon)
```

**Security properties:**
- Service role key never leaves the server (Edge Functions only)
- Admin password verified server-side; only a short-lived HMAC token is cached in the browser
- Individual vote rows are never readable by the public (only aggregated counts via the view)
- One vote per browser enforced by `UNIQUE(poll_id, session_id)` at the database level
- Votes only accepted when poll `status = 'open'` and `closes_at > now()` (enforced in RLS policy)
- Bot protection on vote submission via Cloudflare Turnstile

---

## Frequently Asked Questions

**Can I skip Cloudflare Turnstile?**  
Yes. Remove the `<Turnstile>` widget from `PollCard.jsx`, remove the `cfToken` state and the `turnstileToken` argument from `submitVote()`, and remove the Turnstile verification block from the `submit-vote` Edge Function. Votes will then insert directly via the anon key and RLS. Without Turnstile, determined bots can stuff ballots using different session IDs, but for low-stakes live events this is often an acceptable trade-off.

**How do I run multiple events without mixing data?**  
The simplest approach is to delete or archive old polls after each event. If you need strict separation, create a separate Supabase project per event — each gets its own database and anon key.

**Can multiple admins log in at once?**  
Yes. The admin token is per-browser-session. Multiple tabs/devices with the same password can all manage polls simultaneously.

**What's the fan URL?**  
`https://YOUR_ORG.github.io/` (the root, no hash). Share this as a QR code. The admin page is `/#/admin` — don't put this in the QR code.

**How many concurrent voters can it handle?**  
Supabase free tier handles up to 500 concurrent Realtime connections and reasonable database load for a typical event (hundreds of voters). For thousands of concurrent voters, upgrade to a paid Supabase plan.
