from uuid import uuid4

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(SmallInteger, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

    # Relationships
    users = None  # defined on User to avoid circular hints

    def __repr__(self) -> str:
        return f"<Role role_id={self.role_id} name={self.name!r}>"


class User(Base):
    __tablename__ = "users"

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    role_id = Column(
        SmallInteger,
        ForeignKey("roles.role_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    phone_number = Column(String(20), unique=True)
    email = Column(String(255), unique=True)
    provider_id = Column(String(255))
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    last_known_location = Column(Geometry(geometry_type="POINT", srid=4326))
    last_location_at = Column(DateTime(timezone=True))

    # Relationships (only those within this file for now)
    role = None          # will be configured after class definition
    profile = None       # UserProfile
    medical_profile = None  # UserMedicalProfile

    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
        UniqueConstraint("phone_number", name="uq_user_phone_number"),
    )

    def __repr__(self) -> str:
        return f"<User user_id={self.user_id} email={self.email!r}>"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date)
    address = Column(Text)
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))

    # Relationships
    user = None  # set after class definition

    def __repr__(self) -> str:
        return f"<UserProfile user_id={self.user_id} full_name={self.full_name!r}>"


class UserMedicalProfile(Base):
    __tablename__ = "user_medical_profiles"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    public_user_code = Column(String(50), nullable=False, unique=True)
    blood_group = Column(String(5))
    known_allergies = Column(Text)
    chronic_conditions = Column(Text)
    current_medications = Column(Text)
    other_medical_notes = Column(Text)
    consent_flags = Column(
        JSONB,
        nullable=False,
        server_default="{}",
    )

    # Relationships
    user = None  # set after class definition

    def __repr__(self) -> str:
        return (
            f"<UserMedicalProfile user_id={self.user_id} "
            f"public_user_code={self.public_user_code!r}>"
        )


# Define relationships after class declaration to keep things tidy
from sqlalchemy.orm import relationship  # noqa: E402

Role.users = relationship("User", backref="role")

User.profile = relationship(
    "UserProfile",
    backref="user",
    uselist=False,
    cascade="all, delete-orphan",
)

User.medical_profile = relationship(
    "UserMedicalProfile",
    backref="user",
    uselist=False,
    cascade="all, delete-orphan",
)
