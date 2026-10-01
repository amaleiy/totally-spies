import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.modules.exposure.scanner import ExposureScanner

@pytest.mark.asyncio
async def test_exposure_scanner_initialization():
    scanner = ExposureScanner()
    assert scanner.name == "exposure"
    assert "Shodan" in scanner.description

@pytest.mark.asyncio
async def test_exposure_target_resolution():
    scanner = ExposureScanner()
    assert scanner._resolve_target("1.1.1.1") == "1.1.1.1"
    assert scanner._resolve_target("http://8.8.8.8:8080/path") == "8.8.8.8"
    resolved = scanner._resolve_target("dns.google")
    assert resolved is not None
    assert len(resolved.split(".")) == 4

@pytest.mark.asyncio
async def test_exposure_lookup_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/exposure/lookup?query=1.1.1.1")
        assert res.status_code == 200
        data = res.json()
        assert data["ip"] == "1.1.1.1"
        assert "ports" in data
        assert "hostnames" in data

@pytest.mark.asyncio
async def test_exposure_scanner_generator():
    scanner = ExposureScanner()
    results = []
    async for probe in scanner.run("1.1.1.1", {}):
        results.append(probe)
    
    assert len(results) > 0
    port_probes = [p for p in results if p.metadata.get("category") == "code"]
    assert len(port_probes) > 0
    assert any("Port" in p.platform for p in port_probes)
