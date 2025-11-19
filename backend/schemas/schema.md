# Database Schema

## 1. User Management

### 1.1 `Role`

**Purpose:** Fine-grained, extensible access control.

* **PK:** `role_id` (1, 2, or 3)
* **Attributes:**
  * `name` (e.g., `'civilian'`, `'responder'`, `'commander'`)
  * `description`


### 1.2 `User`

**Purpose:** Core account + high-level classification (civilian, responder, commander, admin).

* **PK:** `user_id`
* **FK:** `role_id` -> `Role`
* **Attributes:**
  * `phone_number`
  * `email`
  * `provider_id` (e.g., OAuth provider identifier)
  * `is_active`
  * `created_at`
  * `updated_at`
* **Location cache (for real-time map):**
  * `last_known_location` (Point / PostGIS)
  * `last_location_at` (timestamp)


### 1.3 `UserProfile` (PII)

**Purpose:** Personally identifiable info separated from login & medical data.

* **PK / FK:** `user_id` -> `User`
* **Attributes:**
  * `full_name`
  * `date_of_birth`
  * `address`
  * `emergency_contact_name`
  * `emergency_contact_phone`

> This table does *not* get joined when responders query limited medical info.


### 1.4 `UserMedicalProfile`

**Purpose:** Medical info accessible via a **user code** without exposing PII.

* **PK / FK:** `user_id` -> `User`
* **Attributes:**
  * `public_user_code` (short random code, **UNIQUE**)
  * `blood_group`
  * `known_allergies`
  * `chronic_conditions`
  * `current_medications`
  * `other_medical_notes`
  * `consent_flags` (JSON with fields like: `medic`, `police`, `firefighter`, `commander`)


---

## 2. Responder Management

### 2.1 `Team`

**Purpose:** Operational team each responder belongs to.

* **PK:** `team_id`
* **Attributes:**
  * `name` (e.g., “Fire Unit 5”)
  * `team_type` (`'medic' | 'fire' | 'police' | 'mixed' | 'disaster_response'`)
  * `commander_user_id` -> `User` (team commander / lead)
  * `status` (`'available' | 'deployed' | 'offline'`)
  * `created_at`


### 2.2 `ResponderProfile`

**Purpose:** Extra info only for users who are responders.

* **PK / FK:** `user_id` -> `User`
* **FK:** `team_id` -> `Team`
* **Attributes:**
  * `responder_type`
    * `'medic' | 'firefighter' | 'police' | 'disaster_responder' | 'logistician'`
  * `badge_number`
  * `government_id_number` (or reference to ID docs)
  * `qualifications` (text)
  * `created_by_commander_id` -> `User` (commander)
  * `created_at`
  * `status` (`'active' | 'suspended' | 'retired'`)
  * `team_joined_at` (nullable if not part of a team yet)

---

## 3. Incidents, Disasters & Tasks

### 3.1 `Incident`

**Purpose:** Initial report from a user, before being converted to a disaster.

* **PK:** `incident_id`
* **FK:** `reported_by_user_id` -> `User`
* **Attributes:**
  * `title`
  * `description`
  * `incident_type` (e.g., `'flood' | 'accident' | 'fire' | 'earthquake' | 'other'`)
  * `location` (Point – exact location, PostGIS)
  * `status` (`'open' | 'converted' | 'discarded'`)
  * `reported_at`
  * `updated_at`

> All commanders can see all **open** incidents.  
> When a commander converts an incident, its status becomes `'converted'` or `'discarded'`.


### 3.2 `IncidentMedia`

**Purpose:** Store media attached to incidents before they are converted to disasters.

* **PK:** `media_id`
* **FKs:**
  * `incident_id` -> `Incident`
  * `uploaded_by_user_id` -> `User`
* **Attributes:**
  * `file_type` (`'image' | 'video' | 'audio' | 'document'`)
  * `mime_type`
  * `storage_path`
  * `created_at`

### 3.3 `Disaster`

**Purpose:** Top-level event created by converting an incident.

* **PK:** `disaster_id`
* **FKs:**
  * `reported_by_user_id` -> `User` (original reporter, nullable if system-created)
  * `source_incident_id` -> `Incident` (nullable; set when converted from an incident)
  * `commander_user_id` -> `User` (the commander who converted/owns the disaster)
* **Key Attributes:**
  * `title`
    * For SOS, can be generic like “SOS – <timestamp>”.
  * `description`
  * `status`
    * `'active' | 'under_investigation' | 'ongoing' | 'contained' | 'resolved' | 'false_alarm'`
  * `disaster_type`
    * e.g., `'flood'`, `'fire'`, `'earthquake'`, optional at creation.
  * `severity_level`
    * `'low' | 'medium' | 'high' | 'critical'`
  * `estimated_injuries`
  * `estimated_casualties`
  * `location` (Point – exact location, PostGIS)
  * `affected_area` (Polygon – optional, PostGIS, if later expanded)
  * `reported_at`
  * `updated_at`
  * `resolved_at` (nullable)


### 3.4 `DisasterTask`

**Purpose:** Specific tasks within a disaster (e.g., send medics, send firefighters, logistics, etc.).

* **PK:** `task_id`
* **FKs:**
  * `disaster_id` -> `Disaster`
  * `created_by_commander_id` -> `User`
* **Attributes:**
  * `task_type`
    * e.g., `'medic' | 'fire' | 'police' | 'logistics' | 'search_rescue' | 'evacuation' | 'other'`
  * `description` (details of the task)
  * `status` (`'pending' | 'in_progress' | 'completed' | 'cancelled'`)
  * `priority` (e.g., integer or enum: `'low' | 'medium' | 'high'`)
  * `location` (Point – optional; staging coordinates)
  * `created_at`
  * `updated_at`


### 3.5 `DisasterTaskAssignment`

**Purpose:** Assign one or more teams to tasks within a disaster.

* **PK:** (`task_id`, `team_id`)
* **FKs:**
  * `task_id` -> `DisasterTask`
  * `team_id` -> `Team`
* **Attributes:**
  * `assigned_by_user_id` -> `User` (commander)
  * `assigned_at`
  * `status` (`'assigned' | 'en_route' | 'on_scene' | 'completed' | 'cancelled'`)
  * `eta` (optional)
  * `arrived_at` (optional)
  * `released_at` (optional)

> A team can have multiple tasks in the same or different disasters.  
> All members of teams assigned to any task in a disaster can **see** the disaster-wide chat (below).


---

## 4. Following, Questions, Logs, Media & Chat

### 4.1 `DisasterFollower`

**Purpose:** Track which users follow which disasters.

* **PK:** (`disaster_id`, `user_id`)
* **FKs:**
  * `disaster_id` -> `Disaster`
  * `user_id` -> `User`
* **Attributes:**
  * `followed_at`


### 4.2 `QuestionTemplate`

**Purpose:** Define the generic, reusable question set for all disasters.

* **PK:** `question_id`
* **Attributes:**
  * `key` (e.g., `'new_casualties'`, `'new_injuries'`, `'new_damage'`, `'medics_sufficient'`, `'firefighters_sufficient'`)
  * `question_text` (e.g., "Are there any new casualties reported?")
  * `answer_type` (e.g., `'boolean' | 'integer' | 'text' | 'choice'`)
  * `metadata` (JSON for things like options, help text, etc.)
  * `is_active` (whether this question is currently used)


### 4.3 `DisasterQuestionState`

**Purpose:** Store the **latest answer state** for each question in each disaster.

* **PK:** (`disaster_id`, `question_id`)
* **FKs:**
  * `disaster_id` -> `Disaster`
  * `question_id` -> `QuestionTemplate`
  * `last_answered_by_user_id` -> `User` (nullable)
* **Attributes:**
  * `last_answer_value` (text or JSON, depending on `answer_type`)
  * `last_answered_at` (timestamp)

> When a user is asked *one* question (instead of a full questionnaire), their answer:
> * Updates `DisasterQuestionState` (this table), and  
> * Triggers an entry in `DisasterLog` (see below) for audit and timeline.


### 4.4 `DisasterLog`

**Purpose:** Central, timestamped log of everything related to a disaster.

* **PK:** `log_id`
* **FKs:**
  * `disaster_id` -> `Disaster`
  * `created_by_user_id` -> `User` (nullable for webscraper/system)
* **Attributes:**
  * `source_type`
    * `'user_input' | 'tweet' | 'news_article' | 'sensor' | 'system' | 'question_answer'`
  * `title` (optional short summary)
  * `text_body` (free-form description)
  * `num_deaths`
  * `num_injuries`
  * `estimated_damage_cost`
  * `estimated_resource_cost`
  * `firefighter_required`
  * `medic_required`
  * `police_required`
  * `help_required`
  * `food_required_for_people` (estimate)
  * `created_at`

### 4.5 `DisasterMedia`

**Purpose:** Photos, videos, audio/voice notes linked to logs.

* **PK:** `media_id`
* **FKs:**
  * `log_id` -> `DisasterLog`
  * `uploaded_by_user_id` -> `User`
* **Attributes:**
  * `file_type` (`'image' | 'video' | 'audio' | 'document'`)
  * `mime_type`
  * `storage_path`
  * `created_at`


### 4.6 `DisasterChatMessage`

**Purpose:** Disaster-wide chat between assigned teams and the commander.

* **PK:** `message_id`
* **FKs:**
  * `disaster_id` -> `Disaster`
  * `sender_user_id` -> `User`
* **Attributes:**
  * `message_text`
  * `created_at`

---

## 5. Mapping & Real-time Tracking

### 5.1 `MapSite`

**Purpose:** Safe zones + critical infrastructure in one unified table.

* **PK:** `site_id`
* **Attributes:**
  * `name`
  * `site_type`
    * e.g. `'safe_zone' | 'hospital' | 'police_station' | 'shelter' | 'food_depot' | 'critical_infrastructure'`
  * `location` (Point – PostGIS)
  * `capacity` (nullable; relevant for shelters, safe zones)
  * `current_occupancy` (optional)
  * `status` (`'open' | 'full' | 'closed' | 'damaged'`)
  * `contact_phone` (optional)
  * `metadata` (JSON for extra info)


### 5.2 `UserLocationLog`

**Purpose:** High-frequency location logging for all users.

* **PK:** `location_log_id` (big serial)
* **FK:**
  * `user_id` -> `User`
* **Attributes:**
  * `location` (Point – PostGIS)
  * `logged_at` (timestamp)


---

## 6. Draft Reports

### 6.1 `DisasterReportDraft`

**Purpose:** Compiled data after a disaster is marked resolved, with versioning + PDF.

* **PK:** `report_id`
* **FKs:**
  * `disaster_id` → `Disaster`
  * `created_by_user_id` → `User` (commander / analyst)
* **Attributes:**
  * `version_number` (1, 2, 3, … per disaster)
  * `generated_at`
  * `status` (`'draft' | 'final'`)
  * **Summary fields:**
    * `disaster_name_snapshot` (copied from `Disaster` at time of generation)
    * `estimated_deaths`
    * `estimated_casualties`
    * `resources_used_summary` (text)
    * `damage_summary` (text)
  * `timeline_json`
    * JSON timeline of significant events: `[ { timestamp, description, log_id? }, ... ]`
  * `pdf_storage_path`
    * Path to generated PDF.
