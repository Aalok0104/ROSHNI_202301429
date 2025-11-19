from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    reported_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    title = Column(String(255), nullable=False)
    description = Column(Text)
    incident_type = Column(String(50))
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    status = Column(String(20), nullable=False, server_default="open")
    reported_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'converted', 'discarded')",
            name="ck_incident_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<Incident incident_id={self.incident_id} title={self.title!r}>"


class Disaster(Base):
    __tablename__ = "disasters"

    disaster_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    reported_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    source_incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.incident_id", ondelete="SET NULL"),
    )
    commander_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(30), nullable=False, server_default="active")
    disaster_type = Column(String(50))
    severity_level = Column(String(20))
    estimated_injuries = Column(Integer)
    estimated_casualties = Column(Integer)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    affected_area = Column(Geometry(geometry_type="POLYGON", srid=4326))
    reported_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    resolved_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'under_investigation', 'ongoing', "
            "'contained', 'resolved', 'false_alarm')",
            name="ck_disaster_status",
        ),
        CheckConstraint(
            "severity_level IS NULL OR severity_level IN "
            "('low', 'medium', 'high', 'critical')",
            name="ck_disaster_severity",
        ),
    )

    tasks = None  # set via relationship below

    def __repr__(self) -> str:
        return f"<Disaster disaster_id={self.disaster_id} title={self.title!r}>"


class DisasterTask(Base):
    __tablename__ = "disaster_tasks"

    task_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    disaster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disasters.disaster_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_commander_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    task_type = Column(String(30), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, server_default="pending")
    priority = Column(String(20), server_default="medium")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'cancelled')",
            name="ck_disaster_task_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high')",
            name="ck_disaster_task_priority",
        ),
    )

    disaster = None
    assignments = None  # set via relationship below

    def __repr__(self) -> str:
        return f"<DisasterTask task_id={self.task_id} disaster_id={self.disaster_id}>"


class DisasterTaskAssignment(Base):
    __tablename__ = "disaster_task_assignments"

    task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disaster_tasks.task_id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.team_id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    assigned_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(20), nullable=False, server_default="assigned")
    eta = Column(DateTime(timezone=True))
    arrived_at = Column(DateTime(timezone=True))
    released_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('assigned', 'en_route', 'on_scene', 'completed', 'cancelled')",
            name="ck_disaster_task_assignment_status",
        ),
    )

    task = None
    team = None  # relationships set below

    def __repr__(self) -> str:
        return (
            f"<DisasterTaskAssignment task_id={self.task_id} "
            f"team_id={self.team_id}>"
        )


from sqlalchemy.orm import relationship  # noqa: E402

Disaster.tasks = relationship(
    "DisasterTask",
    backref="disaster",
    cascade="all, delete-orphan",
)

DisasterTask.assignments = relationship(
    "DisasterTaskAssignment",
    backref="task",
    cascade="all, delete-orphan",
)

DisasterTaskAssignment.team = relationship("Team")
Disaster.source_incident = relationship("Incident", foreign_keys=[Disaster.source_incident_id])
