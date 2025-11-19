### **Router Specification: `app/routers/surveys.py`**

**Purpose:** Serve context-aware questions to users and transform their answers into structured **Disaster Logs**.
**Dependencies:** `SQLAlchemy`, `datetime` (for cooldown logic).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/surveys.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Union, Any
from uuid import UUID
from datetime import datetime

# 1. The Question sent to the Frontend
class SurveyQuestionResponse(BaseModel):
    question_id: UUID
    key: str # e.g., "medics_needed" - useful for frontend icons
    question_text: str
    answer_type: str # boolean, integer, choice, text
    choices: Optional[List[str]] = None # For 'choice' type (from metadata)

# 2. The Answer received from the Frontend
class SurveyAnswerRequest(BaseModel):
    disaster_id: UUID
    answer_value: Union[str, int, bool] # Flexible input
    location_lat: Optional[float] = None # Capture where they answered
    location_lon: Optional[float] = None

# 3. Confirmation Response
class SurveySubmitResponse(BaseModel):
    log_id: UUID # The answer is converted into a log entry
    message: str = "Thank you for your report."
```

-----

### **2. Endpoints**

#### **A. `GET /surveys/pending`**

  * **Purpose:** Called by the Mobile App periodically (or upon opening the "Updates" tab) to check if the system needs information.
  * **Role:** Authenticated User (Civilian/Responder).
  * **Input:** Query param `disaster_id`.
  * **Logic (The Selection Algorithm):**
    1.  **Fetch Templates:** Get all active `question_templates`.
    2.  **Check States:** Join with `disaster_question_states` for the specific `disaster_id`.
    3.  **Filter:** Find questions where `last_answered_at` is NULL **OR** `last_answered_at` \< (NOW - Cooldown Threshold).
          * *Threshold:* Default to 1 hour. (We don't want to spam users about the same thing).
    4.  **Randomize/Prioritize:** Pick **one** question. (Random selection ensures different users update different data points).
  * **Returns:** `SurveyQuestionResponse` or `204 No Content` (if all data is fresh).

#### **B. `POST /surveys/{question_id}/answer`**

  * **Purpose:** Ingest user input and transform it into actionable data.
  * **Role:** Authenticated User.
  * **Input:** `SurveyAnswerRequest`.
  * **Logic:**
    1.  **Verify:** Check if question exists.
    2.  **Update State:**
          * Upsert into `disaster_question_states`.
          * Set `last_answer_value` = input.
          * Set `last_answered_at` = NOW.
          * Set `last_answered_by_user_id` = `current_user.id`.
    3.  **Create Log (Critical):**
          * Create a new entry in `disaster_logs`.
          * `source_type` = 'question\_answer'.
          * `text_body` = `f"User answered '{question.text}' with: {answer_value}"`.
          * **Data Mapping (See Detail \#1):** Map specific Question Keys to specific Log Columns.
  * **Returns:** `SurveySubmitResponse`.
