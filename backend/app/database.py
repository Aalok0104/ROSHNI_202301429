from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Reuse the engine/SessionLocal from main.py or centralize here
Base = declarative_base()