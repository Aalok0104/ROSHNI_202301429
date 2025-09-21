#### **Purpose & Goals**

- **Programmatic Data Ingestion:** The platform will utilize the APIs of platforms like X (formerly Twitter) and Meta to programmatically access and ingest public data, enabling real-time listening for distress signals and crisis-related events. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Regulatory Compliance:** The platform's design and operation must adhere to the Indian IT Rules, 2021, establishing a framework of due diligence and accountability for how it handles social media data and responds to lawful orders. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Crowdsourced Situational Awareness:** The platform's primary goal for using social media is to leverage crowdsourcing to gather diverse, on-the-ground data quickly, providing a richer and more immediate source of information than traditional reporting channels. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Automated Communication:** The platform will use business APIs (e.g., WhatsApp Business Platform) to send targeted notifications and alerts to first responders and registered volunteers. (Source: <https://developers.facebook.com/docs/whatsapp/cloud-api/>)

#### **Stakeholders & Roles**

- **Platform as a Developer:** In its interaction with social media APIs, the platform acts as a developer and is responsible for adhering to all terms of service, rate limits, and data privacy policies set by the social media companies. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Chief Compliance Officer:** The organization operating the platform must appoint a Chief Compliance Officer responsible for ensuring the platform's adherence to the IT Act and its rules, particularly regarding data handling and lawful requests. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Government of India (MeitY):** The platform must have a defined process to respond to legally binding takedown orders from authorized government agencies for any unlawful content that may have been ingested and stored in its systems. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **End-Users (Citizens):** The platform will process public data created by end-users. Its design must prioritize the ethical use of this data, focusing solely on disaster response and avoiding surveillance or other prohibited use cases. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)

#### **Processes & Workflows**

- **API Authentication & Request:** The platform's social media ingestion module will use secure API keys and OAuth 2.0 credentials to authenticate requests. It will make HTTP requests to specific API endpoints to search for relevant keywords and hashtags, parsing the returned JSON data. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Webhook Integration for Real-Time Data:** For immediate alerts, the platform will use webhooks. Social media platforms will push real-time data (e.g., new posts matching a keyword) to a platform-specified URL, enabling instant ingestion and analysis. (Source: <https://developers.facebook.com/docs/graph-api/webhooks/>)
- **Content Takedown Workflow:** Upon receiving a valid legal order, the platform's administrator must have a workflow to locate the specified content within the platform's database and either delete it or disable access to it within the 36-hour timeframe mandated by the IT Rules. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **GenAI Content Moderation:** The platform's GenAI will be trained to proactively identify and flag harmful or irrelevant content (e.g., misinformation, spam) from the ingested social media feeds, cleaning the data before it is presented to human operators. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)

#### **Data Requirements**

- **JSON Data Format:** The platform's ingestion pipeline must be built to parse JSON, the standard data format for social media API responses. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Geo-tagged Data Extraction:** A key data requirement is the ability to extract and prioritize posts that contain geo-tagged location data, as this is critical for accurately plotting incidents on the shared map. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Traceability Compliance:** The platform must log the original source (e.g., post URL, author ID) of all ingested information to assist with traceability requirements under the IT Rules if lawfully required for serious offenses. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Media Data Handling:** The platform must be able to process URLs for media (images, videos) attached to social media posts, allowing the GenAI to perform image analysis and providing visual context to human operators. (Source: <https://developers.facebook.com/docs/graph-api/>)

#### **Constraints & Rules**

- **API Rate Limits & Cost:** The platform's architecture must be designed to operate efficiently within the rate limits and cost structures of social media APIs (e.g., the X API's tiered model), using intelligent queuing and request batching. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Data Usage Policies:** The platform must strictly adhere to platform policies that prohibit the use of API data for surveillance. All data must be used solely for disaster response. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Content Removal Timelines:** The platform must have the technical capability and operational procedures in place to ensure compliance with the 36-hour timeline for removing content upon receipt of a valid legal order. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Privacy vs. Traceability:** The platform must navigate the conflict between user privacy and the IT Rules' traceability requirement by storing only the necessary metadata to identify the "first originator" of an ingested post, without storing the content of private messages. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)

#### **Non-Functional Needs**

- **Scalability:** The social media ingestion module must be able to scale to handle millions of posts during a major crisis, in line with the massive scale of platforms like Meta and X. (Source: <https://developers.facebook.com/docs/graph-api/>)
- **Low Latency:** The platform must ingest and process social media posts with very low latency to ensure that real-time events are captured and displayed on the map as they happen. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Reliability & Availability:** The API integration must be reliable, with robust error handling and failover mechanisms to ensure a consistent stream of data, as API availability from social media platforms can fluctuate. (Source: <https://developer.twitter.com/en/docs/twitter-api>)

#### **Pain Points / Gaps**

- **Mitigating API Cost:** The platform will address the pain point of high API access costs by using intelligent filtering and search queries to pull only the most relevant data, maximizing the value of each API call. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Managing API Instability:** The platform will be built with an abstraction layer for social media APIs, allowing it to adapt quickly to changes or deprecations with minimal disruption to the overall system. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Improving Algorithmic Transparency:** While the platform cannot see inside social media algorithms, it can provide transparency by showing operators exactly which keywords and search parameters resulted in a particular post being ingested, addressing the gap in understanding content surfacing. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)

#### **Outputs & Deliverables**

- **Social Listening Dashboards:** The platform will provide internal dashboards for operators to track keywords and hashtags in real-time, providing analytics on incident reporting volume and sentiment. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Real-time Crisis Maps:** A key deliverable will be the use of geo-tagged social media data to create live maps showing user reports of flooding, fires, or calls for help, aiding situational awareness. (Source: <https://developer.twitter.com/en/docs/twitter-api>)
- **Automated Compliance Reports:** The platform will generate monthly compliance reports detailing the volume of social media data processed and any actions taken in response to user grievances or legal orders, as mandated by the IT Rules. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)

#### **Compliance & Accountability**

- **Monthly Compliance Reporting:** The platform will automate the generation of monthly reports detailing grievances received related to ingested content and actions taken, in compliance with the IT Rules. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Appointment of In-Country Officers:** The organization running the platform will appoint the required officers (Compliance, Nodal, Grievance) responsible for overseeing the platform's adherence to the IT Rules. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
- **Conditional Safe Harbor:** The platform will operate on the principle that its "safe harbor" protection is conditional on its strict compliance with the due diligence and takedown requirements of the IT Rules. (Source: <https://www.meity.gov.in/content/pdf/it-rules-2021.pdf>)
