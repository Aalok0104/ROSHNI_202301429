-- ROSHNI seed: promote two civilians to responders, create team, disaster, task, and assignment
-- Safe to run multiple times; uses upserts and WHERE NOT EXISTS guards.
-- Emails provided:
--  - 202301468@dau.ac.in  -> role: logistician
--  - bhaumikluhar2005@gmail.com -> role: medic

-- Notes:
-- - Adjust names if needed; this script queries by email.
-- - Team name: 'Alpha Response Team'
-- - Disaster title: 'Flood Response - Sector 7'
-- - Task: 'Evacuate Sector 7 residents'
-- - Requires pgcrypto for gen_random_uuid() if UUIDs needed; otherwise rely on DEFAULT uuid_generate_v4() if present.

BEGIN;

-- Ensure required extensions (optional; ignore errors if already exists)
DO $$ BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 1) Fetch user IDs by email
WITH usr AS (
  SELECT u.user_id, u.email
  FROM users u
  WHERE u.email IN ('202301468@dau.ac.in', 'bhaumikluhar2005@gmail.com')
),
logi AS (
  SELECT user_id FROM usr WHERE email = '202301468@dau.ac.in'
),
med AS (
  SELECT user_id FROM usr WHERE email = 'bhaumikluhar2005@gmail.com'
)
SELECT 1;

-- 2) Create team if not exists
INSERT INTO teams (team_id, team_name, status)
SELECT COALESCE((SELECT team_id FROM teams WHERE team_name = 'Alpha Response Team'), uuid_generate_v4()), 'Alpha Response Team', 'available'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE team_name = 'Alpha Response Team');

-- Capture team_id
WITH t AS (
  SELECT team_id FROM teams WHERE team_name = 'Alpha Response Team'
)
SELECT 1;

-- 3) Promote users to responders with specific roles
-- logistician profile for 202301468@dau.ac.in
INSERT INTO responder_profiles (profile_id, user_id, role, badge_number, team_id, status)
SELECT uuid_generate_v4(), (SELECT user_id FROM users WHERE email = '202301468@dau.ac.in'), 'logistician', NULL, (SELECT team_id FROM teams WHERE team_name = 'Alpha Response Team'), 'available'
WHERE NOT EXISTS (
  SELECT 1 FROM responder_profiles rp 
  WHERE rp.user_id = (SELECT user_id FROM users WHERE email = '202301468@dau.ac.in')
);

-- medic profile for bhaumikluhar2005@gmail.com
INSERT INTO responder_profiles (profile_id, user_id, role, badge_number, team_id, status)
SELECT uuid_generate_v4(), (SELECT user_id FROM users WHERE email = 'bhaumikluhar2005@gmail.com'), 'medic', NULL, (SELECT team_id FROM teams WHERE team_name = 'Alpha Response Team'), 'available'
WHERE NOT EXISTS (
  SELECT 1 FROM responder_profiles rp 
  WHERE rp.user_id = (SELECT user_id FROM users WHERE email = 'bhaumikluhar2005@gmail.com')
);

-- 4) Create disaster if not exists
INSERT INTO disasters (disaster_id, title, status, location, description)
SELECT COALESCE((SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active'), uuid_generate_v4()),
       'Flood Response - Sector 7', 'active', 'Sector 7', 'Flooding reported; immediate evacuation and relief required.'
WHERE NOT EXISTS (
  SELECT 1 FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active'
);

-- Capture disaster_id
WITH d AS (
  SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active'
)
SELECT 1;

-- 5) Create a task for the disaster if not exists
INSERT INTO disaster_tasks (task_id, disaster_id, title, description, status, priority)
SELECT COALESCE((SELECT task_id FROM disaster_tasks WHERE disaster_id = (SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active') AND title = 'Evacuate Sector 7 residents'), uuid_generate_v4()),
       (SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active'),
       'Evacuate Sector 7 residents',
       'Coordinate evacuation and provide medical assistance to affected residents.',
       'pending',
       'high'
WHERE NOT EXISTS (
  SELECT 1 FROM disaster_tasks WHERE disaster_id = (SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active') AND title = 'Evacuate Sector 7 residents'
);

-- 6) Assign the task to the team if not exists; set assignment status to en_route
INSERT INTO disaster_task_assignments (assignment_id, task_id, team_id, status)
SELECT uuid_generate_v4(),
       (SELECT task_id FROM disaster_tasks WHERE disaster_id = (SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active') AND title = 'Evacuate Sector 7 residents'),
       (SELECT team_id FROM teams WHERE team_name = 'Alpha Response Team'),
       'en_route'
WHERE NOT EXISTS (
  SELECT 1 FROM disaster_task_assignments a
  WHERE a.task_id = (SELECT task_id FROM disaster_tasks WHERE disaster_id = (SELECT disaster_id FROM disasters WHERE title = 'Flood Response - Sector 7' AND status = 'active') AND title = 'Evacuate Sector 7 residents')
);

COMMIT;

-- How to run (Windows PowerShell):
-- docker exec -e PGPASSWORD=Bhaumik01 roshni-db-1 psql -h 127.0.0.1 -U postgres -d roshni_db -f /schemas/seed_alpha_team.sql
