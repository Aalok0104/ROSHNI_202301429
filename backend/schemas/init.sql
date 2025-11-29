-- ============================================================
-- Seed data for roles, admin commander user, and question templates
-- Assumes all tables from the previous DDL already exist.
-- ============================================================

------------------------------------------------------------
-- 1. Seed Roles
------------------------------------------------------------
INSERT INTO roles (role_id, name, description) VALUES
    (1, 'civilian',  'Regular civilian user'),
    (2, 'responder', 'Approved responder'),
    (3, 'commander', 'Commander / administrator')
ON CONFLICT (role_id) DO NOTHING;

