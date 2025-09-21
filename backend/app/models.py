from sqlalchemy import Column, Integer, String
from geoalchemy2 import Geometry
from .database import Base  # Adjust import based on your structure

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    geom = Column(Geometry('POINT', srid=4326))  # Example PostGIS geometry