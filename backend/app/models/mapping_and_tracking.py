from geoalchemy2 import Geometry
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    BigInteger,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class MapSite(Base):
    __tablename__ = "map_sites"

    site_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4(),
    )
    name = Column(String(255), nullable=False)
    site_type = Column(String(50), nullable=False)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    capacity = Column(Integer)
    current_occupancy = Column(Integer)
    status = Column(String(20), nullable=False, server_default="open")
    contact_phone = Column(String(20))
    metadata_ = Column("metadata", JSONB)

    __table_args__ = (
        CheckConstraint(
            "site_type IN "
            "('safe_zone', 'hospital', 'police_station', "
            "'shelter', 'food_depot', 'critical_infrastructure')",
            name="ck_map_site_type",
        ),
        CheckConstraint(
            "status IN ('open', 'full', 'closed', 'damaged')",
            name="ck_map_site_status",
        ),
    )

    def __repr__(self) -> str:
        return f"<MapSite site_id={self.site_id} name={self.name!r}>"


class UserLocationLog(Base):
    __tablename__ = "user_location_logs"

    location_log_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    logged_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"<UserLocationLog location_log_id={self.location_log_id} user_id={self.user_id}>"
