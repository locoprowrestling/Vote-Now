-- Vote-Now: LoCo Pro Wrestling Live Fan Voting
-- Run this in the Supabase SQL Editor for your Vote-Now project

-- ============================================================
-- TABLES
-- ============================================================

create table polls (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  type         text not null default 'custom'
                 check (type in ('prediction', 'favorite', 'custom', 'reaction')),
  status       text not null default 'closed'
                 check (status in ('open', 'closed')),
  show_results boolean not null default false,
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

-- ============================================================
-- INDEXES
-- ============================================================

create index votes_poll_session on votes (poll_id, session_id);
create index votes_option_id    on votes (option_id);
create index options_poll_id    on options (poll_id);

-- ============================================================
-- VIEW (public vote counts, no individual vote exposure)
-- ============================================================

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

-- Allow anon to query the view (view runs as owner, so it can count votes
-- without exposing individual vote rows to the public)
grant select on vote_counts to anon;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table polls   enable row level security;
alter table options enable row level security;
alter table votes   enable row level security;

-- Public can read all polls and options
create policy "polls_select"   on polls   for select to anon using (true);
create policy "options_select" on options for select to anon using (true);

-- Public can insert votes (unique constraint enforces 1 per session per poll)
create policy "votes_insert" on votes for insert to anon with check (true);

-- ============================================================
-- EMAIL OPT-IN (one row per browser session)
-- ============================================================

create table voter_emails (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null unique,
  email        text not null,
  mailing_list boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table voter_emails enable row level security;

-- Fans can insert their email; individual rows are never exposed to anon
create policy "voter_emails_insert" on voter_emails for insert to anon with check (true);

grant insert on voter_emails to anon;

-- ============================================================
-- REALTIME
-- ============================================================
-- After running this SQL, go to:
--   Supabase Dashboard > Database > Replication
--   and enable Realtime for the "votes" and "polls" tables.
