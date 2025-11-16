import uuid

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, TSVECTOR, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
from sqlalchemy.types import TypeDecorator

from .database import Base


class JSONBCompat(TypeDecorator):
    """Fallback to generic JSON when PostgreSQL-specific JSONB is unavailable."""

    impl = JSONB
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB(astext_type=Text()))
        return dialect.type_descriptor(JSON())


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(20), unique=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False, server_default=text("''"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    emergency_contacts = relationship(
        "EmergencyContact", back_populates="user", cascade="all, delete-orphan"
    )
    disaster_reports = relationship(
        "DisasterReport", back_populates="user", cascade="all, delete-orphan"
    )
    family_requests_made = relationship(
        "UserFamilyLink",
        foreign_keys="[UserFamilyLink.requestor_user_id]",
        back_populates="requestor_user",
        cascade="all, delete-orphan",
    )
    family_requests_received = relationship(
        "UserFamilyLink",
        foreign_keys="[UserFamilyLink.requested_user_id]",
        back_populates="requested_user",
        cascade="all, delete-orphan",
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    full_name = Column(String(255), nullable=False)
    address = Column(Text)
    date_of_birth = Column(Date)
    privacy_settings = Column(JSONBCompat(), nullable=False, default=dict)
    medical_info = Column(JSONBCompat(), nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="user_roles")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False)
    relationship_label = Column("relationship", String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="emergency_contacts")


class UserFamilyLink(Base):
    __tablename__ = "user_family_links"

    requestor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    requested_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    status = Column(String(20), nullable=False, server_default=text("'pending'"))
    relationship_label = Column("relationship", String(100))

    requestor_user = relationship(
        "User",
        foreign_keys=[requestor_user_id],
        back_populates="family_requests_made",
    )
    requested_user = relationship(
        "User",
        foreign_keys=[requested_user_id],
        back_populates="family_requests_received",
    )

    _table_args_ = (
        CheckConstraint(
            "requestor_user_id <> requested_user_id", name="requestor_not_requested"
        ),
    )


class Disaster(Base):
    __tablename__ = "disasters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    disaster_type = Column(String(100))
    status = Column(String(50), server_default=text("'active'"))
    affected_area = Column(Geometry("POLYGON", srid=4326))
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True))


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disaster_id = Column(UUID(as_uuid=True), ForeignKey("disasters.id", ondelete="SET NULL"))
    reported_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    status = Column(String(50), server_default=text("'pending'"))
    severity_level = Column(String(20), server_default=text("'unknown'"))
    title = Column(String(255))
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
    )
    reporting_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_type = Column(String(50))
    text_description = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class MediaAttachment(Base):
    __tablename__ = "media_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incident_reports.id", ondelete="SET NULL"),
    )
    uploader_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_type = Column(String(20), nullable=False)
    mime_type = Column(String(100))
    storage_path = Column(String(1024), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VoiceTranscription(Base):
    __tablename__ = "voice_transcriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_attachment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("media_attachments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    transcribed_text = Column(Text)
    confidence_score = Column(Float)
    language_code = Column(String(10))
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
    search_vector = Column(TSVECTOR)


class IncidentTriageLog(Base):
    __tablename__ = "incident_triage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
    )
    triage_source = Column(String(50))
    severity_assessment = Column(String(20), nullable=False)
    reasoning = Column(Text)
    confidence_score = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class SafeZone(Base):
    __tablename__ = "safe_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    zone_type = Column(String(50), nullable=False)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    capacity = Column(Integer)
    current_occupancy = Column(Integer, server_default=text("0"))
    status = Column(String(50), server_default=text("'open'"))
    contact_phone = Column(String(20))


class InfoFeed(Base):
    __tablename__ = "info_feeds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)
    verification_status = Column(String(50), server_default=text("'verified'"))


class InfoMessage(Base):
    __tablename__ = "info_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feed_id = Column(Integer, ForeignKey("info_feeds.id"), nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String(2048))
    affected_area = Column(Geometry("POLYGON", srid=4326))
    published_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sent_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)
    target_area = Column(Geometry("POLYGON", srid=4326), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())


class AlertRecipient(Base):
    __tablename__ = "alert_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    delivery_method = Column(String(20))
    status = Column(String(20), server_default=text("'sent'"))
    status_updated_at = Column(DateTime(timezone=True))


class ResponderTeam(Base):
    __tablename__ = "responder_teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    team_lead_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    team_type = Column(String(50))
    status = Column(String(50), server_default=text("'available'"))


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(
        UUID(as_uuid=True), ForeignKey("responder_teams.id", ondelete="CASCADE"), primary_key=True
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class ResourceType(Base):
    __tablename__ = "resource_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    capabilities = Column(JSONBCompat())


class ResourceInventory(Base):
    __tablename__ = "resource_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_id = Column(Integer, ForeignKey("resource_types.id"), nullable=False)
    identifier = Column(String(100), unique=True)
    status = Column(String(50), server_default=text("'available'"))
    current_location = Column(Geometry("POINT", srid=4326))
    last_location_update = Column(DateTime(timezone=True))


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(UUID(as_uuid=True), ForeignKey("responder_teams.id", ondelete="SET NULL"))
    resource_id = Column(
        UUID(as_uuid=True), ForeignKey("resource_inventory.id", ondelete="SET NULL")
    )
    dispatched_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String(50), server_default=text("'assigned'"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    eta = Column(DateTime(timezone=True))
    arrived_at = Column(DateTime(timezone=True))
    released_at = Column(DateTime(timezone=True))


class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QuestionnaireQuestion(Base):
    __tablename__ = "questionnaire_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questionnaire_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaires.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50))
    options = Column(JSONBCompat())
    display_order = Column(Integer)


class QuestionnairePush(Base):
    __tablename__ = "questionnaire_pushes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questionnaire_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaires.id", ondelete="CASCADE"),
        nullable=False,
    )
    pushed_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_area = Column(Geometry("POLYGON", srid=4326), nullable=False)
    pushed_at = Column(DateTime(timezone=True), server_default=func.now())


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    push_id = Column(
        UUID(as_uuid=True), ForeignKey("questionnaire_pushes.id", ondelete="CASCADE"), nullable=False
    )
    question_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaire_questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    response = Column(Text, nullable=False)
    response_location = Column(Geometry("POINT", srid=4326))
    responded_at = Column(DateTime(timezone=True), server_default=func.now())


class UserLocationLog(Base):
    __tablename__ = "user_location_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), primary_key=True)

    _table_args_ = (
        {
            "postgresql_partition_by": "RANGE (timestamp)",
        },
    )
    # Note: You will need to create partitions for this table manually in PostgreSQL
    # e.g., CREATE TABLE user_location_logs_2025_11 PARTITION OF user_location_logs ...


class ComplianceAuditLog(Base):
    __tablename__ = "compliance_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    target_entity_type = Column(String(50))
    target_entity_id = Column(UUID(as_uuid=True))
    ip_address = Column(INET)
    user_agent = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    changes_made = Column(JSONBCompat())


class DisasterReport(Base):
    __tablename__ = "disaster_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="reported")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="disaster_reports")


class DisasterAssignment(Base):
    __tablename__ = "disaster_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disaster_id = Column(Integer, ForeignKey("disaster_reports.id"), nullable=False)
    responder_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    disaster = relationship("DisasterReport")
    responder = relationship("User")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generated_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_type = Column(String(50))
    storage_path = Column(String(1024))
    data_summary = Column(JSONBCompat())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatGroup(Base):
    __tablename__ = "chat_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    members = relationship("ChatGroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="group", cascade="all, delete-orphan")


class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"

    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("ChatGroup", back_populates="members")
    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_groups.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    message_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("ChatGroup", back_populates="messages")
    sender = relationship("User")

