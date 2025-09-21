# Non-Functional Requirements

## 1. Performance & Reliability
- **Low Latency:** Critical alerts must be delivered in under 2 seconds.  
- **Scalability:** The system must handle thousands of users and large-scale disasters.  
- **High Availability:** 99.9% uptime is required during emergencies.  
- **Resilience:** The system must operate under adverse conditions (e.g., power outages, poor networks, natural calamities).  
- **Accuracy:** Data collected and displayed must be reliable and up-to-date.  

**Requirement Elicitation:**  
The requirements for low latency, high availability, and scalability were identified through a combination of interviews and document analysis. The need for a rapid response time is mentioned by a Mamlatdar officer, with a target of 2-5 minutes for reported disasters. Scalability is a key non-functional need for Ushahidi's platform to handle large-scale emergencies. Similarly, the ability to operate under adverse conditions (resilience) was highlighted in the context of various mock drills and different geographical locations. The accuracy of data collected and displayed is also a major concern for users, who want to ensure they receive reliable, up-to-date information to combat fake news.

---

## 2. Security & Privacy
- **Encryption:** All sensitive data must be encrypted at rest and in transit.  
- **Access Control:** Role-based access must be enforced to protect sensitive data.  
- **Auditability:** All system activities and data access must be logged.  
- **Compliance:** The system must comply with GDPR, HIPAA, ICO, and local data regulations.  
- **Privacy by Design:** The system must minimize unnecessary data collection and protect user identity.  

**Requirement Elicitation:**  
The need for encryption and strong access control is an inference from the core principles of the GDPR, HIPAA, and ICO guidelines, which stress the importance of protecting sensitive data and enforcing role-based access to safeguard personal information. The requirement for auditability comes from the GDPR, which mandates that all system activities and data access must be logged to demonstrate compliance. Compliance with various data regulations is a stated requirement in the provided documents. Privacy by design is a core principle of the GDPR, requiring the minimization of data collection and the protection of user identity from the outset.

---

## 3. Usability & Accessibility
- **Simple Interface:** The civilian-facing interface must be easy to use, even under stress.  
- **Accessibility:** The system must support multiple languages and be usable by people with limited technical skills.  
- **Multi-Channel Access:** The system must support web and mobile-based interaction.  
- **Works Offline:** Core functions must remain available in low or no internet connectivity. The system should fetch the latest state whenever internet is available.  

**Requirement Elicitation:**  
The requirement for a simple interface was a recurring theme in civilian interviews, where users emphasized the need for an easy-to-use application, especially under stress. The need for multi-channel access was identified from various sources, including the civilian interviews, which mentioned calls, SMS, and web-based interaction. The ability for the system to work in areas with poor or no internet connectivity is a critical consideration for a disaster management system, and it was identified from the civilian interviews, who mentioned the possibility of low bandwidth and the preference for calls or voice notes.

---

## 4. Maintainability & Interoperability
- **Integration:** The system must integrate with government and emergency platforms (NDMA, IRS, IMD, hospitals, police, fire services).  
- **Easy Updates:** Maintenance and updates must not disrupt live operations.  
- **Interoperability:** The system must work across different devices, frequencies, and communication protocols.  

**Requirement Elicitation:**  
The need for integration with government and emergency platforms was identified through interviews with a medical doctor and GIDM officials, who mentioned the importance of working with entities like the SEOC, hospitals, and various emergency services. The requirement for interoperability across different frequencies and communication protocols was explicitly mentioned in the interview with Piyush Ramteke, who noted that police and firefighters currently use different frequencies.

---

## 5. Efficiency & Resource Management
- **Lightweight:** The app must consume minimal battery and resources.  
- **Optimized Runtime:** The app should run in event-triggered mode, not 24/7, unless required.  
- **Timely Coordination:** The system must facilitate fast coordination between departments.  

**Requirement Elicitation:**  
The requirement for a lightweight app that consumes minimal battery and resources was a significant concern raised in interviews with civilian users. The concept of optimized runtime to avoid constant location tracking was a direct concern from one user, who asked if the app would run 24/7 or only when a disaster occurs. The need for timely coordination was explicitly mentioned as a bottleneck in the interview with Piyush Ramteke.
