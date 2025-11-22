from pydantic import BaseModel, Field, ConfigDict
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
    estimated_deaths: Optional[int] = None
    estimated_casualties: Optional[int] = None
    damage_summary: Optional[str] = None
    resources_used_summary: Optional[str] = None
    timeline_json: List[TimelineEvent] = []

    model_config = ConfigDict(from_attributes=True)

# 3. Edit Request (Commander corrects AI)
class ReportUpdateRequest(BaseModel):
    estimated_deaths: Optional[int] = None
    estimated_casualties: Optional[int] = None
    damage_summary: Optional[str] = None
    resources_used_summary: Optional[str] = None
    # Full replacement of timeline
    timeline_json: Optional[List[TimelineEvent]] = None
