from pydantic import BaseModel, Field, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)

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
