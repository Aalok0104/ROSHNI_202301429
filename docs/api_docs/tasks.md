### **Router Specification: `app/routers/tasks.py`**

**Purpose:** Create operational objectives, assign teams, and track progress in real-time.
**Dependencies:** `GeoAlchemy2` (Task locations), `SQLAlchemy` (Joins between Tasks and Teams).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/tasks.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# 1. Create a Task
class TaskCreateRequest(BaseModel):
    task_type: str = Field(..., description="medic, fire, police, logistics, search_rescue, evacuation")
    description: str
    priority: str = "medium" # low, medium, high
    latitude: float # Specific location of the task
    longitude: float

# 2. Assign a Team
class TaskAssignmentRequest(BaseModel):
    team_id: UUID

# 3. Update Assignment Status (Responder Action)
class AssignmentStatusUpdate(BaseModel):
    status: str = Field(..., description="assigned, en_route, on_scene, completed, cancelled")
    eta: Optional[datetime] = None

# 4. Read Task (With Assignments)
class TaskAssignmentResponse(BaseModel):
    team_id: UUID
    team_name: str
    status: str
    eta: Optional[datetime]
    arrived_at: Optional[datetime]

class TaskResponse(BaseModel):
    task_id: UUID
    disaster_id: UUID
    task_type: str
    description: str
    priority: str
    status: str
    latitude: float
    longitude: float
    created_at: datetime
    assignments: List[TaskAssignmentResponse] = [] # Teams working on this
```

-----

### **2. Endpoints**

#### **A. `POST /disasters/{disaster_id}/tasks`**

  * **Purpose:** Create a new objective (e.g., "Evacuate Nursing Home").
  * **Role:** Commander.
  * **Input:** `TaskCreateRequest`.
  * **Logic:**
    1.  Create `DisasterTask` object.
    2.  **Geo:** Convert Lat/Lon to WKT Point.
    3.  Set `created_by_commander_id` = `current_user.id`.
    4.  Set `status` = 'pending'.
  * **Returns:** `TaskResponse` (Empty assignments list).

#### **B. `GET /disasters/{disaster_id}/tasks`**

  * **Purpose:** Operational Board.
  * **Role:** Commander (Read/Write), Responder (Read Own).
  * **Filters:** `status`, `priority`, `my_team_only` (boolean).
  * **Logic:**
      * **Base Query:** `disaster_tasks` joined with `disaster_task_assignments` joined with `teams`.
      * **Aggregation:** Since one task can have multiple teams, the serializer needs to group assignments under the task.
      * **Geo:** Convert Task Location to Lat/Lon.
  * **Returns:** List of `TaskResponse`.

#### **C. `POST /tasks/{task_id}/assignments`**

  * **Purpose:** Dispatch a team.
  * **Role:** Commander.
  * **Input:** `TaskAssignmentRequest` (Team ID).
  * **Logic:**
    1.  **Verify:** Check if Team is already assigned.
    2.  **Insert:** Create row in `disaster_task_assignments`.
    3.  **Update Task:** If task status was 'pending', update to 'in\_progress'.
    4.  **Update Team:** Update `teams.status` to 'deployed'.
    5.  **Notification:** (Future) Push notification to Team Leader.
  * **Returns:** `{"message": "Team dispatched"}`.

#### **D. `PATCH /tasks/{task_id}/assignments/{team_id}/status`**

  * **Purpose:** The Logistician updates the Commander ("We are on scene").
  * **Role:** Responder (specifically the Team Leader/Logistician).
  * **Input:** `AssignmentStatusUpdate`.
  * **Logic:**
    1.  **Verify User:** Check if `current_user` belongs to `team_id`.
    2.  **Update Assignment:**
          * Set `status` (en\_route, on\_scene, etc.).
          * Handle timestamps:
              * If `on_scene` -\> Set `arrived_at = NOW()`.
              * If `completed` -\> Set `released_at = NOW()`.
    3.  **Update Team:** If completed/cancelled, set `teams.status` back to 'available'.
    4.  **Check Task Completion (Optional Auto-Logic):**
          * Check if *all* assignments for this task are 'completed'.
          * If yes, update parent `disaster_tasks.status` to 'completed'.
  * **Returns:** Updated Assignment status.

#### **E. `PATCH /tasks/{task_id}/status`**

  * **Purpose:** Commander manually overrides task status (e.g., "Cancelled").
  * **Role:** Commander.
  * **Input:** `{"status": "cancelled"}`.
  * **Logic:** Update `disaster_tasks` table directly.
