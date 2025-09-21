#### **Purpose & Goals**

- The platform is designed to digitize and enforce a structured response mechanism, helping to minimize loss of life and property by ensuring adherence to established SOPs. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- The platform will provide a clear, technology-driven chain of command through its role-based access and tasking features, directly supporting the Incident Response System (IRS). (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- By ingesting multi-source data and using GenAI for triage, the platform will help shift the response from a reactive, relief-centric model to a proactive, data-driven approach encompassing prevention and preparedness. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- The platform will serve as a primary tool for the National Disaster Response Force (NDRF), providing them with real-time incident data and mapping to deliver a more effective specialized response. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Stakeholders & Roles**

- **National Disaster Management Authority (NDMA):** Will have a strategic-level login to view national-level dashboards, monitor large-scale incidents, and access analytics to inform policy. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **District Disaster Management Authority (DDMA):** This will be the primary operational user. The platform will provide the DDMA with the tools to plan, coordinate, and implement the response at the district level using the shared map and communication modules. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **National Disaster Response Force (NDRF):** Field teams will use the platform's mobile app to receive dispatch orders, get incident details, navigate to the location, and report back on search and rescue operations. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Armed Forces:** Where deployed, armed forces units can be granted access to the platform's common operational picture to ensure seamless coordination of logistics, transport, and communication support. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Processes & Workflows**

- **Early Warning Integration:** The platform will have a workflow to ingest early warning alerts from agencies like the IMD and automatically create preliminary incident zones on the map for proactive monitoring. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Incident Response System (IRS) Activation:** When an incident is validated, the platform will automatically create a digital Incident Command Post, allowing the Incident Commander to manage the response using the platform's tools, mirroring the official IRS structure. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Search and Rescue (SAR) Tasking:** The platform will allow the Incident Commander to create and assign specific SAR tasks to NDRF or SDRF teams, who can then accept and provide real-time status updates through the mobile app. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Automated Post-Disaster Needs Assessment (PDNA) Data Collection:** The platform will archive all incident data (communications, reports, imagery) to create a comprehensive digital record that can be used to generate initial data for the PDNA report, detailing the extent of damage and losses. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Data Requirements**

- **Resource Inventory Integration:** The platform must integrate with or host an up-to-date inventory of resources (equipment, manpower, relief supplies) to enable quick and efficient mobilization during an incident. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Geospatial Data Layers:** The platform must support multiple GIS layers, including hazard maps (seismic, flood zones), vulnerability data, and real-time satellite imagery to aid in response planning and damage assessment. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Immutable Incident Logs:** The platform must maintain detailed, timestamped, and unalterable logs of all actions, decisions, and communications for each incident to support operational management and post-incident analysis. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Constraints & Rules**

- **Adherence to DM Act, 2005:** All platform workflows, roles, and permissions must be designed to operate within the legal framework of the Disaster Management Act, 2005, reinforcing the defined powers and functions of various authorities. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Overcoming Communication Gaps:** The platform must be designed with offline capabilities and low-bandwidth modes to function effectively even when traditional communication networks fail, a common constraint in major disasters. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Streamlining Inter-Agency Coordination:** The platform's shared map and unified chat are designed to be the primary tool to overcome the operational challenge of coordinating multiple agencies, ensuring all stakeholders work from the same information. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Non-Functional Needs**

- **Reliability:** The platform must be highly reliable, with built-in redundancy to ensure it remains functional even when normal communication infrastructure fails during a disaster. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Interoperability:** The platform must be built with open APIs to ensure interoperability between the communication systems used by various response agencies like Police, NDRF, and Health services. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **High Availability:** As a critical system for managing response, the platform must have high availability (24x7) with minimal downtime, especially during a crisis. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Pain Points / Gaps**

- **Improving Last-Mile Connectivity:** The platform will address the last-mile connectivity gap by using a mobile-first approach for field teams and integrating with multiple communication channels (SMS, app notifications) to disseminate alerts. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Enhancing Public Awareness:** The platform can be used to push targeted awareness campaigns and preparedness information to citizens based on their location and risk profile, addressing the lack of public awareness. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Supporting Community Participation:** The platform will include a module for registering and managing community volunteers, bridging the gap between top-down planning and community-level participation by allowing commanders to assign minor, localized tasks to verified volunteers. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Outputs & Deliverables**

- **Dynamic Situation Reports (SitReps):** The platform will automatically generate standardized SitReps at regular intervals, providing updates on the situation and response actions, reducing manual reporting effort. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Actionable Early Warning Alerts:** The platform will process and disseminate early warnings from technical agencies into clear, actionable alerts for both the public and response agencies. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Relief Management Dashboards:** The platform will provide dashboards to track the status of relief camps and the distribution of supplies, ensuring efficient and transparent relief management. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)

#### **Compliance & Accountability**

- **Enforcing the DM Act, 2005:** The platform's workflows will be designed to enforce compliance with the DM Act, providing a digital trail that demonstrates adherence to legal procedures and penalties for obstruction. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Supporting CAG Audits:** The platform's comprehensive and immutable logs will provide all necessary data for performance audits by the Comptroller and Auditor General (CAG), ensuring full accountability for fund utilization and operational effectiveness. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
- **Digital Mock Drill Module:** The platform will include a simulation mode for conducting digital mock drills, allowing agencies to test SOPs and ensure compliance in a controlled environment, with all results logged for analysis. (Source: <https://www.ndma.gov.in/images/pdf/sop-for-emergency-response.pdf>)
