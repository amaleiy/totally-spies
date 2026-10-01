import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import init_db

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    await init_db()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "clover" in response.json()["modules"]

@pytest.mark.asyncio
async def test_case_lifecycle_and_scan():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create Case
        case_res = await ac.post("/api/cases", json={
            "title": "Operation Clover Test",
            "description": "Verification case for identity recon"
        })
        assert case_res.status_code == 201
        case_data = case_res.json()
        case_id = case_data["id"]
        assert case_data["title"] == "Operation Clover Test"

        # 2. Add Target
        target_res = await ac.post(f"/api/cases/{case_id}/targets", json={
            "type": "USERNAME",
            "value": "jinsakai",
            "notes": "Primary investigator handle"
        })
        assert target_res.status_code == 201
        target_data = target_res.json()
        target_id = target_data["id"]
        assert target_data["value"] == "jinsakai"

        # 3. Create Scan (uses first-class Scan entity)
        scan_res = await ac.post(f"/api/cases/{case_id}/scans", json={
            "target_id": target_id,
            "module": "clover",
            "config": {"timeout": 2.0}
        })
        assert scan_res.status_code == 201
        scan_data = scan_res.json()
        scan_id = scan_data["id"]
        assert scan_data["case_id"] == case_id
        assert scan_data["target_id"] == target_id
        assert scan_data["module"] == "clover"

        # 4. List Scans for Case
        scans_list_res = await ac.get(f"/api/cases/{case_id}/scans")
        assert scans_list_res.status_code == 200
        scans_list = scans_list_res.json()
        assert len(scans_list) >= 1
        assert any(s["id"] == scan_id for s in scans_list)

        # 5. Query Graph
        graph_res = await ac.get(f"/api/cases/{case_id}/graph")
        assert graph_res.status_code == 200
        graph_data = graph_res.json()
        assert "nodes" in graph_data
        assert "edges" in graph_data
        assert any(n["id"] == target_id for n in graph_data["nodes"])

        # 6. Test Scan Cancellation
        cancel_res = await ac.post(f"/api/scans/{scan_id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] in ["CANCELLED", "COMPLETED"]

        # 7. Test Export Case Report
        export_res = await ac.get(f"/api/cases/{case_id}/export")
        assert export_res.status_code == 200
        export_data = export_res.json()
        assert "export_metadata" in export_data
        assert export_data["case"]["id"] == case_id
        assert len(export_data["targets"]) >= 1

@pytest.mark.asyncio
async def test_artifact_deletion_cascades_edges():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create case & target
        case_res = await ac.post("/api/cases", json={"title": "Cascade Test", "description": ""})
        case_id = case_res.json()["id"]

        target_res = await ac.post(f"/api/cases/{case_id}/targets", json={"type": "USERNAME", "value": "testuser"})
        target_id = target_res.json()["id"]

        # Add artifact directly in DB to test edge cascade
        from app.core.database import async_session_maker
        from app.models.db_models import Artifact, RelationEdge
        from sqlalchemy.future import select

        async with async_session_maker() as session:
            art = Artifact(
                case_id=case_id,
                target_id=target_id,
                node_type="PROFILE",
                label="GitHub: testuser",
                url="https://github.com/testuser"
            )
            session.add(art)
            await session.flush()
            art_id = art.id

            edge = RelationEdge(
                case_id=case_id,
                source_id=target_id,
                target_id=art_id,
                relation_type="OWNS_ACCOUNT"
            )
            session.add(edge)
            await session.commit()

        # Delete artifact via API
        del_res = await ac.delete(f"/api/artifacts/{art_id}")
        assert del_res.status_code == 204

        # Verify edge was cascaded
        async with async_session_maker() as session:
            e_res = await session.execute(select(RelationEdge).where(RelationEdge.target_id == art_id))
            assert e_res.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_target_management_and_inspector():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create case
        c_res = await ac.post("/api/cases", json={"title": "Target Ops Test", "description": "Ops"})
        assert c_res.status_code == 201
        case_id = c_res.json()["id"]

        # Add target
        t_res = await ac.post(f"/api/cases/{case_id}/targets", json={
            "type": "USERNAME",
            "value": "alex_recon",
            "notes": "Suspected persona",
            "tags": ["social", "recon"]
        })
        assert t_res.status_code == 201
        t_data = t_res.json()
        target_id = t_data["id"]
        assert t_data["value"] == "alex_recon"
        assert t_data["tags"] == ["social", "recon"]

        # List all targets
        list_res = await ac.get("/api/targets?search=alex_recon")
        assert list_res.status_code == 200
        targets = list_res.json()
        assert len(targets) >= 1
        found = next(t for t in targets if t["id"] == target_id)
        assert found["case_title"] == "Target Ops Test"
        assert found["status"] == "ACTIVE"

        # Update target
        patch_res = await ac.patch(f"/api/targets/{target_id}", json={
            "notes": "Updated note",
            "status": "COMPLETED",
            "tags": ["social", "recon", "verified"]
        })
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["notes"] == "Updated note"
        assert patched["status"] == "COMPLETED"
        assert "verified" in patched["tags"]

        # Get target detail
        detail_res = await ac.get(f"/api/targets/{target_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["target"]["id"] == target_id
        assert "artifacts" in detail
        assert "scans" in detail

        # Bulk create targets
        bulk_res = await ac.post("/api/targets/bulk", json={
            "case_id": case_id,
            "targets": [
                {"type": "DOMAIN", "value": "corp-target.com", "notes": "Asset"},
                {"type": "IP", "value": "192.168.1.100", "notes": "Gateway"}
            ]
        })
        assert bulk_res.status_code == 201
        bulk_data = bulk_res.json()
        assert len(bulk_data) == 2

@pytest.mark.asyncio
async def test_target_deletion_cascades_edges():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        from app.core.database import async_session_maker
        from app.models.db_models import RelationEdge
        from sqlalchemy.future import select

        # Create case & target
        c_res = await ac.post("/api/cases", json={"title": "Delete Target Cascade Test", "description": "Test edge cleanup"})
        case_id = c_res.json()["id"]

        t_res = await ac.post(f"/api/cases/{case_id}/targets", json={"type": "IP", "value": "10.0.0.99"})
        target_id = t_res.json()["id"]

        # Insert a relation edge pointing to/from this target
        async with async_session_maker() as session:
            edge = RelationEdge(
                case_id=case_id,
                source_id=target_id,
                target_id="some-other-node",
                relation_type="COMMUNICATES_WITH"
            )
            session.add(edge)
            await session.commit()
            edge_id = edge.id

        # Delete target via API
        del_res = await ac.delete(f"/api/targets/{target_id}")
        assert del_res.status_code == 204

        # Confirm target is deleted
        get_res = await ac.get(f"/api/targets/{target_id}")
        assert get_res.status_code == 404

        # Confirm relation edge was deleted
        async with async_session_maker() as session:
            e_res = await session.execute(select(RelationEdge).where(RelationEdge.id == edge_id))
            assert e_res.scalar_one_or_none() is None


