-- Creator Studio private-pilot schema.
-- Apply this migration only to the dedicated Supabase pilot project.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.pilot_invites (
  email text primary key check (email = lower(email)),
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  niche text not null default '',
  audience text not null default '',
  tone text not null default '',
  goal text not null default '',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  platform text not null default 'shorts' check (platform in ('shorts', 'reels', 'tiktok')),
  duration_seconds integer not null default 30 check (duration_seconds in (15, 30, 45, 60)),
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'ready', 'approved', 'error')),
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text', 'script', 'srt')),
  filename text,
  content text not null check (char_length(content) between 1 and 25000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.youtube_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_title text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_ids uuid[] not null default '{}',
  model text not null default 'openai/gpt-5.6-luna',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  result jsonb,
  error_code text,
  feedback text check (feedback in ('accepted', 'edited', 'not_a_fit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid references public.analysis_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  created_at timestamptz not null default now()
);

-- These tables are intentionally in public so serverless functions can query
-- them through Supabase's REST client. They are inaccessible to browser roles:
-- RLS is enabled, no browser policy exists, and all browser grants are revoked.
create table public.oauth_connections_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider = 'youtube'),
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  access_token_expires_at timestamptz,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.youtube_oauth_states_private (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index projects_user_id_created_at_idx on public.projects (user_id, created_at desc);
create index sources_project_id_created_at_idx on public.sources (project_id, created_at asc);
create index youtube_snapshots_project_id_synced_at_idx on public.youtube_snapshots (project_id, synced_at desc);
create index analysis_runs_project_id_created_at_idx on public.analysis_runs (project_id, created_at desc);
create index usage_events_user_id_created_at_idx on public.usage_events (user_id, created_at desc);
create index youtube_oauth_states_expires_at_idx on public.youtube_oauth_states_private (expires_at);

create function public.enforce_project_source_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.sources where project_id = new.project_id) >= 3 then
    raise exception 'A project can contain at most three text sources';
  end if;
  return new;
end;
$$;

create trigger sources_limit_before_insert
  before insert on public.sources
  for each row execute function public.enforce_project_source_limit();

revoke all on function public.enforce_project_source_limit() from public;

create function public.is_active_pilot_invite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pilot_invites
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_active = true
  );
$$;

revoke all on function public.is_active_pilot_invite() from public;
grant execute on function public.is_active_pilot_invite() to authenticated;

alter table public.pilot_invites enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.sources enable row level security;
alter table public.youtube_snapshots enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.usage_events enable row level security;
alter table public.oauth_connections_private enable row level security;
alter table public.youtube_oauth_states_private enable row level security;

create policy "profile owners can read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "profile owners can create their profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "profile owners can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()))
  with check ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "profile owners can delete their profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

create policy "project owners can read projects"
  on public.projects for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "project owners can create projects"
  on public.projects for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "project owners can update projects"
  on public.projects for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()))
  with check ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "project owners can delete projects"
  on public.projects for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

create policy "source owners can read sources"
  on public.sources for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "source owners can create sources for their project"
  on public.sources for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.is_active_pilot_invite())
    and exists (
      select 1 from public.projects
      where projects.id = sources.project_id and projects.user_id = (select auth.uid())
    )
  );
create policy "source owners can update sources"
  on public.sources for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()))
  with check (
    (select auth.uid()) = user_id
    and (select public.is_active_pilot_invite())
    and exists (
      select 1 from public.projects
      where projects.id = sources.project_id and projects.user_id = (select auth.uid())
    )
  );
create policy "source owners can delete sources"
  on public.sources for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

create policy "snapshot owners can read snapshots"
  on public.youtube_snapshots for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

create policy "analysis owners can read analysis runs"
  on public.analysis_runs for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "analysis owners can update their feedback and result"
  on public.analysis_runs for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()))
  with check ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));
create policy "analysis owners can delete analysis runs"
  on public.analysis_runs for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

create policy "usage owners can read usage events"
  on public.usage_events for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_pilot_invite()));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.sources to authenticated;
grant select on public.youtube_snapshots to authenticated;
grant select, delete on public.analysis_runs to authenticated;
grant update (result, feedback, updated_at) on public.analysis_runs to authenticated;
grant select on public.usage_events to authenticated;

revoke all on table public.pilot_invites from anon, authenticated;
revoke all on table public.oauth_connections_private from anon, authenticated;
revoke all on table public.youtube_oauth_states_private from anon, authenticated;
