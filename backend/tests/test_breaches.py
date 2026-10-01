import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import init_db

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    await init_db()

@pytest.mark.asyncio
async def test_breach_stats_and_feed():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Stats
        res = await ac.get("/api/breaches/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_records"] > 10000000000
        assert data["incidents_count"] == 1842
        assert len(data["top_affected_countries"]) >= 5
        assert len(data["breach_types"]) == 6
        assert len(data["live_connections"]) == 5

        # 2. Recent Breaches
        recent_res = await ac.get("/api/breaches/recent")
        assert recent_res.status_code == 200
        recent = recent_res.json()
        assert len(recent) >= 5
        assert any(b["name"] == "LinkedIn" for b in recent)
        assert any(b["name"] == "Adobe" for b in recent)

        # 3. Largest Breaches
        largest_res = await ac.get("/api/breaches/largest")
        assert largest_res.status_code == 200
        largest = largest_res.json()
        assert len(largest) == 5

@pytest.mark.asyncio
async def test_breach_lookup_and_attach():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Lookup query
        lookup_res = await ac.get("/api/breaches/lookup?query=test@example.com&type=email")
        assert lookup_res.status_code == 200
        lookup_data = lookup_res.json()
        assert lookup_data["query"] == "test@example.com"
        assert lookup_data["total_found"] >= 1
        assert "breaches" in lookup_data

        # Create case to attach to
        c_res = await ac.post("/api/cases", json={"title": "Breach Attach Test"})
        case_id = c_res.json()["id"]

        # Attach breach to case
        attach_res = await ac.post("/api/breaches/attach", json={
            "case_id": case_id,
            "breach_name": "Collection #1",
            "query_value": "test@example.com",
            "data_classes": ["Email Addresses", "Passwords"],
            "records_count": 772904991
        })
        assert attach_res.status_code == 201
        attach_data = attach_res.json()
        assert attach_data["status"] == "attached"
        assert "artifact_id" in attach_data

@pytest.mark.asyncio
async def test_breach_search_endpoint_alias():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        search_res = await ac.get("/api/breaches/search?query=adobe.com&type=domain")
        assert search_res.status_code == 200
        data = search_res.json()
        assert data["query"] == "adobe.com"
        assert len(data["breaches"]) >= 1

