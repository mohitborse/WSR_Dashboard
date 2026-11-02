-- Database-managed Release Planner dropdown options.

create table if not exists release_environments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(trim(name)) between 1 and 50),
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists release_statuses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(trim(name)) between 1 and 50),
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into release_environments (name, sort_order) values ('PPD', 10), ('Prod', 20)
on conflict (name) do update set sort_order = excluded.sort_order;

insert into release_statuses (name, sort_order) values ('Planned', 10), ('In Progress', 20), ('Completed', 30)
on conflict (name) do update set sort_order = excluded.sort_order;

alter table releases drop constraint if exists releases_environment_check;
alter table releases drop constraint if exists releases_pod_check;
alter table releases drop constraint if exists releases_status_check;

alter table releases
  add constraint releases_environment_fkey foreign key (environment) references release_environments (name),
  add constraint releases_status_fkey foreign key (status) references release_statuses (name);

drop trigger if exists trg_release_environments_updated_at on release_environments;
create trigger trg_release_environments_updated_at before update on release_environments
  for each row execute function set_updated_at();
drop trigger if exists trg_release_statuses_updated_at on release_statuses;
create trigger trg_release_statuses_updated_at before update on release_statuses
  for each row execute function set_updated_at();

alter table release_environments enable row level security;
alter table release_statuses enable row level security;

create policy release_environments_select on release_environments for select using (auth.uid() is not null);
create policy release_environments_write on release_environments for all
  using (current_role_name() = 'ADMIN') with check (current_role_name() = 'ADMIN');
create policy release_statuses_select on release_statuses for select using (auth.uid() is not null);
create policy release_statuses_write on release_statuses for all
  using (current_role_name() = 'ADMIN') with check (current_role_name() = 'ADMIN');

grant select on release_environments, release_statuses to authenticated;
grant insert, update, delete on release_environments, release_statuses to authenticated;