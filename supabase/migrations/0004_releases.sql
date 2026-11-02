-- Release Planner and Deployment Calendar

create table if not exists releases (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(trim(title)) between 1 and 120),
  description    text check (description is null or char_length(description) <= 1000),
  environment    text not null check (environment in ('PPD', 'Prod')),
  pod            text not null check (pod in ('Panda', 'Avenger', 'Apollo')),
  scheduled_date date not null,
  scheduled_time time not null,
  status         text not null default 'Planned'
                   check (status in ('Planned', 'In Progress', 'Completed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_releases_scheduled_date
  on releases (scheduled_date);
create index if not exists idx_releases_environment_date
  on releases (environment, scheduled_date);
create index if not exists idx_releases_pod
  on releases (pod);
create index if not exists idx_releases_status
  on releases (status);

drop trigger if exists trg_releases_updated_at on releases;
create trigger trg_releases_updated_at
  before update on releases
  for each row execute function set_updated_at();

alter table releases enable row level security;

drop policy if exists releases_select on releases;
create policy releases_select on releases for select
  using (auth.uid() is not null);

drop policy if exists releases_insert on releases;
create policy releases_insert on releases for insert
  with check (current_role_name() in ('ADMIN', 'MANAGER'));

drop policy if exists releases_update on releases;
create policy releases_update on releases for update
  using (current_role_name() in ('ADMIN', 'MANAGER'))
  with check (current_role_name() in ('ADMIN', 'MANAGER'));

drop policy if exists releases_delete on releases;
create policy releases_delete on releases for delete
  using (current_role_name() in ('ADMIN', 'MANAGER'));

grant select on releases to authenticated;
grant insert, update, delete on releases to authenticated;