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

------------------------------------------------------------
-- 2. Seed a Commander User "admin" with public code AAAAAA
------------------------------------------------------------
WITH new_user AS (
    INSERT INTO users (
        role_id,
        phone_number,
        email,
        provider_id,
        is_active
    )
    VALUES (
        3,                          -- commander
        '+910000000000',            -- test phone
        'admin@example.com',        -- test email
        NULL,
        TRUE
    )
    RETURNING user_id
),
profile_insert AS (
    INSERT INTO user_profiles (
        user_id,
        full_name,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone
    )
    SELECT
        user_id,
        'Admin',                    -- full_name
        NULL,                       -- date_of_birth
        'Test Address',             -- address
        NULL,                       -- emergency_contact_name
        NULL                        -- emergency_contact_phone
    FROM new_user
    RETURNING user_id
)
INSERT INTO user_medical_profiles (
    user_id,
    public_user_code,
    blood_group,
    known_allergies,
    chronic_conditions,
    current_medications,
    other_medical_notes,
    consent_flags
)
SELECT
    user_id,
    'AAAAAA',                      -- public_user_code for testing
    'O+',                          -- blood_group (example)
    NULL,                          -- known_allergies
    NULL,                          -- chronic_conditions
    NULL,                          -- current_medications
    'Test admin medical profile',  -- other_medical_notes
    '{"medic": true, "police": true, "firefighter": true, "commander": true}'::jsonb
FROM profile_insert;

------------------------------------------------------------
-- 3. Seed Question Templates
------------------------------------------------------------
-- These are generic, reusable questions for all disasters.

INSERT INTO question_templates (question_id, key, question_text, answer_type, metadata)
VALUES
    (
        uuid_generate_v4(),
        'new_casualties',
        'Are there any new casualties reported?',
        'integer',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'new_injuries',
        'Are there any new injuries reported?',
        'integer',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'new_damage',
        'Is there any new reported damage?',
        'text',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'medics_sufficient',
        'Is the number of medics sufficient?',
        'boolean',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'helpers_sufficient',
        'Is the number of helpers/volunteers sufficient?',
        'boolean',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'firefighters_sufficient',
        'Is the number of firefighters sufficient?',
        'boolean',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'police_sufficient',
        'Is the number of police personnel sufficient?',
        'boolean',
        '{}'::jsonb
    ),
    (
        uuid_generate_v4(),
        'food_sufficient',
        'Is the available food supply sufficient?',
        'boolean',
        '{}'::jsonb
    )
ON CONFLICT (key) DO NOTHING;
