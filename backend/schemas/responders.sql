-- 3.1. Responder Teams: A group of responders (e.g., "Fire Unit 5")
CREATE TABLE responder_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Links to a user with a responder role
    team_type VARCHAR(50), -- 'fire', 'medical', 'police', 'search_rescue'
    status VARCHAR(50) DEFAULT 'available' -- 'available', 'dispatched', 'on_scene', 'returning', 'out_of_service'
);

-- 3.2. Team Members: Links users (responders) to a team
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES responder_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- 3.3. Resource Types: Defines *categories* of equipment
CREATE TABLE resource_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'Ambulance', 'Fire Truck', 'BLS Kit'
    capabilities JSONB -- e.g., {"transport_capacity": 2, "water_liters": 5000}
);

-- 3.4. Resource Inventory: Specific, trackable *instances* of resources
CREATE TABLE resource_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id INT NOT NULL REFERENCES resource_types(id),
    -- A human-readable identifier, e.g., vehicle plate 'GJ-01-ER-1234'
    identifier VARCHAR(100) UNIQUE, 
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'in_use', 'maintenance'
    
    -- Real-time location of the resource (e.g., from a vehicle's GPS)
    current_location GEOMETRY(Point, 4326),
    last_location_update TIMESTAMPTZ
);

-- 3.5. Resource Allocations: The "dispatch" log. Links teams/resources to incidents (FR 4.2)
CREATE TABLE resource_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    -- Can dispatch a whole team or a single resource
    team_id UUID REFERENCES responder_teams(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resource_inventory(id) ON DELETE SET NULL,
    
    dispatched_by_user_id UUID REFERENCES users(id), -- The coordinator who sent them
    
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'en_route', 'on_scene', 'completed', 'cancelled'
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    -- Estimated time of arrival (for FR 5.2)
    eta TIMESTAMPTZ,
    -- Time they arrived
    arrived_at TIMESTAMPTZ,
    -- Time they were released from this incident
    released_at TIMESTAMPTZ
);