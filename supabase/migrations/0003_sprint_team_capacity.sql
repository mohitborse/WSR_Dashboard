-- Add team-level capacities for sprints
create table if not exists sprint_team_capacities (
  id        uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints (id) on delete cascade,
  team_id   uuid not null references teams (id) on delete restrict,
  capacity  numeric not null default 0 check (capacity >= 0),
  unique (sprint_id, team_id)
);

create index if not exists idx_sprint_team_capacities_sprint_id on sprint_team_capacities (sprint_id);
create index if not exists idx_sprint_team_capacities_team_id on sprint_team_capacities (team_id);

-- audit trigger
drop trigger if exists trg_audit_sprint_team_capacities on sprint_team_capacities;
create trigger trg_audit_sprint_team_capacities after insert or update or delete on sprint_team_capacities
  for each row execute function write_audit_log();
