# Vote-Now — LoCo Pro Wrestling Live Fan Voting

Fan voting app for live events. Fans vote on their phones, results update in real-time for everyone in the room.

**Live site:** https://locoprowrestling.github.io/Vote-Now/
**Admin panel:** https://locoprowrestling.github.io/Vote-Now/#/admin

## Setup

### 1. Supabase Project

1. Create a new project named **Vote-Now** in your [Supabase dashboard](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Go to **Database → Replication** and enable Realtime for the `votes` and `polls` tables
4. Copy your **Project URL** and **anon key** from Settings → API
5. Copy your **service_role key** from Settings → API (keep this secret)

### 2. Local Development

```bash
cp .env.example .env.local
# Fill in your Supabase values and pick an admin password
npm install
npm run dev
```

Fan page: http://localhost:5173/Vote-Now/
Admin: http://localhost:5173/Vote-Now/#/admin

### 3. GitHub Deployment

Add these **repository secrets** in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `VITE_ADMIN_PASSWORD` | Password to access the admin panel |

Then enable **GitHub Pages** in repo Settings → Pages:
- Source: **Deploy from a branch**
- Branch: `gh-pages` / `/ (root)`

Push to `main` — GitHub Actions will build and deploy automatically.

## Usage

### Admin Panel

1. Go to `/#/admin` and enter your admin password
2. Click **+ New Poll** to create a poll (match prediction, fan favorite, custom, or emoji reaction)
3. Click **Open Voting** to make it live — it appears instantly on fans' phones
4. Watch votes roll in live
5. Click **Close Voting** when done

### Fan Page

Fans scan the QR code or go to the URL. Open polls appear automatically. After voting, they see live results update in real-time.

## Poll Types

| Type | Description |
|------|-------------|
| Match Prediction | Who will win? (before the match) |
| Fan Favorite | Vote for your MVP of the night |
| Custom | Any question with any options |
| Live Reaction | Emoji buttons (🔥 ❤️ 😐 👎) |
