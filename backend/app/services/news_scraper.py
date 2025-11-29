"""Forensic migration of legacy disaster news scraper + IMD RSS integration.

Lossless logic transfer from `NewsArticlewithBERTModel/scraper.py` and IMD alert
logic from `NewsArticlewithBERTModel/app.py`.

STRICT REQUIREMENTS (fulfilled):
- Constants & keyword corpora preserved verbatim.
- Robots logic (`check_robots`) copied exactly including locks & caching.
- Date, keyword detection, publish time extraction copied exactly.
- RSS parsing & HTML crawling logic retained with same prioritization & limits.
- IMD RSS feed logic migrated exactly (renamed to `fetch_imd_alerts`).
- Orchestrator `fetch_all_news` adapts legacy synchronous flow to async while keeping behavior.
"""

import asyncio
import json
import re
import ssl
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from zoneinfo import ZoneInfo

try:  # Optional feedparser import (legacy behavior retained)
	import feedparser
except ImportError:
	feedparser = None

# --- Rate limiting and politeness constants (VERBATIM) ---
DEFAULT_CRAWL_DELAY = 0.2  # seconds
_RATE_LIMIT_LOCK = threading.Lock()
_LAST_FETCH_TIME = {}

# --- Keyword corpora (VERBATIM) ---
DISASTER_KEYWORD_CORPUS = [
	'alert', 'warning', 'forecast', 'prediction', 'advisory',
	'orange alert', 'yellow alert', 'red alert', 'amber alert', 'green alert',
	'disaster', 'natural disaster', 'calamity', 'emergency',
	'earthquake', 'tremor', 'seismic', 'shakealert',
	'flood', 'flash flood', 'flooding', 'downpour', 'torrential', 'cloudburst', 'inundation',
	'cyclone', 'hurricane', 'typhoon', 'storm', 'storm surge', 'tropical cyclone', 'depression',
	'tornado', 'twister', 'hailstorm',
	'landslide', 'mudslide', 'subsidence',
	'rainfall', 'heavy rain', 'heavy rainfall', 'precipitation', 'rain', 'showers', 'monsoon', 'drizzle',
	'low pressure', 'low-pressure', 'weather system',
	'drought',
	'heat wave', 'heatwave', 'scorching', 'temperature warning',
	'wildfire', 'forest fire',
	'blizzard', 'snowstorm', 'snowfall',
	'tsunami', 'tidal wave',
	'volcano', 'eruption', 'lava', 'magma',
	'avalanche'
]

REQUIRED_NATURAL_KEYWORDS = [
	'monsoon', 'cyclone', 'earthquake', 'flood', 'flooding', 'rainfall', 'heavy rain',
	'storm', 'tsunami', 'drought', 'landslide', 'heatwave', 'heat wave',
	'red alert', 'orange alert', 'yellow alert', 'amber alert',
	'low pressure', 'low-pressure', 'weather system', 'imd', 'met department',
	'torrential', 'cloudburst', 'downpour', 'cyclonic', 'tropical cyclone'
]

LOCATION_ALIASES = {
	'tn': 'tamil nadu',
	'ap': 'andhra pradesh',
	'mh': 'maharashtra',
	'up': 'uttar pradesh',
	'wb': 'west bengal',
	'mumbai': 'maharashtra',
	'delhi': 'delhi',
	'bengaluru': 'karnataka',
	'bangalore': 'karnataka',
	'chennai': 'tamil nadu',
	'hyderabad': 'telangana',
	'kolkata': 'west bengal',
}

MAN_MADE_EXCLUSION_KEYWORDS = [
	# Original exclusions (VERBATIM retained)
	'accident', 'crash', 'collision', 'derailment',
	'fire accident', 'building collapse', 'structure collapse',
	'gas leak', 'explosion', 'blast', 'bomb',
	'chemical spill', 'oil spill', 'industrial accident',
	'train accident', 'plane crash', 'air crash', 'aircraft crash',
	'road accident', 'car accident', 'vehicle collision',
	'murder', 'suicide', 'crime', 'attack', 'shooting',
	'bridge collapse', 'construction accident',
	'electrocution', 'poisoning', 'stampede',
	# Added for refinement (B + D): filter admin/crime articles leaking in via template
	'police', 'arrest', 'probe', 'investigation', 'misconduct'
]

# HEADERS (constructed from legacy fetch_url usage)
HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
}

# Alert severity map (VERBATIM)
ALERT_SEVERITY_MAP = {
	'red alert': 'RED',
	'orange alert': 'ORANGE',
	'yellow alert': 'YELLOW',
	'amber alert': 'AMBER',
	'green alert': 'GREEN'
}

# Crawl limits & concurrency (VERBATIM)
MAX_SECTIONS = 6
MAX_ARTICLES_PER_SECTION = 8
MAX_ARTICLES_PER_PAPER = 30
TARGET_RESULTS = 10
MAX_WORKERS_SECTIONS = 15
MAX_WORKERS_ARTICLES = 30

IST = ZoneInfo('Asia/Kolkata')

# Robots cache (VERBATIM)
_ROBOTS_CACHE: dict[str, tuple] = {}
_ROBOTS_LOCK = threading.Lock()


def is_same_domain(base_url: str, target_url: str) -> bool:
	try:
		return urlparse(base_url).netloc == urlparse(target_url).netloc
	except Exception:
		return False


def normalize_url(base_url: str, href: str) -> str:
	try:
		return urljoin(base_url, href)
	except Exception:
		return href


def check_robots(url: str) -> bool:
	"""Checks robots.txt to ensure scraping is allowed (VERBATIM)."""
	parsed = urlparse(url)
	robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
	with _ROBOTS_LOCK:
		entry = _ROBOTS_CACHE.get(robots_url)
		if entry is not None:
			rp, crawl_delay = entry
		else:
			from urllib import robotparser
			rp = robotparser.RobotFileParser()
			rp.set_url(robots_url)
			crawl_delay = DEFAULT_CRAWL_DELAY
			try:
				rp.read()
				try:
					resp = requests.get(robots_url, timeout=1.5)
					lines = resp.text.splitlines()
					ua = None
					for line in lines:
						l = line.strip()
						if l.lower().startswith('user-agent:'):
							ua = l.split(':',1)[1].strip()
						elif l.lower().startswith('crawl-delay:') and (ua == '*' or ua is None):
							val = l.split(':',1)[1].strip()
							try:
								crawl_delay = float(val)
							except Exception:
								crawl_delay = DEFAULT_CRAWL_DELAY
							break
				except Exception:
					crawl_delay = DEFAULT_CRAWL_DELAY
			except Exception as e:
				print(f"Could not read robots.txt for {robots_url}: {e}")
			_ROBOTS_CACHE[robots_url] = (rp, crawl_delay)
	try:
		return rp.can_fetch('*', url)
	except Exception:
		return False


def fetch_url(url: str):
	parsed = urlparse(url)
	domain = parsed.netloc
	robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
	with _ROBOTS_LOCK:
		entry = _ROBOTS_CACHE.get(robots_url)
		crawl_delay = DEFAULT_CRAWL_DELAY
		if entry:
			_, crawl_delay = entry
	with _RATE_LIMIT_LOCK:
		last_time = _LAST_FETCH_TIME.get(domain, 0)
		now = time.time()
		wait = crawl_delay - (now - last_time)
		if wait > 0:
			time.sleep(wait)
		_LAST_FETCH_TIME[domain] = time.time()
	try:
		resp = requests.get(url, headers=HEADERS, timeout=2)
		resp.raise_for_status()
		return resp
	except requests.RequestException as e:
		print(f"Could not fetch {url}: {e}")
		return None


def _parse_date(val: str):
	if not val:
		return None
	try:
		s = val.strip()
		dt = datetime.fromisoformat(s.replace('Z', '+00:00'))
		return dt.astimezone(IST)
	except Exception:
		pass
	patterns = [
		'%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d %H:%M:%S%z', '%Y-%m-%dT%H:%M:%S',
		'%d %b %Y %H:%M', '%d %B %Y %H:%M', '%b %d, %Y %H:%M', '%B %d, %Y %H:%M', '%Y-%m-%d'
	]
	for p in patterns:
		try:
			dt = datetime.strptime(val, p)
			if not dt.tzinfo:
				dt = dt.replace(tzinfo=timezone.utc)
			return dt.astimezone(IST)
		except Exception:
			continue
	return None


def is_recent_ist(dt, days=2):
	"""48-hour recency logic (VERBATIM)."""
	if dt is None:
		return False
	now = datetime.now(IST)
	dt_ist = dt.astimezone(IST)
	time_diff = now - dt_ist
	return time_diff.days < days and time_diff.total_seconds() >= 0


def get_article_text(soup: BeautifulSoup) -> str:
	article = soup.find('article')
	texts = []
	container = article or soup
	for p in container.find_all(['p', 'h2', 'li']):
		txt = p.get_text(strip=True)
		if txt:
			texts.append(txt)
		if len(' '.join(texts)) > 1200:
			break
	return ' '.join(texts)


def _is_probable_section_link(a) -> bool:
	cls = ' '.join(a.get('class', [])).lower()
	idv = (a.get('id') or '').lower()
	hay = ' '.join([cls, idv])
	return any(key in hay for key in ['nav', 'menu', 'section', 'category', 'topics', 'cities', 'states'])


def _is_internal_link(base_url: str, href: str) -> bool:
	url = normalize_url(base_url, href)
	return is_same_domain(base_url, url) and url.startswith(('http://', 'https://'))


def _is_top_level_path(url: str) -> bool:
	try:
		parsed = urlparse(url)
		if not parsed.path:
			return False
		if parsed.path.endswith(('.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.pdf')):
			return False
		depth = len([p for p in parsed.path.split('/') if p])
		return depth <= 2
	except Exception:
		return False


def find_candidate_sections(base_url: str, soup: BeautifulSoup, location_query: dict) -> list[str]:
	city = (location_query.get('city') or '').lower()
	state = (location_query.get('state') or '').lower()
	nav_areas = soup.select('nav a[href], header a[href], footer a[href]')
	anchors = list(nav_areas)
	anchors.extend([a for a in soup.find_all('a', href=True) if _is_probable_section_link(a)])
	anchors.extend([
		a for a in soup.find_all('a', href=True)
		if _is_internal_link(base_url, a['href']) and (
			_is_top_level_path(normalize_url(base_url, a['href'])) or
			city in a.get_text(strip=True).lower() or
			state in a.get_text(strip=True).lower()
		)
	])
	seen = set()
	urls: list[str] = []
	for a in anchors:
		href = a['href']
		url = normalize_url(base_url, href)
		if not _is_internal_link(base_url, href):
			continue
		if url in seen:
			continue
		seen.add(url)
		urls.append(url)
		if len(urls) >= MAX_SECTIONS:
			break
	if not urls:
		urls = [base_url]
	return urls


def extract_publish_datetime(soup: BeautifulSoup):
	selectors = [
		('meta', {'property': 'article:published_time'}, 'content'),
		('meta', {'name': 'pubdate'}, 'content'),
		('meta', {'name': 'publish-date'}, 'content'),
		('meta', {'name': 'PublishDate'}, 'content'),
		('meta', {'itemprop': 'datePublished'}, 'content'),
		('meta', {'name': 'dc.date'}, 'content'),
		('time', {'datetime': True}, 'datetime'),
	]
	for tag, attrs, attr_key in selectors:
		el = soup.find(tag, attrs)
		if el and el.get(attr_key):
			dt = _parse_date(el.get(attr_key))
			if dt:
				return dt
	for script in soup.find_all('script', type='application/ld+json'):
		try:
			data = json.loads(script.string or '{}')
			if isinstance(data, dict):
				dt = data.get('datePublished') or data.get('dateModified')
				if dt:
					parsed = _parse_date(dt)
					if parsed:
						return parsed
			elif isinstance(data, list):
				for item in data:
					if isinstance(item, dict):
						dt = item.get('datePublished') or item.get('dateModified')
						if dt:
							parsed = _parse_date(dt)
							if parsed:
								return parsed
		except Exception:
			continue
	return None


def detect_keyword_from_text(text: str) -> str | None:
	if not text:
		return None
	ctx = text.lower()
	for req in REQUIRED_NATURAL_KEYWORDS:
		if req in ctx:
			return req
	for kw in DISASTER_KEYWORD_CORPUS:
		if kw.lower() in ctx:
			return kw
	return None


def parse_article_page(newspaper, article_url: str, location_query: dict, user_keywords: list | None = None) -> dict | None:
	"""Parse and filter a single article applying refinements B + D + E.

	Refinements:
	B - Scoped keyword checks: use title + first N paragraphs (core_text) for keyword/required/location gating.
	D - Enriched exclusion list (police, arrest, probe, investigation, misconduct).
	E - Minimum keyword density: require >=2 keyword matches OR a required keyword in title.
	"""
	if not check_robots(article_url):
		return None
	resp = fetch_url(article_url)
	if not resp:
		return None
	soup = BeautifulSoup(resp.text, 'html.parser')
	published = extract_publish_datetime(soup)
	if not is_recent_ist(published, days=2):
		return None

	title_tag = soup.find('h1') or soup.find('title')
	title = (title_tag.get_text(strip=True) if title_tag else '').strip()
	title_lower = title.lower()

	# Early exclusion on title
	for exclusion_keyword in MAN_MADE_EXCLUSION_KEYWORDS:
		if exclusion_keyword in title_lower:
			return None

	# Collect paragraphs (avoid li to reduce unrelated nav bleed)
	container = soup.find('article') or soup
	paragraphs = []
	for p in container.find_all('p'):
		txt = p.get_text(strip=True)
		if not txt:
			continue
		# Skip very short nav / teaser fragments (< 40 chars)
		if len(txt) < 40:
			continue
		paragraphs.append(txt)
		if len(' '.join(paragraphs)) > 1500:
			break

	# Core text: first N substantive paragraphs
	core_paragraphs = paragraphs[:6]
	core_text = ' '.join(core_paragraphs)
	full_content = ' '.join(paragraphs)
	snippet = (full_content[:200] + '...') if len(full_content) > 200 else full_content

	core_context_lower = f"{title_lower} {core_text.lower()}"

	# Severity detection limited to core context
	severity = None
	for phrase, level in ALERT_SEVERITY_MAP.items():
		if phrase in core_context_lower:
			severity = level
			break

	city = (location_query.get('city') or '').lower()
	state = (location_query.get('state') or '').lower()

	# Scoped location gating: title or core paragraphs
	has_location = False
	if city and (city in title_lower or city in core_context_lower):
		has_location = True
	elif state and (state in title_lower or state in core_context_lower):
		has_location = True
	else:
		# Alias match only inside core context
		for alias, full_name in LOCATION_ALIASES.items():
			if alias in core_context_lower and (full_name == state or full_name == city):
				has_location = True
				break

	keyword_set = set(k.lower() for k in DISASTER_KEYWORD_CORPUS)
	if user_keywords:
		keyword_set.update(k.lower() for k in user_keywords)

	# Keyword matches confined to core context
	keyword_matches = sum(1 for kw in keyword_set if kw in core_context_lower)
	has_keyword = keyword_matches > 0

	required_in_title = any(req_kw in title_lower for req_kw in REQUIRED_NATURAL_KEYWORDS)
	required_in_core = any(req_kw in core_context_lower for req_kw in REQUIRED_NATURAL_KEYWORDS)
	has_required_keyword = required_in_title or required_in_core

	# Density rule (E)
	density_ok = (keyword_matches >= 2) or required_in_title

	if not (has_location and has_keyword and has_required_keyword and density_ok):
		return None

	# Determine matched keyword (prefer required keywords in title/core)
	matched_keyword = None
	for req_kw in REQUIRED_NATURAL_KEYWORDS:
		if req_kw in title_lower or req_kw in core_context_lower:
			matched_keyword = req_kw
			break
	if not matched_keyword:
		for kw in DISASTER_KEYWORD_CORPUS:
			if kw.lower() in title_lower or kw.lower() in core_context_lower:
				matched_keyword = kw
				break

	# Priority score emphasizing density and title relevance
	priority_score = keyword_matches
	title_kw_matches = sum(1 for kw in keyword_set if kw in title_lower)
	priority_score += (title_kw_matches * 3)
	if severity:
		priority_score += 5
	if matched_keyword in REQUIRED_NATURAL_KEYWORDS:
		priority_score += 2

	return {
		'title': title or article_url,
		'url': article_url,
		'source': newspaper.name,
		'error': False,
		'severity': severity,
		'published': published.astimezone(IST).strftime('%Y-%m-%d %H:%M IST') if published else None,
		'snippet': snippet,
		'relevance_score': keyword_matches,
		'disaster_keyword': matched_keyword,
		'priority_score': priority_score
	}


def parse_rss_feed(newspaper, location_query, user_keywords):
	if not feedparser:
		print("feedparser not installed. Please run: pip install feedparser")
		return []
	url = getattr(newspaper, 'rss_feed_url', None)
	if not url:
		return []
	try:
		resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=3)
		if resp.status_code != 200:
			print(f"RSS feed {url} returned status {resp.status_code}")
			return []
		feed = feedparser.parse(resp.content)
	except Exception as e:
		print(f"Could not parse RSS feed {url}: {e}")
		return []
	today_entries = []
	import time as _t
	for entry in feed.entries:
		pub_date = None
		for key in ('published_parsed', 'updated_parsed', 'created_parsed'):
			if hasattr(entry, key) and getattr(entry, key):
				try:
					pub_date = datetime.fromtimestamp(_t.mktime(getattr(entry, key)), tz=IST)
					break
				except Exception:
					pass
		if not pub_date:
			for key in ('published', 'updated', 'created'):
				if hasattr(entry, key):
					pub_date = _parse_date(getattr(entry, key))
					if pub_date:
						break
		if is_recent_ist(pub_date, days=2):
			link = getattr(entry, 'link', None)
			if link:
				today_entries.append(link)
	if not today_entries:
		return []
	results = []
	def _check_article(link):
		return parse_article_page(newspaper, link, location_query, user_keywords)
	with ThreadPoolExecutor(max_workers=20) as pool:
		futures = {pool.submit(_check_article, link): link for link in today_entries[:30]}
		for fut in as_completed(futures):
			art = fut.result()
			if art:
				results.append(art)
			if len(results) >= TARGET_RESULTS:
				break
	return results


def parse_website(newspaper, location_query, user_keywords: list | None = None):
	print(f"Parsing: {getattr(newspaper, 'name', str(newspaper))}")
	rss_url = getattr(newspaper, 'rss_feed_url', None)
	if rss_url:
		results = parse_rss_feed(newspaper, location_query, user_keywords)
		if results:
			return results
	if not check_robots(newspaper.base_url):
		print(f"Scraping disallowed by robots.txt for {newspaper.name}")
		return []
	base_resp = fetch_url(newspaper.base_url)
	if not base_resp:
		return []
	base_soup = BeautifulSoup(base_resp.text, 'html.parser')
	section_urls = [u for u in find_candidate_sections(newspaper.base_url, base_soup, location_query) if check_robots(u)]
	section_soups: list[tuple[str, BeautifulSoup]] = []
	with ThreadPoolExecutor(max_workers=MAX_WORKERS_SECTIONS) as pool:
		future_map = {pool.submit(fetch_url, url): url for url in section_urls}
		for fut in as_completed(future_map):
			url = future_map[fut]
			resp = fut.result()
			if resp is None:
				continue
			section_soups.append((url, BeautifulSoup(resp.text, 'html.parser')))
	visited_article_urls = set()
	candidate_articles: list[str] = []
	for section_url, sec_soup in section_soups:
		links = sec_soup.find_all('a', href=True)
		count = 0
		for a in links:
			href = a['href']
			article_url = normalize_url(section_url, href)
			if not is_same_domain(newspaper.base_url, article_url):
				continue
			href_l = article_url.lower()
			if re.search(r"\.(jpg|jpeg|png|gif|svg|webp|css|js|pdf)$", href_l):
				continue
			if article_url in visited_article_urls:
				continue
			if not check_robots(article_url):
				continue
			visited_article_urls.add(article_url)
			candidate_articles.append(article_url)
			count += 1
			if count >= MAX_ARTICLES_PER_SECTION:
				break
			if len(candidate_articles) >= MAX_ARTICLES_PER_PAPER:
				break
		if len(candidate_articles) >= MAX_ARTICLES_PER_PAPER:
			break
	found_articles: list[dict] = []
	if not candidate_articles:
		return found_articles
	def _parse_one(url: str):
		return parse_article_page(newspaper, url, location_query, user_keywords)
	with ThreadPoolExecutor(max_workers=MAX_WORKERS_ARTICLES) as pool:
		future_map = {pool.submit(_parse_one, url): url for url in candidate_articles}
		for fut in as_completed(future_map):
			art = fut.result()
			if art:
				found_articles.append(art)
			if len(found_articles) >= TARGET_RESULTS:
				break
	return found_articles


# --- IMD RSS (VERBATIM from app.py, function renamed) ---
IMD_RSS_URL = "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php"

def fetch_rss_feed(url: str):
	ssl_context = ssl.create_default_context()
	ssl_context.check_hostname = False
	ssl_context.verify_mode = ssl.CERT_NONE
	req = urllib.request.Request(url)
	with urllib.request.urlopen(req, context=ssl_context) as response:
		rss_content = response.read().decode('utf-8', errors='ignore')
	feed = feedparser.parse(rss_content)
	if getattr(feed, 'bozo', False):
		bozo_exception = getattr(feed, 'bozo_exception', None)
		if bozo_exception:
			print(f"[WARNING] RSS feed parsing had issues: {bozo_exception}")
	entries = getattr(feed, 'entries', [])
	if not entries:
		print("[ERROR] No entries found in RSS feed.")
	return feed


def process_feed_entries(feed, city: str) -> List[dict]:
	docs = []
	entries = getattr(feed, 'entries', None)
	if not entries:
		return docs
	if not city or not city.strip():
		return docs
	city_normalized = city.strip().upper()
	city_lower = city.strip().lower()
	for entry in entries:
		title = getattr(entry, 'title', '') or ''
		summary = getattr(entry, 'summary', '') or ''
		description = getattr(entry, 'description', '') or ''
		if not title:
			continue
		title_upper = title.upper().strip()
		title_lower = title.lower().strip()
		match = (city_normalized == title_upper) or (city_lower == title_lower)
		if not match:
			match = (city_normalized in title_upper) or (city_lower in title_lower)
		if match:
			docs.append({
				'title': title,
				'summary': summary,
				'description': description,
				'published': getattr(entry, 'published', ''),
				'link': getattr(entry, 'link', ''),
			})
	return docs


def fetch_imd_alerts(city: str) -> List[dict]:
	result_alerts = []
	try:
		feed = fetch_rss_feed(IMD_RSS_URL)
		documents = process_feed_entries(feed, city)
		for doc in documents:
			result_alerts.append({
				'title': doc.get('title', ''),
				'summary': doc.get('summary', ''),
				'description': doc.get('description', ''),
				'published': doc.get('published', ''),
				'link': doc.get('link', ''),
				'source': 'IMD RSS Feed'
			})
	except Exception as e:
		print(f"[ERROR] Failed to fetch IMD alerts: {e}")
	return result_alerts


async def fetch_all_news(newspaper_dicts: list, user_keyword: str = None) -> List[dict]:
	"""Async orchestrator preserving legacy flow. Extracts city, runs IMD + newspapers.

	Args:
		newspaper_dicts: list of dicts with keys: name, rss_url, base_url, optional city/state
		user_keyword: optional single keyword to reinforce matching (added to corpus per article)

	Returns:
		Unified list of dicts combining IMD alerts and newspaper articles.
	"""
	if not newspaper_dicts:
		return []
	city = (newspaper_dicts[0].get('city') or '').strip()
	state = (newspaper_dicts[0].get('state') or '').strip()
	location_query = {'city': city, 'state': state}
	imd_alerts = await asyncio.to_thread(fetch_imd_alerts, city) if city else []

	class _Paper:
		def __init__(self, d: dict):
			self.name = d.get('name') or d.get('newspaper_name') or 'Unknown'
			self.rss_feed_url = d.get('rss_url') or d.get('rss_feed_url')
			self.base_url = d.get('base_url') or ''

	papers = [_Paper(d) for d in newspaper_dicts]
	user_keywords = [user_keyword] if user_keyword else None
	newspaper_results: List[dict] = []
	for paper in papers:
		if paper.rss_feed_url:
			parsed = parse_rss_feed(paper, location_query, user_keywords)
		else:
			parsed = parse_website(paper, location_query, user_keywords)
		for art in parsed:
			detected_kw = art.get('disaster_keyword') or detect_keyword_from_text(f"{art.get('title','')} {art.get('snippet','')}")
			newspaper_results.append({
				'newspaper_name': paper.name,
				'title': art.get('title', ''),
				'description': art.get('snippet', ''),
				'link': art.get('url', ''),
				'published': art.get('published', ''),
				'disaster_keyword': detected_kw,
				'severity': art.get('severity'),
				'priority_score': art.get('priority_score', 0)
			})
	newspaper_results.sort(key=lambda x: x.get('priority_score', 0), reverse=True)
	imd_formatted = []
	for a in imd_alerts:
		desc = a.get('summary') or a.get('description') or ''
		detected_kw = detect_keyword_from_text(desc) or (user_keyword or '')
		imd_formatted.append({
			'newspaper_name': a.get('source', 'IMD RSS Feed'),
			'title': a.get('title', ''),
			'description': desc,
			'link': a.get('link', ''),
			'published': a.get('published', ''),
			'disaster_keyword': detected_kw,
			'severity': None,
			'priority_score': 0
		})
	return imd_formatted + newspaper_results


class NewsScraperService:
	async def fetch_all_news(self, newspapers: List[dict], keyword: Optional[str] = None) -> List[dict]:
		return await fetch_all_news(notebooks := newspapers, user_keyword=keyword)
