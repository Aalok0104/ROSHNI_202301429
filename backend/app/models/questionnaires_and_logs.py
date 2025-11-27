from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class DisasterFollower(Base):
    __tablename__ = "disaster_followers"

    disaster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disasters.disaster_id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    followed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"<DisasterFollower disaster_id={self.disaster_id} user_id={self.user_id}>"


class QuestionTemplate(Base):
    __tablename__ = "question_templates"

    question_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    key = Column(String(100), nullable=False, unique=True)
    question_text = Column(Text, nullable=False)
    answer_type = Column(String(20), nullable=False)
    # column name in DB is 'metadata', but avoid clashing with SQLAlchemy's metadata
    metadata_ = Column("metadata", JSONB)
    is_active = Column(Integer, nullable=False, server_default="1")

    __table_args__ = (
        CheckConstraint(
            "answer_type IN ('boolean', 'integer', 'text', 'choice')",
            name="ck_question_answer_type",
        ),
    )

    def __repr__(self) -> str:
        return f"<QuestionTemplate question_id={self.question_id} key={self.key!r}>"


class DisasterQuestionState(Base):
    __tablename__ = "disaster_question_states"

    disaster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disasters.disaster_id", ondelete="CASCADE"),
        primary_key=True,
    )
    question_id = Column(
        UUID(as_uuid=True),
        ForeignKey("question_templates.question_id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_answer_value = Column(Text)
    last_answered_at = Column(DateTime(timezone=True))
    last_answered_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )

    def __repr__(self) -> str:
        return (
            f"<DisasterQuestionState disaster_id={self.disaster_id} "
            f"question_id={self.question_id}>"
        )


class DisasterLog(Base):
    __tablename__ = "disaster_logs"

    log_id = Column(
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
    source_type = Column(String(20), nullable=False)
    title = Column(String(255))
    text_body = Column(Text)
    num_deaths = Column(Integer)
    num_injuries = Column(Integer)
    estimated_damage_cost = Column(Numeric(20, 2))
    estimated_resource_cost = Column(Numeric(20, 2))
    firefighter_required = Column(Integer)
    medic_required = Column(Integer)
    police_required = Column(Integer)
    help_required = Column(Integer)
    food_required_for_people = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "source_type IN "
            "('user_input', 'tweet', 'news_article', 'sensor', 'system', 'question_answer')",
            name="ck_disaster_log_source_type",
        ),
    )

    media_items = None  # relationship set below

    def __repr__(self) -> str:
        return f"<DisasterLog log_id={self.log_id} disaster_id={self.disaster_id}>"


class IncidentMedia(Base):
    __tablename__ = "incident_media"

    media_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.incident_id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    file_type = Column(String(20), nullable=False)
    mime_type = Column(String(100))
    storage_path = Column(String(1024), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "file_type IN ('image', 'video', 'audio', 'document')",
            name="ck_incident_media_file_type",
        ),
    )

    incident = None  # relationship set below

    def __repr__(self) -> str:
        return f"<IncidentMedia media_id={self.media_id} incident_id={self.incident_id}>"


class DisasterMedia(Base):
    __tablename__ = "disaster_media"

    media_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    log_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disaster_logs.log_id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    file_type = Column(String(20), nullable=False)
    mime_type = Column(String(100))
    storage_path = Column(String(1024), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "file_type IN ('image', 'video', 'audio', 'document')",
            name="ck_disaster_media_file_type",
        ),
    )

    log = None  # relationship set below

    def __repr__(self) -> str:
        return f"<DisasterMedia media_id={self.media_id} log_id={self.log_id}>"


class DisasterChatMessage(Base):
    __tablename__ = "disaster_chat_messages"

    message_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    disaster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disasters.disaster_id", ondelete="CASCADE"),
        nullable=False,
    )
    # Make team_id a plain UUID (no foreign key constraint) so that messages
    # can reference team IDs that may not exist in the teams table. Tests and
    # summary logic will check for the Team record at runtime and nullify
    # the field if the team does not exist.
    team_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )
    sender_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    message_text = Column(Text, nullable=False)
    is_global = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"<DisasterChatMessage message_id={self.message_id} disaster_id={self.disaster_id}>"


from sqlalchemy.orm import relationship
from app.models.disaster_management import Incident

DisasterLog.media_items = relationship(
    "DisasterMedia",
    backref="log",
    cascade="all, delete-orphan",
)

Incident.media_items = relationship(
    "IncidentMedia",
    backref="incident",
    cascade="all, delete-orphan",
)

DisasterChatMessage.sender = relationship("User")
# Note: we intentionally do NOT create a relationship to Team here because
# `team_id` is treated as an opaque UUID reference and may not point to an
# existing `teams` row. The summary endpoint resolves teams at runtime.
