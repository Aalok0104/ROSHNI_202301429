"""Centralized newspaper prioritization logic.

Exports build_prioritized_newspaper_dicts used by router and tests.
Selection rule: 1 local (non-national) matching city/state + up to 5 national.
"""
from typing import List, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.news_models import Newspaper, NewsCity, NewsState
from urllib.parse import urlparse

MAX_NATIONAL = 5

async def build_prioritized_newspaper_dicts(db: AsyncSession, state_id: int, city_name: str) -> List[Dict]:
    """Return prioritized newspaper dicts for scraping.

    Args:
        db: AsyncSession
        state_id: requested state id
        city_name: requested city name (partial match, case-insensitive)
    """
    # Local papers
    local_query = (
        select(Newspaper)
        .join(NewsCity, Newspaper.city_id == NewsCity.id)
        .join(NewsState, NewsCity.state_id == NewsState.id)
        .where(NewsState.id == state_id)
        .where(NewsCity.name.ilike(f"%{city_name}%"))
        .where(Newspaper.is_national == False)  # noqa: E712
    )
    local_papers = (await db.execute(local_query)).scalars().all()

    # National papers
    national_query = select(Newspaper).where(Newspaper.is_national == True)  # noqa: E712
    national_papers = (await db.execute(national_query)).scalars().all()

    prioritized = []
    if local_papers:
        prioritized.append(local_papers[0])
    prioritized.extend(national_papers[:MAX_NATIONAL])

    result: List[Dict] = []
    for paper in prioritized:
        base_url = paper.base_url
        if not base_url and paper.rss_url:
            parsed = urlparse(paper.rss_url)
            if parsed.scheme and parsed.netloc:
                base_url = f"{parsed.scheme}://{parsed.netloc}"
        result.append({
            'name': paper.name,
            'rss_url': paper.rss_url,
            'rss_feed_url': paper.rss_url,  # legacy alias
            'base_url': base_url,
            'city': city_name,
            'state': None,
        })
    return result
