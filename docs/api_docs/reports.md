### **Router Specification: `app/routers/reports.py`**

**Purpose:** Generate, edit, and export situational reports.
**Dependencies:** `LangChain` (LLM Orchestration), `ReportLab` or `WeasyPrint` (PDF Generation), `SQLAlchemy`.

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/reports.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# 1. Timeline Event (Nested in Report)
class TimelineEvent(BaseModel):
    time: str # HH:MM format
    event: str

# 2. Report Response (The Draft)
class ReportResponse(BaseModel):
    report_id: UUID
    disaster_id: UUID
    version_number: int
    generated_at: datetime
    status: str # 'draft' or 'final'
    
    # The AI Generated Fields (Editable)
    estimated_deaths: Optional[int]
    estimated_casualties: Optional[int]
    damage_summary: Optional[str]
    resources_used_summary: Optional[str]
    timeline_json: List[TimelineEvent] = []

    class Config:
        from_attributes = True

# 3. Edit Request (Commander corrects AI)
class ReportUpdateRequest(BaseModel):
    estimated_deaths: Optional[int]
    estimated_casualties: Optional[int]
    damage_summary: Optional[str]
    resources_used_summary: Optional[str]
    # Full replacement of timeline
    timeline_json: Optional[List[TimelineEvent]] 
```

-----

### **2. Endpoints**

#### **A. `POST /disasters/{disaster_id}/generate`**

  * **Purpose:** Triggers the LLM to analyze history and create a Draft Report.
  * **Role:** Commander Only.
  * **Logic:**
    1.  **Data Aggregation:**
          * Fetch all `disaster_logs` for this ID (sorted by time).
          * Fetch `disaster_chat_messages` (exclude purely operational chatter if possible, or just feed the last N messages).
          * Fetch `disaster_stats` (current casualty counts).
    2.  **Context Construction:** Format this data into a text prompt.
          * *Prompt Structure:* "You are an Incident Commander. Summarize the following event logs into a specific format: Damage Assessment, Resource Usage, and Key Timeline."
    3.  **LLM Call:** Call `LLMService.generate_report(context)`.
    4.  **Versioning:**
          * Check max `version_number` for this disaster in `disaster_report_drafts`.
          * New Version = Max + 1.
    5.  **Save Draft:** Insert new row with status 'draft'.
  * **Returns:** `ReportResponse` (The newly created draft).

#### **B. `GET /disasters/{disaster_id}/reports`**

  * **Purpose:** View version history.
  * **Role:** Commander.
  * **Logic:** Query `disaster_report_drafts` where `disaster_id` matches. Order by `version_number` DESC.
  * **Returns:** List of `ReportResponse`.

#### **C. `GET /reports/{report_id}`**

  * **Purpose:** Load a specific draft into the Editor.
  * **Role:** Commander.
  * **Logic:** Fetch by ID.
  * **Returns:** `ReportResponse`.

#### **D. `PATCH /reports/{report_id}`**

  * **Purpose:** Save manual edits made by the Commander.
  * **Role:** Commander.
  * **Input:** `ReportUpdateRequest`.
  * **Logic:**
      * Update the columns in `disaster_report_drafts`.
      * Update `generated_at` to `NOW()` (or add a `last_edited_at` column if preferred).
  * **Returns:** Updated `ReportResponse`.

#### **E. `GET /reports/{report_id}/pdf`**

  * **Purpose:** Export the finalized document.
  * **Role:** Commander.
  * **Logic:**
    1.  **Fetch Data:** Get the report fields + Disaster Title + Commander Name.
    2.  **Render PDF:**
          * Use a service (e.g., `PDFService.create_pdf(data)`).
          * Generate a temporary file or binary stream.
    3.  **Status Update:** (Optional) Update `status` to 'final' if not already.
  * **Returns:** `StreamingResponse` (mime\_type=`application/pdf`) with `Content-Disposition: attachment`.