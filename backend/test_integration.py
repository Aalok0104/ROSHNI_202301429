import asyncio
import pytest
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.database import ASYNC_SQLALCHEMY_DATABASE_URL
from app.models.news_models import Newspaper, NewsState, NewsCity
from app.services.news_scraper import fetch_all_news
from app.ml.news_classifier import classifier

pytestmark = pytest.mark.skip(reason="Full pipeline integration test requires seeded data and external resources")

# Environment setup for legacy Keras usage
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

TEST_CITY = "Chennai"
TEST_STATE = "Tamil Nadu"
TEST_KEYWORD = "rain"


async def get_prioritized_newspapers(city_name: str, state_name: str):
    """Return 1 local + up to 5 national newspapers replicating legacy selection logic."""
    engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Local (non-national) papers for city/state
        local_query = (
            select(Newspaper)
            .join(NewsCity, Newspaper.city_id == NewsCity.id)
            .join(NewsState, NewsCity.state_id == NewsState.id)
            .where(NewsCity.name.ilike(f"%{city_name}%"))
            .where(NewsState.name.ilike(f"%{state_name}%"))
            .where(Newspaper.is_national == False)  # noqa: E712
        )
        local_result = await session.execute(local_query)
        local_papers = local_result.scalars().all()

        # National papers
        national_query = select(Newspaper).where(Newspaper.is_national == True)  # noqa: E712
        national_result = await session.execute(national_query)
        national_papers = national_result.scalars().all()

        prioritized = []
        if local_papers:
            prioritized.append(local_papers[0])
        prioritized.extend(national_papers[:5])

        if not prioritized:
            logger.warning("No newspapers (local or national) found; seed likely missing.")
            return []

        from urllib.parse import urlparse
        dicts = []
        for p in prioritized:
            rss = p.rss_url
            base_url = p.base_url
            if not base_url and rss:
                pr = urlparse(rss)
                if pr.scheme and pr.netloc:
                    base_url = f"{pr.scheme}://{pr.netloc}"
            dicts.append({
                "name": p.name,
                "rss_url": rss,
                "rss_feed_url": rss,
                "base_url": base_url,
                "city": city_name,
                "state": state_name,
            })
        return dicts


@pytest.mark.asyncio
async def test_full_pipeline():
    print("\n" + "=" * 60)
    print(f"🚀  TESTING FULL PIPELINE: {TEST_CITY}, {TEST_STATE}")
    print("=" * 60)

    print("\n1️⃣   Fetching newspapers from DB...")
    newspaper_dicts = await get_prioritized_newspapers(TEST_CITY, TEST_STATE)
    if not newspaper_dicts:
        print("❌  Aborting: No newspapers found (seed data missing?).")
        return
    print(f"✅  Loaded prioritized set of {len(newspaper_dicts)} newspapers (1 local + up to 5 national).")

    print(f"\n2️⃣   Scraping for keyword '{TEST_KEYWORD}'...")
    articles = await fetch_all_news(newsletter := newspaper_dicts, user_keyword=TEST_KEYWORD)
    if not articles:
        print("⚠️  Scraper returned 0 articles (possibly no matching recent news or IMD alerts).")
        return
    print(f"✅  Scraper produced {len(articles)} items (includes IMD alerts + articles).")

    print("\n3️⃣   Running BERT classification...")
    texts = [f"{a['title']} {a.get('description','')}" for a in articles]
    try:
        preds = await asyncio.to_thread(classifier.predict, texts)
    except Exception as e:
        print(f"❌  Prediction failed: {e}")
        return
    print(f"✅  Classified {len(preds)} items.")

    print("\n" + "=" * 60)
    print("📊  RESULTS")
    print("=" * 60)
    real = fake = 0
    for i, (article, pred) in enumerate(zip(articles, preds), start=1):
        label = pred['prediction']
        conf = pred['confidence'] * 100 if pred.get('confidence') is not None else 0
        is_fake = label.upper() == 'FAKE'
        if is_fake:
            fake += 1
        else:
            real += 1
        icon = '🔴 FAKE' if is_fake else '🟢 REAL'
        print(f"[{i}] {icon} ({conf:.1f}%) | {article['title'][:80]}...")
        print(f"     Source: {article.get('newspaper_name','IMD')}  Link: {article.get('link','N/A')}")
    print("-" * 60)
    print(f"Summary: {real} REAL, {fake} FAKE")


if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
