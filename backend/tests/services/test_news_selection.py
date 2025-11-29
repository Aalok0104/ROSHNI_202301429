import asyncio
from types import SimpleNamespace

import pytest

from app.services.news_selection import build_prioritized_newspaper_dicts, MAX_NATIONAL


class _Result:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items


class _Session:
    """AsyncSession stand-in that returns canned results."""

    def __init__(self, locals_, nationals):
        self._calls = 0
        self._locals = locals_
        self._nationals = nationals

    async def execute(self, _stmt):
        # first call -> locals, second -> nationals
        self._calls += 1
        return _Result(self._locals if self._calls == 1 else self._nationals)


def _paper(name, rss_url, base_url=None, is_national=False):
    return SimpleNamespace(
        name=name,
        rss_url=rss_url,
        base_url=base_url,
        is_national=is_national,
        rss_feed_url=rss_url,
    )


@pytest.mark.asyncio
async def test_build_prioritized_newspaper_dicts_orders_local_then_national():
    local = _paper("Local", "http://local/rss", is_national=False)
    nationals = [
        _paper(f"National{i}", f"http://nat{i}/rss", is_national=True) for i in range(6)
    ]
    session = _Session([local], nationals)

    result = await build_prioritized_newspaper_dicts(session, state_id=1, city_name="Chennai")

    assert result[0]["name"] == "Local"
    assert len(result) == 1 + MAX_NATIONAL
    # base_url inferred from rss when missing
    assert result[1]["base_url"].startswith("http://nat0")


@pytest.mark.asyncio
async def test_build_prioritized_newspaper_dicts_handles_empty_lists():
    session = _Session([], [])
    result = await build_prioritized_newspaper_dicts(session, state_id=99, city_name="Nowhere")
    assert result == []
