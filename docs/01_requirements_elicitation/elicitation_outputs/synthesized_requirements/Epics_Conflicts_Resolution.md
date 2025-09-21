# Conflicts Between Epics & Resolution
 
## 1. Data Sovereignty & Duplication (Epic 3 vs. Epic 4)
*Conflict:*  
Epic 3 requires a centralized timeline log of all activities, while Epic 4 suggests a separate log for ASR calls. Two logs would create data silos and make unified reporting (Epic 5) harder.  

*Resolution:*  
All logs must go into the single incident log defined in Story 3.4. ASR events (Story 4.4) are treated as just another event type in that shared schema.  

---

## 2. User Flow Dependency (Epic 2 vs. Epic 4)
*Conflict:*  
A civilian sends an SOS (Epic 2), the commander dispatches a unit, and then the civilian sees ETA on the map (Epic 4). While these features are split across epics, the full emergency journey depends on all of them working together.  

*Resolution:*  
Teams can build features in parallel, but complete user testing only works once both epics are integrated. This dependency must be flagged during sprint planning and coordinated across teams.  

---

## 3. Performance & Resource Contention (Epic 3/4/5 vs. Core Functions)
*Conflict:*  
Real-time analytics (Epic 3), ASR (Epic 4), and LLM calls (Epic 5) are all resource-heavy. Running them together could slow down mission-critical features like one-tap SOS (Epic 2) or map rendering (Epic 4).  

*Resolution:*  
Separate high-load features from the core system. Use microservices and queues so critical features run on lightweight, high-availability infrastructure, while heavy tasks (ASR, AI models, analytics) scale independently without affecting response time.