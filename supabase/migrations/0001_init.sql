-- ============================================================================
-- WSR Dashboard — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. profiles  (1:1 with auth.users, carries app role)
-- ----------------------------------------------------------------------------
create type user_role as enum ('ADMIN', 'MANAGER', 'VIEWER');

create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  role        user_role not null default 'VIEWER',
  team_id     uuid,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'VIEWER'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. teams / sub_teams
-- ----------------------------------------------------------------------------
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists sub_teams (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams (id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

alter table profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references teams (id) on delete set null;

create index if not exists idx_sub_teams_team_id on sub_teams (team_id);

-- ----------------------------------------------------------------------------
-- 3. developers
-- ----------------------------------------------------------------------------
create type developer_role as enum ('Developer', 'QA', 'Lead', 'Manager');

create table if not exists developers (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  email                    text not null unique,
  team_id                  uuid not null references teams (id) on delete restrict,
  sub_team_id              uuid references sub_teams (id) on delete set null,
  role                     developer_role not null default 'Developer',
  active                   boolean not null default true,
  default_sprint_capacity  numeric not null default 40 check (default_sprint_capacity >= 0),
  joining_date             date,
  manager_id               uuid references developers (id) on delete set null,
  created_at               timestamptz not null default now()
);

create index if not exists idx_developers_team_id on developers (team_id);
create index if not exists idx_developers_sub_team_id on developers (sub_team_id);

-- ----------------------------------------------------------------------------
-- 4. sprints
-- ----------------------------------------------------------------------------
create type sprint_status as enum ('Planned', 'Active', 'Completed', 'Closed');

create table if not exists sprints (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  start_date date not null,
  end_date   date not null,
  capacity   numeric not null default 0 check (capacity >= 0),
  status     sprint_status not null default 'Planned',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 5. wsr_reports  (the core weekly/sprint status record)
-- ----------------------------------------------------------------------------
create type wsr_status as enum ('Draft', 'Submitted');

create table if not exists wsr_reports (
  id                     uuid primary key default gen_random_uuid(),
  sprint_id              uuid not null references sprints (id) on delete cascade,
  developer_id           uuid not null references developers (id) on delete cascade,
  team_id                uuid not null references teams (id) on delete restrict,
  sub_team_id            uuid references sub_teams (id) on delete set null,

  sprint_capacity        numeric not null default 0 check (sprint_capacity >= 0),
  reported_hours         numeric not null default 0 check (reported_hours >= 0),
  leave_hours            numeric not null default 0 check (leave_hours >= 0),
  leave_dates            date[] not null default '{}',

  stories_planned        integer not null default 0 check (stories_planned >= 0),
  stories_delivered      integer not null default 0 check (stories_delivered >= 0),

  story_points_planned   numeric not null default 0 check (story_points_planned >= 0),
  story_points_delivered numeric not null default 0 check (story_points_delivered >= 0),

  qa_defects             integer not null default 0 check (qa_defects >= 0),
  uat_defects            integer not null default 0 check (uat_defects >= 0),

  highlights             text,
  blockers               text,
  comments               text,

  status                 wsr_status not null default 'Draft',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references profiles (id) on delete set null,

  -- one WSR record per developer per sprint (upsert target for the form)
  unique (developer_id, sprint_id)
);

create index if not exists idx_wsr_sprint_id on wsr_reports (sprint_id);
create index if not exists idx_wsr_developer_id on wsr_reports (developer_id);
create index if not exists idx_wsr_team_id on wsr_reports (team_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wsr_updated_at on wsr_reports;
create trigger trg_wsr_updated_at
  before update on wsr_reports
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. audit_logs  (auto-populated for every insert/update/delete on key tables)
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete set null,
  action     text not null,       -- INSERT / UPDATE / DELETE
  entity     text not null,       -- table name
  entity_id  uuid,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);

create or replace function write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce((new).id, (old).id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_teams on teams;
create trigger trg_audit_teams after insert or update or delete on teams
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_sub_teams on sub_teams;
create trigger trg_audit_sub_teams after insert or update or delete on sub_teams
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_developers on developers;
create trigger trg_audit_developers after insert or update or delete on developers
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_sprints on sprints;
create trigger trg_audit_sprints after insert or update or delete on sprints
  for each row execute function write_audit_log();

drop trigger if exists trg_audit_wsr_reports on wsr_reports;
create trigger trg_audit_wsr_reports after insert or update or delete on wsr_reports
  for each row execute function write_audit_log();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles     enable row level security;
alter table teams        enable row level security;
alter table sub_teams    enable row level security;
alter table developers   enable row level security;
alter table sprints      enable row level security;
alter table wsr_reports  enable row level security;
alter table audit_logs   enable row level security;

-- Helper: current user's role, read once per statement.
create or replace function current_role_name()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- profiles: everyone can read all profiles (needed for name lookups / avatars);
-- a user can update their own row; only admins can change anyone's role.
create policy profiles_select_all on profiles for select using (true);
create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_admin_all on profiles for all
  using (current_role_name() = 'ADMIN')
  with check (current_role_name() = 'ADMIN');

-- master data: any authenticated user can read; only ADMIN can write.
create policy teams_select on teams for select using (auth.uid() is not null);
create policy teams_write on teams for all
  using (current_role_name() = 'ADMIN')
  with check (current_role_name() = 'ADMIN');

create policy sub_teams_select on sub_teams for select using (auth.uid() is not null);
create policy sub_teams_write on sub_teams for all
  using (current_role_name() = 'ADMIN')
  with check (current_role_name() = 'ADMIN');

create policy developers_select on developers for select using (auth.uid() is not null);
create policy developers_write on developers for all
  using (current_role_name() = 'ADMIN')
  with check (current_role_name() = 'ADMIN');

create policy sprints_select on sprints for select using (auth.uid() is not null);
create policy sprints_write on sprints for all
  using (current_role_name() = 'ADMIN')
  with check (current_role_name() = 'ADMIN');

-- wsr_reports: any authenticated user can read (dashboard/reports);
-- ADMIN and MANAGER can write; VIEWER is read-only.
create policy wsr_select on wsr_reports for select using (auth.uid() is not null);
create policy wsr_write on wsr_reports for all
  using (current_role_name() in ('ADMIN', 'MANAGER'))
  with check (current_role_name() in ('ADMIN', 'MANAGER'));

-- audit_logs: read-only, ADMIN only. Writes only happen via the trigger
-- function above (security definer), never directly from the client.
create policy audit_select_admin on audit_logs for select
  using (current_role_name() = 'ADMIN');
