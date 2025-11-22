from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user_family_models import User
from app.models.questionnaires_and_logs import (
    QuestionTemplate, DisasterQuestionState, DisasterLog
)
from app.schemas.surveys import (
    SurveyQuestionResponse, SurveyAnswerRequest, SurveySubmitResponse
)

router = APIRouter(prefix="/surveys", tags=["Surveys & Questionnaires"])

@router.get("/pending", response_model=Optional[SurveyQuestionResponse])
async def get_pending_survey(
    disaster_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch all active templates
    stmt_templates = select(QuestionTemplate).where(QuestionTemplate.is_active == 1)
    result_templates = await db.execute(stmt_templates)
    templates = result_templates.scalars().all()
    
    if not templates:
        return None

    # 2. Check cooldowns for this user & disaster
    # We want to find a question that hasn't been answered recently by ANYONE (global cooldown)
    # OR specifically by this user (user cooldown). 
    # The prompt implies a general "system needs info" check.
    # Let's implement a simple logic: Find a question where the 'state' for this disaster
    # shows it hasn't been answered in X time.
    
    # Fetch states for this disaster
    stmt_states = select(DisasterQuestionState).where(
        DisasterQuestionState.disaster_id == disaster_id
    )
    result_states = await db.execute(stmt_states)
    states = {s.question_template_id: s for s in result_states.scalars().all()}
    
    candidate_questions = []
    cooldown_threshold = timedelta(hours=1)
    now = datetime.utcnow() # Using utcnow as per existing code style, though deprecated

    for tmpl in templates:
        state = states.get(tmpl.question_id)
        
        is_fresh = False
        if not state:
            is_fresh = True
        elif state.last_answered_at:
            if (now - state.last_answered_at) > cooldown_threshold:
                is_fresh = True
        else:
            is_fresh = True
            
        if is_fresh:
            candidate_questions.append(tmpl)
    
    if not candidate_questions:
        return None
        
    # 3. Pick one (Random or First)
    import random
    selected = random.choice(candidate_questions)

    return SurveyQuestionResponse(
        question_id=selected.question_id,
        key=selected.key,
        question_text=selected.question_text,
        answer_type=selected.answer_type,
        choices=selected.metadata_ or [],
    )

@router.post("/{question_id}/answer", response_model=SurveySubmitResponse)
async def submit_answer(
    question_id: UUID,
    payload: SurveyAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify Question
    stmt = select(QuestionTemplate).where(QuestionTemplate.question_id == question_id)
    res = await db.execute(stmt)
    question = res.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # 2. Update State (Upsert)
    # Check if state exists
    stmt_state = select(DisasterQuestionState).where(
        DisasterQuestionState.disaster_id == payload.disaster_id,
        DisasterQuestionState.question_id == question_id,
    )
    res_state = await db.execute(stmt_state)
    state = res_state.scalar_one_or_none()
    
    now = datetime.utcnow()
    
    if state:
        state.last_answer_value = str(payload.answer_value)
        state.last_answered_at = now
        state.last_answered_by_user_id = current_user.user_id
    else:
        state = DisasterQuestionState(
            disaster_id=payload.disaster_id,
            question_id=question_id,
            last_answer_value=str(payload.answer_value),
            last_answered_at=now,
            last_answered_by_user_id=current_user.user_id,
        )
        db.add(state)
    
    # 3. Create Log
    log_text = f"User answered '{question.question_text}' with: {payload.answer_value}"
    
    new_log = DisasterLog(
        disaster_id=payload.disaster_id,
        created_by_user_id=current_user.user_id,
        source_type="question_answer",
        text_body=log_text,
        # Map specific keys to columns if needed
        # e.g. if question.key == 'deaths', set num_deaths
    )
    
    # Simple mapping logic based on key
    if question.key == "deaths_seen":
        try:
            new_log.num_deaths = int(payload.answer_value)
        except: pass
    elif question.key == "injuries_seen":
        try:
            new_log.num_injuries = int(payload.answer_value)
        except: pass
        
    db.add(new_log)
    await db.commit()
    await db.refresh(new_log)
    
    return SurveySubmitResponse(log_id=new_log.log_id)
