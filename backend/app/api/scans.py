from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.db_models import Scan, ScanEvent, Case, Target
from app.models.schemas import ScanCreate, ScanResponse, ScanEventResponse
from app.services.orchestrator import orchestrator

router = APIRouter(tags=["scans"])

@router.post("/cases/{case_id}/scans", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_and_start_scan(
    case_id: str,
    scan_in: ScanCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify Case exists
    res_case = await db.execute(select(Case).where(Case.id == case_id))
    case = res_case.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Verify Target exists
    res_target = await db.execute(select(Target).where(Target.id == scan_in.target_id, Target.case_id == case_id))
    target = res_target.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found in this case")

    # Create Scan record
    scan = Scan(
        case_id=case_id,
        target_id=target.id,
        module=scan_in.module.lower(),
        status="PENDING",
        config=scan_in.config or {}
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Launch background scan
    await orchestrator.start_scan(scan.id)

    return scan

@router.get("/cases/{case_id}/scans", response_model=List[ScanResponse])
async def list_case_scans(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scan).where(Scan.case_id == case_id).order_by(Scan.started_at.desc())
    )
    return result.scalars().all()

@router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/scans/{scan_id}/events", response_model=List[ScanEventResponse])
async def get_scan_events(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScanEvent).where(ScanEvent.scan_id == scan_id).order_by(ScanEvent.created_at.asc())
    )
    return result.scalars().all()

@router.get("/scans", response_model=List[dict])
async def list_all_scans(
    status: Optional[str] = None,
    module: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    query = select(Scan).order_by(Scan.started_at.desc())
    if status and status.upper() != 'ALL':
        query = query.where(Scan.status == status.upper())
    if module and module.lower() != 'all':
        query = query.where(Scan.module == module.lower())
    query = query.limit(limit)
    
    result = await db.execute(query)
    scans = result.scalars().all()
    
    enriched = []
    for s in scans:
        # Load related target and case info
        target_res = await db.execute(select(Target).where(Target.id == s.target_id))
        target = target_res.scalar_one_or_none()
        
        case_res = await db.execute(select(Case).where(Case.id == s.case_id))
        case = case_res.scalar_one_or_none()
        
        enriched.append({
            "id": s.id,
            "case_id": s.case_id,
            "case_title": case.title if case else "Unknown Case",
            "target_id": s.target_id,
            "target_value": target.value if target else "Unknown Target",
            "target_type": target.type if target else "UNKNOWN",
            "module": s.module,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "total": s.total,
            "completed": s.completed,
            "matches_count": s.matches_count,
            "error": s.error,
            "config": s.config or {},
        })
    return enriched

@router.post("/scans/launch", status_code=status.HTTP_201_CREATED)
async def launch_scan(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    case_id = payload.get("case_id")
    target_id = payload.get("target_id")
    target_value = payload.get("target_value", "").strip()
    target_type = (payload.get("target_type") or "USERNAME").upper()
    module = (payload.get("module") or "clover").lower()
    config = payload.get("config", {})

    # If no case_id, find or create default case
    if not case_id:
        c_res = await db.execute(select(Case).order_by(Case.created_at.desc()).limit(1))
        active_case = c_res.scalar_one_or_none()
        if not active_case:
            active_case = Case(
                title="Operation Clover Field",
                description="Default intelligence investigation case",
                status="ACTIVE",
                tags=["tactical", "recon"]
            )
            db.add(active_case)
            await db.commit()
            await db.refresh(active_case)
        case_id = active_case.id

    # If target_id provided, verify target
    target = None
    if target_id:
        t_res = await db.execute(select(Target).where(Target.id == target_id))
        target = t_res.scalar_one_or_none()

    if not target:
        if not target_value:
            raise HTTPException(status_code=400, detail="Target ID or Target Value is required")
        # Check if target already exists in this case
        t_res = await db.execute(select(Target).where(Target.case_id == case_id, Target.value == target_value))
        target = t_res.scalar_one_or_none()
        if not target:
            target = Target(
                case_id=case_id,
                type=target_type,
                value=target_value,
                status="ACTIVE",
                notes=f"Added for {module.capitalize()} scan"
            )
            db.add(target)
            await db.commit()
            await db.refresh(target)

    # Create and start scan
    scan = Scan(
        case_id=case_id,
        target_id=target.id,
        module=module,
        status="PENDING",
        config=config
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Trigger orchestrator
    await orchestrator.start_scan(scan.id)

    return {
        "id": scan.id,
        "case_id": scan.case_id,
        "target_id": scan.target_id,
        "target_value": target.value,
        "module": scan.module,
        "status": scan.status,
        "message": f"Scan initiated for {target.value}"
    }

@router.post("/scans/{scan_id}/rerun", status_code=status.HTTP_201_CREATED)
async def rerun_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    old_scan = result.scalar_one_or_none()
    if not old_scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    new_scan = Scan(
        case_id=old_scan.case_id,
        target_id=old_scan.target_id,
        module=old_scan.module,
        status="PENDING",
        config=old_scan.config or {}
    )
    db.add(new_scan)
    await db.commit()
    await db.refresh(new_scan)

    await orchestrator.start_scan(new_scan.id)
    return new_scan

@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Cancel if running
    if scan.status in ["RUNNING", "PENDING"]:
        await orchestrator.cancel_scan(scan_id)

    await db.delete(scan)
    await db.commit()
    return None

@router.post("/scans/{scan_id}/cancel", response_model=ScanResponse)
async def cancel_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    await orchestrator.cancel_scan(scan_id)
    if scan.status in ["RUNNING", "PENDING"]:
        scan.status = "CANCELLED"
        await db.commit()
        await db.refresh(scan)
    return scan
