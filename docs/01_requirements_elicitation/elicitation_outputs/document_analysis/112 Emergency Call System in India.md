#### **Purpose & Goals**

- **Single Emergency Number:** The platform must integrate with the 112 system to act as a central processing hub for the single, integrated emergency number for all types of emergencies. (Source: <https://112.gov.in/>)
- **Automated Location Services:** The platform will ingest and immediately plot the automated location data (GPS/LBS) from 112 calls on the shared map, enabling faster dispatch of the nearest emergency vehicle. (Source: <https://112.gov.in/>)
- **Panic Button Integration:** The platform must be configured to receive and prioritize alerts originating from the panic button feature on mobile phones, flagging them for immediate GenAI triage and human validation. (Source: <https://112.gov.in/>)
- **Citizen Volunteer Integration:** The platform will include a module to manage registered citizen volunteers, allowing dispatchers to push location-specific alerts or minor tasks to them, leveraging the "SHOUT" feature integrated with the 112 system. (Source: <https://112.gov.in/>)

#### **Stakeholders & Roles**

- **Ministry of Home Affairs (MHA):** Will have oversight access to the platform's analytics, monitoring the performance of the integrated 112-response workflow as part of the nationwide ERSS project. (Source: <https://112.gov.in/>)
- **C-DAC (Technology Partner):** The platform's technical team will coordinate with C-DAC, the Total Solution Provider for ERSS, to ensure seamless API integration and data exchange between the platform and the core software used in Public Safety Answering Points (PSAPs). (Source: <https://112.gov.in/>)
- **Emergency Service Dispatchers (Police, Fire, Health):** These users will interact with the platform's dispatcher interface, which will display validated incidents from all sources (including 112 calls) and recommend the optimal Emergency Response Vehicle (ERV) to dispatch. (Source: <https://112.gov.in/>)
- **Telecom Service Providers (TSPs):** While not direct users, the platform relies on the data provided by TSPs to the 112 system. The platform must have robust error handling for cases where location data is inaccurate or unavailable. (Source: <https://112.gov.in/>)

#### **Processes & Workflows**

- **Multi-Channel Ingestion:** The platform will establish a real-time data pipeline from the state PSAP to ingest distress signals from multiple channels including voice calls, SMS, email, and web requests. (Source: <https://112.gov.in/>)
- **GenAI De-duplication:** The platform's GenAI will analyze incoming 112 call data and correlate it with social media posts and other inputs to cluster reports about the same event, preventing the creation of duplicate incidents. (Source: <https://112.gov.in/>)
- **ERV Tracking on Shared Map:** The platform will ingest the real-time location of all ERVs from the 112 system and display them on the shared map, providing the Incident Commander with a complete picture of all available and deployed resources. (Source: <https://112.gov.in/>)
- **Filtering Non-Actionable Calls:** The platform's GenAI will be trained to identify and filter out the high volume of non-actionable or prank calls that the 112 system receives, allowing human operators to focus only on genuine emergencies that require dispatch. (Source: <https://112.gov.in/>)

#### **Data Requirements**

- **Standardized Incident Data:** The platform must use a standardized digital format to ingest incident data from the C-DAC software, including a unique incident ID, timestamps, nature of the emergency, and caller location. (Source: <https://112.gov.in/>)
- **Voice Log Integration:** The platform should have the capability to link to or ingest the voice recordings of 112 calls for quality assurance and to allow the GenAI to perform speech-to-text analysis for more detailed triage. (Source: <https://112.gov.in/>)
- **Dispatch Records:** The platform must log all dispatch details, including the assigned ERV, time of dispatch, time of arrival, and incident closure time, creating a complete audit trail for response time analysis. (Source: <https://112.gov.in/>)

#### **Constraints & Rules**

- **Operational Jurisdiction:** The platform must enforce the operational jurisdiction of the 112 system. A dispatcher in one state must only be able to view and manage incidents and resources within that state's boundaries. (Source: <https://112.gov.in/>)
- **Mitigating Location Inaccuracy:** Recognizing that location tracking can be inaccurate, the platform's GenAI must be designed to use textual information from the call or social media posts to refine and improve location accuracy. (Source: <https://112.gov.in/>)
- **Inter-Agency Coordination Protocol:** The platform's design will directly address the constraint of siloed emergency departments by providing a single interface where Police, Fire, and Health dispatchers can see the same incident and coordinate a joint response. (Source: <https://112.gov.in/>)

#### **Non-Functional Needs**

- **High Availability & Reliability:** The platform must be operational 24x7x365 with near-zero downtime, requiring redundant systems to ensure it remains functional even during major disasters. (Source: <https://112.gov.in/>)
- **Low Call Response Time:** The platform's data ingestion pipeline from the 112 system must have very low latency to ensure that incident data appears in the system for triage within seconds of the call being logged. (Source: <https://112.gov.in/>)
- **Scalability:** The system must be able to handle a massive and fluctuating volume of incoming call data from the 112 system without performance degradation, especially during a large-scale emergency. (Source: <https://112.gov.in/>)

#### **Pain Points / Gaps**

- **Automating Prank Call Filtering:** The platform's GenAI will directly address the pain point of high prank call volumes by automatically identifying and filtering non-actionable calls, freeing up human operators. (Source: <https://112.gov.in/>)
- **Improving Response Times:** By providing accurate location plotting, real-time traffic data for routing, and recommending the closest available unit, the platform will help reduce the delayed response times identified in performance audits. (Source: <https://112.gov.in/>)
- **Increasing Public Awareness:** The platform can support the 112 system by providing a channel for public awareness campaigns, helping to educate citizens about the single emergency number. (Source: <https://112.gov.in/>)

#### **Outputs & Deliverables**

- **Real-time Dispatch Dashboards:** The platform will provide dispatchers with a real-time dashboard showing incoming 112 incidents, active incidents, and the live location of all ERVs on a GIS map. (Source: <https://112.gov.in/>)
- **Automated Performance Reports:** The platform will generate daily and monthly performance reports, detailing metrics like total calls ingested, number of genuine incidents triaged, and average response times by district. (Source: <https://112.gov.in/>)
- **Data for Crime Analysis:** The platform will structure and store incident data from 112 calls in a way that allows for easy export and use in crime mapping and analysis by police departments. (Source: <https://112.gov.in/>)

#### **Compliance & Accountability**

- **Call Recording and Retention:** The platform will integrate with the 112 system's call recording data, linking audio files to incident tickets and ensuring they are retained for the legally required period for audits and evidence. (Source: <https://112.gov.in/>)
- **Accountability for Response Time:** The platform will create a clear, digital audit trail for every 112 incident, logging every timestamp from call reception to incident closure, providing transparent data for monitoring response time accountability. (Source: <https://112.gov.in/>)
- **Data Privacy and Confidentiality:** The platform will enforce strict role-based access controls to ensure that sensitive caller data from the 112 system is kept confidential and is only accessible to authorized personnel. (Source: <https://112.gov.in/>)
