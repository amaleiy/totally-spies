import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_clover_platforms_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/clover/platforms")
        assert response.status_code == 200
        data = response.json()
        assert "total_platforms" in data
        assert data["total_platforms"] > 0
        assert "categories" in data
        assert len(data["categories"]) > 0

@pytest.mark.asyncio
async def test_clover_lookup_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Fast targeted lookup
        response = await ac.post("/api/clover/lookup", json={
            "username": "torvalds",
            "platforms": ["github"],
            "concurrency": 5,
            "timeout": 5.0,
            "permutations": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "torvalds"
        assert "matches" in data
        assert "permutations" in data
        assert len(data["permutations"]) > 0

@pytest.mark.asyncio
async def test_clover_attach_creates_relation_edges():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create a test case
        case_res = await ac.post("/api/cases", json={"title": "Clover Edge Case", "description": "Graph link test"})
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]

        # Attach profile for username
        attach_res = await ac.post("/api/clover/attach", json={
            "case_id": case_id,
            "target_username": "linus_kernel",
            "profiles": [
                {
                    "platform": "GitHub",
                    "url": "https://github.com/linus_kernel",
                    "confidence": 0.98,
                    "category": "coding",
                    "status_code": 200
                }
            ]
        })
        assert attach_res.status_code == 201
        attach_data = attach_res.json()
        assert attach_data["status"] == "success"
        target_id = attach_data["target_id"]

        # Verify relation edge exists in case graph
        graph_res = await ac.get(f"/api/cases/{case_id}/graph")
        assert graph_res.status_code == 200
        graph_data = graph_res.json()
        edges = graph_data.get("edges", [])
        assert len(edges) >= 1
        assert any(e["source"] == target_id and e.get("label") == "OWNS_ACCOUNT" for e in edges)

