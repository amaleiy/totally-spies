import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_scans_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/scans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_reports_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List reports
        list_res = await ac.get("/api/reports")
        assert list_res.status_code == 200
        reports = list_res.json()
        assert len(reports) > 0

        # Generate report
        gen_res = await ac.post("/api/reports/generate", json={
            "template": "comprehensive_dossier",
            "classification": "TOP SECRET // WOOHP TACTICAL",
            "notes": "Automated verification test"
        })
        assert gen_res.status_code == 201
        rep = gen_res.json()
        assert "id" in rep
        assert "content_markdown" in rep
        assert rep["classification"] == "TOP SECRET // WOOHP TACTICAL"

@pytest.mark.asyncio
async def test_settings_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get settings
        get_res = await ac.get("/api/settings")
        assert get_res.status_code == 200
        data = get_res.json()
        assert "settings" in data
        assert "api_keys" in data["settings"]

        # Update settings
        update_res = await ac.post("/api/settings", json={
            "scanner": {"concurrency_limit": 12}
        })
        assert update_res.status_code == 200

        # Diagnostics
        diag_res = await ac.get("/api/settings/diagnostics")
        assert diag_res.status_code == 200
        diag = diag_res.json()
        assert diag["status"] == "OPERATIONAL"
