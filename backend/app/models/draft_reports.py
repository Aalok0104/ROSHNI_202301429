from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class DisasterReportDraft(Base):
    __tablename__ = "disaster_report_drafts"

    report_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    disaster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disasters.disaster_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    version_number = Column(Integer, nullable=False)
    generated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(20), nullable=False, server_default="draft")
    disaster_name_snapshot = Column(String(255))
    estimated_deaths = Column(Integer)
    estimated_casualties = Column(Integer)
    resources_used_summary = Column(Text)
    damage_summary = Column(Text)
    timeline_json = Column(JSONB)
    pdf_storage_path = Column(String(1024))

    __table_args__ = (
        UniqueConstraint(
            "disaster_id",
            "version_number",
            name="uq_disaster_report_version",
        ),
        CheckConstraint(
            "status IN ('draft', 'final')",
            name="ck_disaster_report_status",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<DisasterReportDraft report_id={self.report_id} "
            f"disaster_id={self.disaster_id} version={self.version_number}>"
        )
