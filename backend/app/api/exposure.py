from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
from app.modules.exposure.scanner import ExposureScanner

router = APIRouter()
exposure_scanner = ExposureScanner()

@router.get("/lookup")
async def lookup_host(query: str = Query(..., description="IP address or domain to inspect via Shodan InternetDB")) -> Dict[str, Any]:
    """Inspects an IP address or domain host using Shodan InternetDB and returns open ports, CVEs, and hostnames."""
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query target must not be empty.")

    result = await exposure_scanner.lookup_host(query.strip())
    return result
