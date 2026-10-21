-- ============================================================================
-- WSR Dashboard — demo/seed data
-- Run AFTER 0001_init.sql. Safe to re-run (uses ON CONFLICT DO NOTHING).
-- Note: this does NOT create login users — see README "Create demo users".
-- ============================================================================

-- 1) Teams -------------------------------------------------------------------
insert into teams (name, description) values
  ('Estimating', 'Estimation & delivery planning'),
  ('Procurement', 'Vendor and procurement engineering'),
  ('POD', 'Cross-functional product delivery pod')
on conflict (name) do nothing;

-- 2) Sub-teams (all under Estimating, per the original spec) ----------------
insert into sub_teams (team_id, name)
select t.id, s.name
from teams t
join (values ('Panda'), ('Avanger'), ('Appolo'), ('BDR')) as s(name) on true
where t.name = 'Estimating'
on conflict (team_id, name) do nothing;

-- 3) Sprints ------------------------------------------------------------------
insert into sprints (name, start_date, end_date, capacity, status) values
  ('Sprint 22', '2026-01-05', '2026-01-16', 320, 'Closed'),
  ('Sprint 23', '2026-01-19', '2026-01-30', 320, 'Completed'),
  ('Sprint 24', '2026-02-02', '2026-02-13', 320, 'Active')
on conflict (name) do nothing;

-- 4) Developers ---------------------------------------------------------------
-- 8 developers spread across Estimating (with sub-teams), Procurement, POD.
with t as (select id, name from teams),
     st as (select id, name, team_id from sub_teams)
insert into developers (name, email, team_id, sub_team_id, role, default_sprint_capacity, joining_date)
select v.name, v.email, t.id,
       st.id,
       v.role::developer_role,
       v.capacity,
       v.joining::date
from (values
  ('John Smith',    'john.smith@example.com',    'Estimating', 'Panda',   'Developer', 32, '2023-03-01'),
  ('Priya Nair',    'priya.nair@example.com',    'Estimating', 'Panda',   'QA',        32, '2023-06-15'),
  ('Miguel Santos', 'miguel.santos@example.com', 'Estimating', 'Avanger', 'Developer', 32, '2022-11-10'),
  ('Aisha Khan',    'aisha.khan@example.com',    'Estimating', 'Appolo',  'Developer', 32, '2024-01-08'),
  ('Tom Becker',    'tom.becker@example.com',    'Estimating', 'BDR',     'Lead',      32, '2021-09-20'),
  ('Wei Chen',      'wei.chen@example.com',      'Procurement', null,     'Developer', 40, '2023-02-14'),
  ('Sara Lopez',    'sara.lopez@example.com',    'Procurement', null,     'QA',        40, '2023-08-01'),
  ('David Owusu',   'david.owusu@example.com',   'POD',         null,     'Developer', 40, '2022-05-05')
) as v(name, email, team_name, sub_team_name, role, capacity, joining)
join t on t.name = v.team_name
left join st on st.name = v.sub_team_name and st.team_id = t.id
on conflict (email) do nothing;

-- 5) Sample WSR reports for Sprint 24 (the active sprint) --------------------
with sp as (select id from sprints where name = 'Sprint 24'),
     d as (select id, name, email, team_id, sub_team_id from developers)
insert into wsr_reports (
  sprint_id, developer_id, team_id, sub_team_id,
  sprint_capacity, reported_hours, leave_hours, leave_dates,
  stories_planned, stories_delivered, story_points_planned, story_points_delivered,
  qa_defects, uat_defects, highlights, blockers, comments, status
)
select sp.id, d.id, d.team_id, d.sub_team_id,
       v.capacity, v.reported, v.leave, v.leave_dates::date[],
       v.planned, v.delivered, v.pts_planned, v.pts_delivered,
       v.qa, v.uat, v.highlights, v.blockers, v.comments, 'Submitted'
from (values
  ('john.smith@example.com',    32, 30, 2, '{2026-02-11}', 5, 4, 25, 21, 1, 0,
    'Completed estimation automation stories.', 'Waiting for business confirmation.', ''),
  ('priya.nair@example.com',    32, 32, 0, '{}',           4, 4, 16, 16, 0, 0,
    'All QA cycles closed on time.', 'None', ''),
  ('miguel.santos@example.com', 32, 28, 4, '{2026-02-05,2026-02-06}', 5, 3, 20, 12, 2, 1,
    'Refactored the pricing rules engine.', 'Blocked on API spec review.', ''),
  ('aisha.khan@example.com',    32, 31, 1, '{2026-02-12}', 3, 3, 15, 15, 0, 0,
    'Delivered all planned stories early.', 'None', ''),
  ('tom.becker@example.com',    32, 32, 0, '{}',           4, 3, 22, 18, 1, 0,
    'Mentored new joiners on estimation model.', 'Awaiting infra provisioning.', ''),
  ('wei.chen@example.com',      40, 36, 4, '{2026-02-09}', 6, 5, 30, 24, 0, 1,
    'Vendor contract review completed.', 'None', ''),
  ('sara.lopez@example.com',    40, 40, 0, '{}',           5, 5, 20, 20, 0, 0,
    'Zero defects this sprint.', 'None', ''),
  ('david.owusu@example.com',   40, 34, 6, '{2026-02-10,2026-02-11,2026-02-12}', 4, 2, 18, 8, 3, 2,
    'Investigated production incident.', 'Waiting on 3rd-party API fix.', '')
) as v(email, capacity, reported, leave, leave_dates, planned, delivered, pts_planned, pts_delivered, qa, uat, highlights, blockers, comments)
join d on d.email = v.email
cross join sp
on conflict (developer_id, sprint_id) do nothing;
