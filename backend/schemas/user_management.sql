-- Enable PostGIS and UUID extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1.1. Roles: Defines the *types* of users (Civilian, Medic, Coordinator, etc.)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'civilian', 'medic', 'firefighter', 'coordinator', 'admin'
    description TEXT
);

-- 1.2. Users: The core user account, used for authentication.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE, -- For SMS alerts / login
    email VARCHAR(255) UNIQUE,       -- For email login / recovery
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3. User Profiles: Stores all non-auth, personal, and potentially sensitive info.
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    address TEXT,
    date_of_birth DATE, -- Can be considered PHI/PII
    
    -- This JSONB field is CRITICAL for privacy (FR 1.1, NFR 2.5)
    -- It stores user-defined preferences for data collection.
    -- Example: {"allow_location_tracking": true, "share_medical_info": false, "track_family": true}
    privacy_settings JSONB DEFAULT '{}',
    
    -- Stores medical info, explicitly protected by HIPAA.
    -- This data should ONLY be loaded if privacy_settings allows and the
    -- accessor (e.g., a medic) has the correct permissions.
    medical_info JSONB DEFAULT '{}', -- e.g., {"blood_type": "O+", "allergies": "penicillin"}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4. User Roles Mapping: Links a user to one or more roles.
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 1.5. Emergency Contacts: For civilians (FR 1.1)
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    relationship VARCHAR(100), -- e.g., 'Spouse', 'Parent'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6. Family Links: For tracking family members on the map (FR 5.2)
CREATE TABLE user_family_links (
    requestor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Status handles the consent mechanism required for privacy
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
    relationship VARCHAR(100),
    CHECK (requestor_user_id != requested_user_id),
    PRIMARY KEY (requestor_user_id, requested_user_id)
);