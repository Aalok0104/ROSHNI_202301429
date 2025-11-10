-- 5.1. Questionnaires: Templates for situational questions (FR 2.3)
CREATE TABLE questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2. Questionnaire Questions: The questions within a questionnaire
CREATE TABLE questionnaire_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50), -- 'yes_no', 'multiple_choice', 'text'
    options JSONB, -- For multiple_choice, e.g., ["Yes, road is blocked", "No, road is clear"]
    display_order INT
);

-- 5.3. Questionnaire Pushes: Logs when a questionnaire is sent to an area
CREATE TABLE questionnaire_pushes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id),
    pushed_by_user_id UUID NOT NULL REFERENCES users(id),
    target_area GEOMETRY(Polygon, 4326) NOT NULL,
    pushed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4. Questionnaire Responses: Answers from civilians (FR 2.3)
CREATE TABLE questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Links to the *specific push* and *question*
    push_id UUID NOT NULL REFERENCES questionnaire_pushes(id),
    question_id UUID NOT NULL REFERENCES questionnaire_questions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    response TEXT NOT NULL,
    -- Location *where* the user was when they answered
    response_location GEOMETRY(Point, 4326),
    responded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.5. User Location Log: High-frequency log of user locations (FR 5.3)
-- WARNING: This table will be VERY large. It requires partitioning.
CREATE TABLE user_location_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);
-- Note: You would then create partitions, e.g., one for each day.

-- 5.6. Compliance Audit Log: CRITICAL for HIPAA/GDPR (FR 8.1, NFR 2.3)
-- Logs EVERY sensitive data access.
CREATE TABLE compliance_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    -- The user who performed the action (NULL if system action)
    user_id UUID REFERENCES users(id), 
    
    action VARCHAR(100) NOT NULL, -- e.g., 'READ_MEDICAL_INFO', 'UPDATE_PRIVACY', 'VIEW_FAMILY_LOCATION'
    
    -- The user whose data was accessed
    target_user_id UUID REFERENCES users(id), 
    -- Or the entity that was accessed
    target_entity_type VARCHAR(50), -- e.g., 'incident', 'user_profile'
    target_entity_id UUID,
    
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- What changed (optional, but good for auditing)
    changes_made JSONB 
);

-- 5.7. Generated Reports: Stores the output of post-disaster reports (FR 8.2)
CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_by_user_id UUID NOT NULL REFERENCES users(id),
    report_type VARCHAR(50), -- 'operational', 'public_summary', 'tactical'
    -- Can be a JSON blob of data or a path to a generated PDF in object storage
    storage_path VARCHAR(1024),
    data_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
