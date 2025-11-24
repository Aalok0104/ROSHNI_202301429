from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database import get_db
from app.dependencies import RoleChecker
from app.models.user_family_models import User
from app.models.draft_reports import DisasterReportDraft
from app.schemas.reports import ReportResponse, ReportUpdateRequest, TimelineEvent

router = APIRouter(prefix="/reports", tags=["Disaster Reports"])

# --- Mock Services ---
class MockLLMService:
    @staticmethod
    def generate_report(context: str) -> dict:
        return {
            "estimated_deaths": 12,
            "estimated_casualties": 45,
            "damage_summary": "Severe structural damage to residential areas.",
            "resources_used_summary": "3 Fire trucks, 5 Ambulances deployed.",
            "timeline_json": [
                {"time": "10:00", "event": "Incident Reported"},
                {"time": "10:15", "event": "First Responders Arrived"}
            ]
        }

class MockPDFService:
    @staticmethod
    def create_pdf(data: dict) -> bytes:
        return b"%PDF-1.4 ... Mock PDF Content ..."

# --- Endpoints ---

@router.post("/disasters/{disaster_id}/generate", response_model=ReportResponse)
async def generate_report_draft(
    disaster_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    # 1. Mock Data Aggregation (In real app, fetch logs/stats)
    context = "Mock Context Data"
    
    # 2. LLM Call
    generated_data = MockLLMService.generate_report(context)
    
    # 3. Versioning
    stmt = select(func.max(DisasterReportDraft.version_number)).where(
        DisasterReportDraft.disaster_id == disaster_id
    )
    result = await db.execute(stmt)
    max_version = result.scalar() or 0
    next_version = max_version + 1
    
    # 4. Save Draft
    new_report = DisasterReportDraft(
        disaster_id=disaster_id,
        created_by_user_id=current_user.user_id,
        version_number=next_version,
        status="draft",
        generated_at=datetime.utcnow(),
        **generated_data
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    
    return new_report

@router.get("/disasters/{disaster_id}/reports", response_model=List[ReportResponse])
async def list_reports(
    disaster_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DisasterReportDraft).where(
        DisasterReportDraft.disaster_id == disaster_id
    ).order_by(desc(DisasterReportDraft.version_number))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DisasterReportDraft).where(DisasterReportDraft.report_id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: UUID,
    payload: ReportUpdateRequest,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DisasterReportDraft).where(DisasterReportDraft.report_id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
        
    # report.generated_at = datetime.utcnow() # Optional: Update timestamp
    
    await db.commit()
    await db.refresh(report)
    return report

@router.get("/{report_id}/pdf")
async def export_pdf(
    report_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DisasterReportDraft).where(DisasterReportDraft.report_id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Generate PDF
    pdf_content = MockPDFService.create_pdf(report.__dict__)
    
    # Update status
    if report.status != "final":
        report.status = "final"
        await db.commit()
        
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report.version_number}.pdf"}
    )


@router.delete("/{report_id}")
async def delete_report(
    report_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DisasterReportDraft).where(DisasterReportDraft.report_id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.delete(report)
    await db.commit()
    return {"message": "Report deleted"}
