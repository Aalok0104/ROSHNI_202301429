# User Stories

---

## Civilian Account Creation
**Front:**  
As a civilian, I want to create an account using my phone number and a password, so that I can access the app's public features.

**Back:**  
- **Success:** A new user account is created with the "Civilian" role.  
- **Failure:** The registration fails due to an invalid phone number or server error.  

**Acceptance Criteria:**  
- The user enters a valid phone number.  
- The system sends a one-time password (OTP) to verify the number.  
- Upon successful verification, the account is created and the user is logged in.  

---

## Responder/Official Account Request
**Front:**  
As a first responder, I want to request an official account by submitting my name, agency ID, and contact details, so that I can be verified for access to restricted features.

**Back:**  
- **Success:** The user's application is submitted and placed in a pending approval queue.  
- **Failure:** The form has validation errors and cannot be submitted.  

**Acceptance Criteria:**  
- The registration form includes fields for Name, Agency, and Agency ID.  
- On submission, a new user account is created with a "Pending Verification" status.  
- The user receives a confirmation that their request is under review.  

---

## Admin Review of Pending Accounts
**Front:**  
As a system administrator, I want to see a list of all accounts pending verification, so that I can process new responder requests.

**Back:**  
- **Success:** The administrator can view a dashboard showing all users with the "Pending Verification" status.  
- **Failure:** The list fails to load or does not show the correct users.  

**Acceptance Criteria:**  
- The admin dashboard has a section for "Account Requests".  
- Each entry in the list shows the applicant's submitted details.  
- The admin can approve or deny the request.  

---

## Secure User Login
**Front:**  
As a registered user, I want to log in with my phone number and password, so that I can securely access the system.

**Back:**  
- **Success:** The user is authenticated and redirected to their role-specific dashboard.  
- **Failure:** The user sees an "Invalid credentials" error message.  

**Acceptance Criteria:**  
- The login form accepts a phone number and password.  
- Authentication is performed against the user database.  
- The system implements protection against brute-force attacks.  

---

## Role-Based Dashboard Access
**Front:**  
As a commander, I want the system to check a user's role after they log in, so that I can direct them to the correct interface (Civilian, Responder, or Commander).

**Back:**  
- **Success:** A logged-in medic sees the responder interface, while a civilian sees the public interface.  
- **Failure:** A user is shown the wrong dashboard, potentially exposing sensitive information.  

**Acceptance Criteria:**  
- Upon successful login, the system fetches the user's role.  
- The application routes the user to a view corresponding to their role.  
- API endpoints are protected to prevent a user from accessing data outside their role's permissions.  

---

## One-Tap SOS Transmission
**Front:**  
As a civilian in an emergency, I want a single-press SOS button, so that I can immediately alert authorities with my location.

**Back:**  
- **Success:** A new incident is created on the commander's dashboard with the user's GPS coordinates.  
- **Failure:** The app fails to get the user's location or cannot connect to the server.  

**Acceptance Criteria:**  
- The SOS button is prominently displayed on the main screen.  
- Pressing it sends the location data to the backend in under 2 seconds.  
- The user receives visual feedback that the SOS was sent successfully.  

---

## Post-SOS Contextual Information
**Front:**  
As a civilian who has sent an SOS, I want to be presented with options to add a photo, voice note, or text, so that I can provide more context if I'm able.

**Back:**  
- **Success:** The user can easily add and send supplementary information linked to their active SOS incident.  
- **Failure:** The options are confusing or fail to upload the data.  

**Acceptance Criteria:**  
- After a successful SOS, the UI displays clear buttons for "Add Photo," "Record Voice," and "Add Text."  
- Any submitted information is attached to the correct incident ID in the backend.  

---

## Answering a Situational Questionnaire
**Front:**  
As a civilian in a disaster area, I want to receive confirmative question via a push notification, so that I can quickly report on-the-ground conditions.

**Back:**  
- **Success:** The user taps the notification, answers the question(s), and their response is logged.  
- **Failure:** The notification is missed or the response fails to submit.  

**Acceptance Criteria:**  
- The app can receive and display push notifications containing questionnaires.  
- The interface for answering is simple (e.g., large buttons for "Yes"/"No").  
- The response is sent to the backend and aggregated.     

---

## Ingesting Real-Time Weather Data
**Front:**  
As the commander, I want the system to poll the India Meteorological Department (IMD) API every 5 minutes, so that I can access the latest weather data for key regions.

**Back:**  
- **Success:** The system successfully fetches and stores relevant weather data (e.g., rainfall intensity, cyclone warnings).  
- **Failure:** The API is unavailable or the data format is unexpected.  

**Acceptance Criteria:**  
- The system has a scheduled job to call the IMD API endpoint.  
- The data is parsed and stored in a time-series database.  
- Errors in fetching data are logged.  

---

## ML Model for Flood Detection
**Front:**  
As the commander, I want system's ML model to analyze incoming rainfall data against historical models, so that I can predict a high probability of flooding in a specific area.

**Back:**  
- **Success:** The model correctly identifies a flood risk and triggers an internal system alert.  
- **Failure:** The model fails to run or produces a false negative/positive.  

**Acceptance Criteria:**  
- The model is trained on historical flood data.  
- It processes new data points as they are ingested.  
- A confidence score is generated with each prediction.  

---

## Ingesting live news articles
**Front:**  
As the commander, I want system to keep a track of live news articles(of trusted sources) on web so that I can ingest live updates originating from disaster affected areas.

**Back:**  
- **Success:** Live disaster-related news from trusted sources is continuously ingested and made available on the commander’s dashboard.
- **Failure:** News ingestion fails, duplicates appear, or irrelevant/unverified articles are included.

**Acceptance Criteria:**  
- News is fetched only from trusted and verified sources.
- Articles are ingested within 2 minutes of publication.
- Each article includes source, timestamp, headline, and content snippet.
- Duplicate articles are filtered automatically.
- Only disaster-related content is stored and displayed.
- Ingestion failures are logged, and the system retries within 30 seconds. 

---

## Centralized Incident Timeline Logging
**Front:**  
As the commander, I want system to write every single event (SOS, alert sent, user report, responder dispatch) to a central, immutable log with a precise timestamp, so that a verifiable timeline of the incident is created.

**Back:**  
- **Success:** Every action is recorded in the correct order in the incident's log.  
- **Failure:** An event occurs but is not logged, creating an incomplete record.  

**Acceptance Criteria:**  
- A single logging service is used for all parts of the application.  
- Each log entry includes an event type, timestamp, user ID, and associated data.  
- The log database is protected against modification.  

---

## Displaying Critical Infrastructure on Map
**Front:**  
As a user, I want to toggle a map layer to see the locations of official shelters, hospitals, and aid stations, so that I can plan a safe route.

**Back:**  
- **Success:** The user taps a button and the corresponding icons appear on the map.  
- **Failure:** The icons fail to load or show incorrect locations.  

**Acceptance Criteria:**  
- The app has a database of geolocated critical infrastructure points.  
- The map UI has distinct, toggleable layers for each type of point.  

---

## Real-Time Responder Tracking for Commanders
**Front:**  
As an Commander, I want to see the live location of all on-duty responders as moving icons on my map, so that I can maintain situational awareness.

**Back:**  
- **Success:** The map accurately reflects the current position of all active units.  
- **Failure:** The locations are stale or fail to update.  

**Acceptance Criteria:**  
- Responder apps transmit their location to the server every 30 seconds.  
- The commander's map UI uses WebSockets to receive and display these updates in real-time.  

---

## Initiating In-App Voice Calls
**Front:**  
As a responder, I want to tap on another responder's icon on the map and initiate a direct voice-over-IP (VoIP) call, so that I can coordinate with them quickly.

**Back:**  
- **Success:** A stable voice call is established between the two users' devices.  
- **Failure:** The call fails to connect or has poor audio quality.  

**Acceptance Criteria:**  
- The app integrates a WebRTC or similar VoIP library.  
- A call can be initiated and received within the app.  
- The audio stream from the call is captured for processing.  

---

## ASR Transcription of Captured Audio
**Front:**  
As the user, I want system to send the captured audio stream from an in-app call to an ASR service, so that I can receive a text transcript of the conversation.

**Back:**  
- **Success:** The ASR service returns an accurate text transcript with timestamps.  
- **Failure:** The transcription is inaccurate or the service is unavailable.  

**Acceptance Criteria:**  
- The system sends the audio data to the ASR API endpoint.  
- The returned transcript is stored and associated with the incident's central log.  

---

## Compiling Incident Data for LLM
**Front:**  
As the commander, I want system to fetch all log entries associated with a closed incident ID, so that I can assemble a complete chronological record.

**Back:**  
- **Success:** A structured JSON object containing all events from the incident timeline is created.  
- **Failure:** The database query fails or the data is incomplete.  

**Acceptance Criteria:**  
- A commander selects a closed incident and clicks "Generate Report".  
- The system queries the central log for all entries with the matching incident ID.  

---

## Displaying and Editing the Draft Report
**Front:**  
As an Commander, I want to view the LLM-generated report in a text editor within the app, so that I can review and make manual corrections.

**Back:**  
- **Success:** The commander can type, delete, and rephrase parts of the generated text.  
- **Failure:** The text editor is buggy or does not save changes.  

**Acceptance Criteria:**  
- The LLM's response is displayed in a rich text editor.  
- The commander can modify the content.  
- A "Save" button persists the changes.  

---

## Exporting the Final Report to PDF
**Front:**  
As an Incident Commander, I want to export the finalized report as a professionally formatted PDF, so that I can share it for official record-keeping.

**Back:**  
- **Success:** A PDF file is generated and downloaded by the user.  
- **Failure:** The PDF generation fails or the formatting is incorrect.  

**Acceptance Criteria:**  
- The system uses a library to convert the final report text into a PDF.  
- The PDF includes a standard header with incident details (date, type, location).  

---