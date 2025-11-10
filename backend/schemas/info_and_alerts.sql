-- 4.1. Safe Zones: Shelters, medical stations, etc. (FR 5.2)
CREATE TABLE safe_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- 'shelter', 'medical_aid_station', 'food_depot', 'safe_zone'
    location GEOMETRY(Point, 4326) NOT NULL,
    capacity INT,
    current_occupancy INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'full', 'closed'
    contact_phone VARCHAR(20)
);

-- 4.2. Information Feeds: Defines sources for the info feed (FR 3.1)
CREATE TABLE info_feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., 'NDMA Official', 'Twitter #GujaratFlood'
    source_type VARCHAR(50) NOT NULL, -- 'official', 'social_media', 'user_report', 'sensor'
    
    -- Key for FR 3.2: Tagging info as verified
    verification_status VARCHAR(50) DEFAULT 'verified' -- 'verified', 'unverified', 'pending_review'
);

-- 4.3. Info Messages: The actual content in the feed (FR 3.1)
CREATE TABLE info_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id INT NOT NULL REFERENCES info_feeds(id),
    content TEXT NOT NULL,
    source_url VARCHAR(2048), -- Link to original tweet, article, etc.
    -- Can be a general message or tied to a specific area
    affected_area GEOMETRY(Polygon, 4326),
    published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4. Alerts: High-priority, targeted alerts sent *by* the system (FR 6.1)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sent_by_user_id UUID REFERENCES users(id), -- The coordinator who sent it
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Key for FR 6.2: Severity-based notification
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    
    -- Key for FR 6.1: Targeted geographical area
    target_area GEOMETRY(Polygon, 4326) NOT NULL,
    
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5. Alert Recipients: Tracks who received an alert and how (FR 6.2)
CREATE TABLE alert_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_method VARCHAR(20), -- 'in_app_push', 'sms', 'automated_call'
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'read', 'acknowledged'
    status_updated_at TIMESTAMPTZ
);