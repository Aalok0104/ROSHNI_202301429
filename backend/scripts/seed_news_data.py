"""
Seed script for disaster news database tables.
Migrates data structure from legacy Flask SQLite to ROSHNI PostgreSQL.

Usage:
    python -m scripts.seed_news_data
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.news_models import NewsState, NewsCity, Newspaper


# Data from legacy seed_disaster_news_data.py
STATES_CITIES_DATA = {
    'Andaman and Nicobar Islands': [],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Tirupati'],
    'Arunachal Pradesh': ['Itanagar'],
    'Assam': ['Guwahati', 'Dibrugarh'],
    'Bihar': ['Patna', 'Gaya'],
    'Chandigarh': ['Chandigarh'],
    'Chhattisgarh': ['Raipur'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu'],
    'Delhi': ['New Delhi'],
    'Goa': ['Panaji', 'Madgaon', 'Vasco da Gama'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
    'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Hisar'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu'],
    'Jharkhand': ['Ranchi', 'Jamshedpur'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode'],
    'Ladakh': ['Leh', 'Kargil'],
    'Lakshadweep': ['Kavaratti'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    'Manipur': ['Imphal'],
    'Meghalaya': ['Shillong'],
    'Mizoram': ['Aizawl', 'Lunglei'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Odisha': ['Bhubaneswar', 'Cuttack'],
    'Puducherry': ['Puducherry'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Chandigarh'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
    'Sikkim': ['Gangtok', 'Gyalshing', 'Mangan'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
    'Telangana': ['Hyderabad', 'Warangal'],
    'Tripura': ['Agartala'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida'],
    'Uttarakhand': ['Dehradun', 'Haridwar'],
    'West Bengal': ['Kolkata', 'Siliguri']
}

"""Newspaper data (legacy parity) with RSS feeds.

Exact replication of legacy optimized list from `seed_disaster_news_data.py`.
Format retained: (name, rss_url, state_name_or_None)
National papers have state_name None and are tagged is_national=True.
"""
NEWSPAPER_DATA = [
    # National (legacy top 5)
    ("The New Indian Express", "https://www.newindianexpress.com/feed/", None),
    ("Hindustan Times", "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", None),
    ("NDTV News", "https://feeds.feedburner.com/ndtvnews-india-news", None),
    ("The Times of India", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", None),
    ("Deccan Chronicle", "https://www.deccanchronicle.com/rss.xml", None),

    # Regional
    ("The Hans India", "https://www.thehansindia.com/rss/andhra-pradesh", "Andhra Pradesh"),
    ("The Sentinel", "https://www.sentinelassam.com/feed", "Assam"),
    ("Central Chronicle", "https://centralchronicle.in/feed/", "Chhattisgarh"),
    ("The Tribune Haryana", "https://www.tribuneindia.com/rss/haryana", "Haryana"),
    ("The Tribune Himachal", "https://www.tribuneindia.com/rss/himachal", "Himachal Pradesh"),
    ("Deccan Herald", "https://www.deccanherald.com/rss/state", "Karnataka"),
    ("Manorama Online", "https://www.onmanorama.com/rss/news/kerala.xml", "Kerala"),
    ("Free Press Journal", "https://www.freepressjournal.in/indore/feed", "Madhya Pradesh"),
    ("The Indian Express Mumbai", "https://indianexpress.com/section/cities/mumbai/feed/", "Maharashtra"),
    ("The Shillong Times", "https://theshillongtimes.com/feed/", "Meghalaya"),
    ("Morung Express", "https://morungexpress.com/feed/", "Nagaland"),
    ("Sambad", "https://sambadenglish.com/feed/", "Odisha"),
    ("The Tribune Punjab", "https://www.tribuneindia.com/rss/punjab", "Punjab"),
    ("Rajasthan Patrika", "https://www.patrika.com/rss/jaipur-news.xml", "Rajasthan"),
    ("The New Indian Express TN", "https://www.newindianexpress.com/states/tamil-nadu/?widgetName=rssfeed&widgetId=1079991&getXmlFeed=true", "Tamil Nadu"),
    ("Telangana Today", "https://telanganatoday.com/feed", "Telangana"),
    ("The Times of India Lucknow", "https://timesofindia.indiatimes.com/rssfeeds/4118215.cms", "Uttar Pradesh"),
    ("Hindustan Times Dehradun", "https://www.hindustantimes.com/feeds/rss/dehradun/rssfeed.xml", "Uttarakhand"),
    ("The Telegraph", "https://www.telegraphindia.com/feeds/rss/west-bengal", "West Bengal"),
    ("Daily Excelsior", "https://www.dailyexcelsior.com/feed/", "Jammu and Kashmir"),
]


async def seed_database():
    """Seed the news database with states, cities, and newspapers."""
    from app.database import Base, engine
    # Ensure tables exist (no prior migrations scenario)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("🌱 Starting database seeding...")
        
        # Check if already seeded
        result = await session.execute(select(NewsState))
        existing_states = result.scalars().all()
        
        if existing_states:
            print(f"⚠️  Database already contains {len(existing_states)} states.")
            response = input("Do you want to clear and re-seed? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Seeding cancelled.")
                return
            
            # Clear existing data
            print("🗑️  Clearing existing data...")
            await session.execute(text("DELETE FROM newspapers"))
            await session.execute(text("DELETE FROM news_cities"))
            await session.execute(text("DELETE FROM news_states"))
            await session.commit()
        
        # Seed states and cities
        print("📍 Seeding states and cities...")
        state_map = {}
        city_map = {}
        
        for state_name, city_names in STATES_CITIES_DATA.items():
            state = NewsState(name=state_name)
            session.add(state)
            await session.flush()  # Get the ID
            state_map[state_name] = state
            
            for city_name in city_names:
                city = NewsCity(name=city_name, state_id=state.id)
                session.add(city)
                await session.flush()
                city_map[f"{state_name}:{city_name}"] = city
        
        await session.commit()
        print(f"✅ Seeded {len(state_map)} states and {len(city_map)} cities")
        
        # Seed newspapers
        print("📰 Seeding newspapers...")
        newspaper_count = 0
        
        from urllib.parse import urlparse

        for name, rss_url, state_name in NEWSPAPER_DATA:
            # Derive base_url
            parsed = urlparse(rss_url)
            base_url = ""
            if parsed.scheme and parsed.netloc:
                base_url = f"{parsed.scheme}://{parsed.netloc}"

            is_national = state_name is None

            if is_national:
                # Assign national papers to Delhi for anchoring (not used for selection logic)
                city_key = "Delhi:New Delhi"
                if city_key not in city_map:
                    city_key = list(city_map.keys())[0]
                city = city_map[city_key]
            else:
                state = state_map.get(state_name)
                if not state:
                    print(f"⚠️  State '{state_name}' not found for newspaper '{name}', skipping")
                    continue
                state_cities = [c for k, c in city_map.items() if k.startswith(f"{state_name}:")]
                if not state_cities:
                    print(f"⚠️  No cities found in state '{state_name}' for newspaper '{name}', skipping")
                    continue
                city = state_cities[0]

            newspaper = Newspaper(
                name=name,
                rss_url=rss_url,
                base_url=base_url or None,
                is_national=is_national,
                city_id=city.id
            )
            session.add(newspaper)
            newspaper_count += 1
        
        await session.commit()
        print(f"✅ Seeded {newspaper_count} newspapers")
        
        print("\n🎉 Database seeding completed successfully!")
        print(f"   States: {len(state_map)}")
        print(f"   Cities: {len(city_map)}")
        print(f"   Newspapers: {newspaper_count}")


if __name__ == "__main__":
    asyncio.run(seed_database())
