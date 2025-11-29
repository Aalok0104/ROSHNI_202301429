"""
Database models for disaster news feature.
Uses SQLAlchemy 2.0 with strict typing (Mapped).
"""
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, JSON, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.database import Base


class NewsState(Base):
    """State model for news organization."""
    
    __tablename__ = "news_states"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    
    # Relationships
    cities: Mapped[List["NewsCity"]] = relationship(
        "NewsCity", 
        back_populates="state", 
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<NewsState(id={self.id}, name='{self.name}')>"


class NewsCity(Base):
    """City model for news organization."""
    
    __tablename__ = "news_cities"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("news_states.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Relationships
    state: Mapped["NewsState"] = relationship("NewsState", back_populates="cities")
    newspapers: Mapped[List["Newspaper"]] = relationship(
        "Newspaper", 
        back_populates="city", 
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<NewsCity(id={self.id}, name='{self.name}', state_id={self.state_id})>"


class Newspaper(Base):
    """Newspaper model with extended fields for legacy disaster scraping logic.

    Added fields:
    - is_national: Whether newspaper is a national-level source (legacy feature selects priority nationals)
    - base_url: Root website URL used for section crawling fallback when RSS insufficient

    A compatibility property `rss_feed_url` mirrors legacy attribute naming.
    """

    __tablename__ = "newspapers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    rss_url: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # may be derived from rss if not provided
    is_national: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0", default=False)
    city_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("news_cities.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Relationships
    city: Mapped["NewsCity"] = relationship("NewsCity", back_populates="newspapers")

    # Legacy compatibility: original scraper expects `rss_feed_url`
    @property
    def rss_feed_url(self) -> str:
        return self.rss_url

    def __repr__(self) -> str:
        return (
            f"<Newspaper(id={self.id}, name='{self.name}', city_id={self.city_id}, "
            f"is_national={self.is_national})>"
        )


class NewsAnalysisLog(Base):
    """Log model to store history of news analysis requests."""
    
    __tablename__ = "news_analysis_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    commander_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    city_name: Mapped[str] = mapped_column(String(100), nullable=False)
    state_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    keyword: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False,
        server_default=func.now(),
        index=True
    )
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    total_articles: Mapped[int] = mapped_column(Integer, default=0)
    fake_count: Mapped[int] = mapped_column(Integer, default=0)
    real_count: Mapped[int] = mapped_column(Integer, default=0)
    
    def __repr__(self) -> str:
        return (
            f"<NewsAnalysisLog(id={self.id}, user={self.commander_user_id}, "
            f"city='{self.city_name}', timestamp={self.timestamp})>"
        )
