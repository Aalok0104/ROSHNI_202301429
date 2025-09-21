# Functional Requirements

## 1. User & Access Management

### 1.1 User Registration
The system shall allow users (Civilians, Responders, Coordinators) to register with essential details (e.g., name, contact information, address, emergency contacts).

### 1.2 Role-Based Access Control (RBAC)
The system shall implement strict RBAC. Each user's interface and capabilities must be tailored to their role, showing only relevant information and functions to avoid overwhelming users and ensure data security.

**Elicitation Techniques:** This was identified through interviews and survey analysis. Users' willingness to share personal details for accurate alerts and concerns about privacy led to the user registration requirement. The need for RBAC and user-specific interfaces came from the principle of only showing relevant information to avoid overwhelming users and ensuring data security, as noted in the analysis of data from the provided interviews and surveys.

## 2. Civilian Distress Reporting & Interaction

### 2.1 SOS Alert
The system shall provide a prominent, single-press "SOS" button within the mobile application for civilians to instantly report an emergency and share their location.

### 2.2 Supplementary Distress Information
Upon activating the SOS, the system shall provide options for the user to submit additional context if they are able, including:
- Uploading photos or short videos.
- Recording a voice message.
- Typing a short text description.

### 2.3 Situational Questionnaires
The system shall be able to push short, simple questionnaires to users in an affected area to gather real-time, on-the-ground intelligence (e.g., "Is your road blocked?", "Do you have power?").

**Elicitation Techniques:** This was identified through interviews and surveys. Users explicitly requested a quick and easy way to report emergencies, mentioning an "SOS button" and the ability to upload photos or voice messages. The idea of situational questionnaires was a solution to a user's concern about low bandwidth and the desire for a simple, quick way to provide real-time updates without typing.

## 3. Information Dissemination & Real-Time Updates

### 3.1 Multi-Source Information Feed
The system must provide users with real-time updates on the disaster situation.

### 3.2 Source Verification & Tagging
The system must aggregate information from various feeds (e.g., official government alerts, news APIs, social media like Twitter). Crucially, each piece of information must be clearly tagged with its source (e.g., "Verified Official," "User Report," "Social Media") so users can assess its legitimacy.

**Elicitation Techniques:** This was identified through interviews and document analysis. The need for a multi-source feed and source verification came directly from user concerns about "fake news" and their desire to see the source of information to assess its legitimacy. The concept of real-time updates aligns with the NDMA's and Ushahidi's goal of providing up-to-date situational awareness.

## 4. Command & Control Dashboard

### 4.1 Situational Awareness View
Incident Commanders shall have access to a dashboard providing a real-time, holistic view of the disaster, including:
- The type and severity of the event.
- Geographic locations of incidents and affected zones.
- Real-time locations of deployed responder teams.
- Aggregated counts of civilians in need, based on SOS calls and reports.

### 4.2 Resource Allocation
The dashboard must allow commanders to view and manage the allocation of resources to specific incidents or areas.

**Elicitation Techniques:** This was identified through interviews with officials and document analysis. The requirement for a real-time, holistic dashboard came from Incident Commanders' need to maintain situational awareness and make strategic decisions. The ability to view deployed teams and resources directly addresses the "bottlenecks" and "pain points" of coordination and resourcefulness mentioned in the GIDM and NDMA documents.

## 5. Mapping & Visualization

### 5.1 Interactive Map for All Users
The system must provide an interactive map interface, with layers that can be toggled based on user role.

### 5.2 Civilian Map Features
Civilians must be able to view:
- Locations of official emergency shelters, medical aid stations, and designated safe zones.
- The location of registered family members (with privacy consent).
- Estimated Time of Arrival (ETA) for dispatched emergency responders heading to their vicinity.

### 5.3 Commander Map Features
Commanders will see all civilian features plus the real-time GPS locations of all active responders and resources.

**Elicitation Techniques:** This was identified through interviews with both civilians and officials. Civilians expressed a need for a map showing shelters, safe zones, and family members. The need for displaying responder locations and ETAs was also mentioned, with the caveat of avoiding a cluttered interface. The concept of toggleable layers is a standard design approach, which was an inference from the user-specific needs identified during the interviews.

## 6. Alerting & Notification System

### 6.1 Multi-Modal Alerts
The system must generate and send high-priority alerts to users in targeted geographical areas.

### 6.2 Severity-Based Notification
The delivery method shall correspond to the severity of the alert:
- **High Severity:** A persistent, loud in-app alarm that overrides silent mode, potentially accompanied by an automated phone call.
- **Medium Severity:** A standard push notification and an SMS message.
- **Low Severity:** A standard in-app notification.

**Elicitation Techniques:** This was identified through interviews with civilians. Users explicitly detailed their preferences for notification methods, such as "loud SMS or government type alert" that needs dismissal. The idea of a severity-based system is a direct response to a user's suggestion of an "SOS alarm, that can only be switched off with a power button" for high-priority alerts.

## 7. AI & Machine Learning Modules

### 7.1 Automated Disaster Detection
The system shall be capable of ingesting and processing real-time data streams (e.g., seismographic data, satellite imagery feeds, meteorological APIs) using pre-trained ML models to automatically detect potential disasters and alert Incident Commanders.

### 7.2 Automated Speech Recognition (ASR)
All voice communications made through the system (e.g., voice distress calls, responder communications) must be automatically transcribed to text, timestamped, and logged for archival and analysis.

### 7.3 Automated Triage Support
The system shall use information from distress calls (keywords from text/voice, user survey inputs) to perform a preliminary digital triage, classifying incidents into severity levels (e.g., Red/Yellow/Green) to help prioritize responder dispatch.

**Elicitation Techniques:** This was identified through document analysis and interviews with officials. The idea of a digital triage system was proposed by a medical doctor. The use of AI and ML models for this purpose is supported by the academic review on using AI for triage in emergency departments. The idea of using ASR and other data streams for automated detection and analysis is an inference from the NDMA's and Ushahidi's focus on structured data and real-time situational awareness.

## 8. Data Logging & Reporting

### 8.1 Comprehensive Event Logging
The system must log all incoming and outgoing data with immutable timestamps. This includes user reports, alerts sent, responder movements, commander decisions, and automated system events.

### 8.2 Role-Specific Report Generation
The system must be capable of generating distinct post-disaster summary reports for different stakeholders:
- **For Commanders:** Detailed operational reports focusing on response times, resource allocation effectiveness, communication bottlenecks, and suggestions for future planning.
- **For Civilians:** Public-facing summaries covering the scope of the event, total rescue efforts, casualty information (as appropriate), and resources available for recovery.
- **For Responders:** Tactical reports detailing their team's actions, areas covered, and outcomes of their rescue efforts.

**Elicitation Techniques:** This was identified through interviews and document analysis. The need for comprehensive event logging and reporting is a core requirement for compliance and accountability under the GDPR, HIPAA, and NDMA's IRS guidelines. The requirement for role-specific reports, such as the "One-Pager Report" for commanders, came directly from an interview with Piyush Ramteke.
