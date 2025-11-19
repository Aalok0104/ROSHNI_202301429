-- Initialize PostgreSQL extensions required for the application
-- This file runs before other initialization scripts

-- Enable UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data types
CREATE EXTENSION IF NOT EXISTS postgis;
