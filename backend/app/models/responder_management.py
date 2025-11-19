from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class Team(Base):
    __tablename__ = "teams"

    team_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    name = Column(String(255), nullable=False)
    team_type = Column(String(30), nullable=False)
    commander_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    status = Column(String(20), nullable=False, server_default="available")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "team_type IN ('medic', 'fire', 'police', 'mixed', 'disaster_response')",
            name="ck_team_type",
        ),
        CheckConstraint(
            "status IN ('available', 'deployed', 'offline')",
            name="ck_team_status",
        ),
    )

    responder_profiles = None  # set via relationship below

    def __repr__(self) -> str:
        return f"<Team team_id={self.team_id} name={self.name!r}>"


class ResponderProfile(Base):
    __tablename__ = "responder_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.team_id", ondelete="SET NULL"),
    )
    responder_type = Column(String(30), nullable=False)
    badge_number = Column(String(50))
    government_id_number = Column(String(100))
    qualifications = Column(Text)
    created_by_commander_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(20), nullable=False, server_default="active")
    team_joined_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "responder_type IN "
            "('medic', 'firefighter', 'police', 'disaster_responder', 'logistician')",
            name="ck_responder_type",
        ),
        CheckConstraint(
            "status IN ('active', 'suspended', 'retired')",
            name="ck_responder_status",
        ),
    )

    team = None  # set via relationship below

    def __repr__(self) -> str:
        return f"<ResponderProfile user_id={self.user_id} responder_type={self.responder_type!r}>"


from sqlalchemy.orm import relationship  # noqa: E402

Team.responder_profiles = relationship(
    "ResponderProfile",
    backref="team",
    cascade="all, delete-orphan",
)
