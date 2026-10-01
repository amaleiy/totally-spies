from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.db_models import Target, Case, Scan, Artifact, RelationEdge
from app.models.schemas import (
    TargetCreate,
    TargetUpdate,
    TargetResponse,
    TargetDetailResponse,
    TargetBulkCreate,
    ScanResponse
)
from app.services.orchestrator import orchestrator

router = APIRouter(tags=["targets"])

def target_eager_options():
    return [
        selectinload(Target.case),
        selectinload(Target.scans),
        selectinload(Target.artifacts),
    ]

@router.get("/targets", response_model=List[TargetResponse])
async def list_all_targets(
    case_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Target).options(*target_eager_options())
    if case_id and case_id.upper() != "ALL":
        stmt = stmt.where(Target.case_id == case_id)
    if type and type.upper() != "ALL":
        stmt = stmt.where(Target.type == type.upper())
    
    stmt = stmt.order_by(Target.created_at.desc())
    res = await db.execute(stmt)
    targets = res.scalars().all()

    filtered = []
    for t in targets:
        # Status filter (against effective_status)
        if status and status.upper() != "ALL":
            if t.effective_status.upper() != status.upper():
                continue
        # Search filter
        if search and search.strip():
            q = search.lower().strip()
            match_val = q in t.value.lower()
            match_notes = q in (t.notes or "").lower()
            match_case = q in (t.case_title or "").lower()
            match_tags = any(q in tag.lower() for tag in (t.tags or []))
            if not (match_val or match_notes or match_case or match_tags):
                continue
        filtered.append(t)
    return filtered

@router.get("/targets/{target_id}", response_model=TargetDetailResponse)
async def get_target(target_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Target)
        .options(*target_eager_options())
        .where(Target.id == target_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    return TargetDetailResponse(
        target=target,
        artifacts=target.artifacts or [],
        scans=target.scans or []
    )

@router.post("/cases/{case_id}/targets", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
async def create_target(case_id: str, target_in: TargetCreate, db: AsyncSession = Depends(get_db)):
    res_case = await db.execute(select(Case).where(Case.id == case_id))
    case = res_case.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    target = Target(
        case_id=case_id,
        type=target_in.type.upper(),
        value=target_in.value.strip(),
        notes=target_in.notes or "",
        status=target_in.status or "ACTIVE",
        tags=target_in.tags or []
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    res = await db.execute(
        select(Target)
        .options(*target_eager_options())
        .where(Target.id == target.id)
    )
    return res.scalar_one()

@router.post("/targets/bulk", response_model=List[TargetResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_targets(
    bulk_in: TargetBulkCreate,
    db: AsyncSession = Depends(get_db)
):
    res_case = await db.execute(select(Case).where(Case.id == bulk_in.case_id))
    case = res_case.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    created = []
    for item in bulk_in.targets:
        if not item.value.strip():
            continue
        tgt = Target(
            case_id=bulk_in.case_id,
            type=item.type.upper(),
            value=item.value.strip(),
            notes=item.notes or "",
            status=item.status or "ACTIVE",
            tags=item.tags or []
        )
        db.add(tgt)
        created.append(tgt)

    await db.commit()

    ids = [t.id for t in created]
    result = await db.execute(
        select(Target)
        .options(*target_eager_options())
        .where(Target.id.in_(ids))
    )
    return result.scalars().all()

@router.patch("/targets/{target_id}", response_model=TargetResponse)
async def update_target(
    target_id: str,
    target_in: TargetUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Target)
        .options(*target_eager_options())
        .where(Target.id == target_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    if target_in.type is not None:
        target.type = target_in.type.upper()
    if target_in.value is not None:
        target.value = target_in.value.strip()
    if target_in.notes is not None:
        target.notes = target_in.notes
    if target_in.status is not None:
        target.status = target_in.status.upper()
    if target_in.tags is not None:
        target.tags = target_in.tags

    await db.commit()
    await db.refresh(target)
    return target

@router.post("/targets/{target_id}/scan", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def trigger_target_scan(
    target_id: str,
    module: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db)
):
    target = (
        await db.execute(
            select(Target)
            .options(*target_eager_options())
            .where(Target.id == target_id)
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    selected_module = module
    if not selected_module:
        if target.type in ["IP", "DOMAIN"]:
            selected_module = "exposure"
        else:
            selected_module = "clover"

    scan = Scan(
        case_id=target.case_id,
        target_id=target.id,
        module=selected_module.lower(),
        status="PENDING",
        config=config or {}
    )
    db.add(scan)
    target.status = "SCANNING"
    await db.commit()
    await db.refresh(scan)

    await orchestrator.start_scan(scan.id)
    return scan

@router.get("/cases/{case_id}/targets", response_model=List[TargetResponse])
async def list_targets(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Target)
        .options(*target_eager_options())
        .where(Target.case_id == case_id)
        .order_by(Target.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(target_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Target).options(selectinload(Target.artifacts)).where(Target.id == target_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    # Collect IDs to clean up from relation graph (target itself + all child artifacts)
    cleanup_ids = [target_id] + [a.id for a in target.artifacts]

    # Clean up associated edges to prevent orphaned graph connections
    await db.execute(
        delete(RelationEdge).where(
            RelationEdge.source_id.in_(cleanup_ids) | RelationEdge.target_id.in_(cleanup_ids)
        )
    )
    await db.delete(target)
    await db.commit()

