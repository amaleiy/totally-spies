from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.db_models import Case, Target, Scan, Artifact, RelationEdge
from app.models.schemas import (
    CaseCreate,
    CaseUpdate,
    CaseResponse,
    CaseGraphResponse
)
from app.services.graph_service import GraphService

router = APIRouter(prefix="/cases", tags=["cases"])

def case_eager_options():
    return [
        selectinload(Case.targets),
        selectinload(Case.scans),
        selectinload(Case.artifacts),
        selectinload(Case.edges),
    ]

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(case_in: CaseCreate, db: AsyncSession = Depends(get_db)):
    case = Case(
        title=case_in.title,
        description=case_in.description or "",
        status=case_in.status or "ACTIVE",
        tags=case_in.tags or [],
        notes=case_in.notes or "",
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    res = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .where(Case.id == case.id)
    )
    return res.scalar_one()

@router.post("/import", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def import_case(dossier: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    case_data = dossier.get("case", dossier)
    title = case_data.get("title", "Imported Investigation")
    description = case_data.get("description", "")
    status_val = case_data.get("status", "ACTIVE")
    tags = case_data.get("tags", ["imported"])
    notes = case_data.get("notes", "")

    new_case = Case(
        title=title,
        description=description,
        status=status_val,
        tags=tags if isinstance(tags, list) else ["imported"],
        notes=notes or "",
    )
    db.add(new_case)
    await db.flush()

    # If dossier has targets, import them and track ID map
    target_id_map: Dict[str, str] = {}
    if "targets" in dossier and isinstance(dossier["targets"], list):
        for t in dossier["targets"]:
            old_id = t.get("id")
            new_target = Target(
                case_id=new_case.id,
                type=t.get("type", "USERNAME"),
                value=t.get("value", "unknown"),
                notes=t.get("notes", "")
            )
            db.add(new_target)
            await db.flush()
            if old_id:
                target_id_map[str(old_id)] = new_target.id

    # If dossier has artifacts, import them
    artifact_id_map: Dict[str, str] = {}
    if "artifacts" in dossier and isinstance(dossier["artifacts"], list):
        first_target_id = list(target_id_map.values())[0] if target_id_map else None
        for a in dossier["artifacts"]:
            old_id = a.get("id")
            old_target_id = str(a.get("target_id", ""))
            tgt_id = target_id_map.get(old_target_id, first_target_id)
            if not tgt_id:
                placeholder = Target(case_id=new_case.id, type="USERNAME", value="imported-target", notes="")
                db.add(placeholder)
                await db.flush()
                tgt_id = placeholder.id
                target_id_map["default"] = tgt_id

            new_artifact = Artifact(
                case_id=new_case.id,
                target_id=tgt_id,
                node_type=a.get("node_type", "PROFILE"),
                label=a.get("label", "Artifact"),
                url=a.get("url"),
                confidence=float(a.get("confidence", 1.0)),
                metadata_json=a.get("metadata", {})
            )
            db.add(new_artifact)
            await db.flush()
            if old_id:
                artifact_id_map[str(old_id)] = new_artifact.id

    # If dossier has graph_edges, import them
    if "graph_edges" in dossier and isinstance(dossier["graph_edges"], list):
        for e in dossier["graph_edges"]:
            old_src = str(e.get("source", ""))
            old_tgt = str(e.get("target", ""))
            new_src = target_id_map.get(old_src, artifact_id_map.get(old_src))
            new_tgt = target_id_map.get(old_tgt, artifact_id_map.get(old_tgt))
            if new_src and new_tgt:
                new_edge = RelationEdge(
                    case_id=new_case.id,
                    source_id=new_src,
                    target_id=new_tgt,
                    relation_type=e.get("relation", "ASSOCIATED_WITH")
                )
                db.add(new_edge)

    await db.commit()
    await db.refresh(new_case)

    res = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .where(Case.id == new_case.id)
    )
    return res.scalar_one()

@router.get("", response_model=List[CaseResponse])
async def list_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .order_by(Case.updated_at.desc(), Case.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, case_in: CaseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case_in.title is not None:
        case.title = case_in.title
    if case_in.description is not None:
        case.description = case_in.description
    if case_in.status is not None:
        case.status = case_in.status
    if case_in.tags is not None:
        case.tags = case_in.tags
    if case_in.notes is not None:
        case.notes = case_in.notes

    await db.commit()
    await db.refresh(case)
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    await db.delete(case)
    await db.commit()

@router.get("/{case_id}/graph", response_model=CaseGraphResponse)
async def get_case_graph(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return await GraphService.get_case_graph(db, case_id)

@router.get("/{case_id}/export")
async def export_case_report(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Case)
        .options(*case_eager_options())
        .where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "export_metadata": {
            "suite": "Totally Spies OSINT",
            "version": "1.0",
            "exported_at": case.created_at.isoformat()
        },
        "case": {
            "id": case.id,
            "title": case.title,
            "description": case.description,
            "status": case.status,
            "tags": case.tags or [],
            "notes": case.notes or "",
            "created_at": case.created_at.isoformat()
        },

        "targets": [
            {
                "id": t.id,
                "type": t.type,
                "value": t.value,
                "notes": t.notes,
                "created_at": t.created_at.isoformat()
            }
            for t in case.targets
        ],
        "scans": [
            {
                "id": s.id,
                "module": s.module,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "total_probes": s.total,
                "completed_probes": s.completed,
                "matches_count": s.matches_count
            }
            for s in case.scans
        ],
        "artifacts": [
            {
                "id": a.id,
                "label": a.label,
                "node_type": a.node_type,
                "url": a.url,
                "confidence": a.confidence,
                "metadata": a.metadata_json or {},
                "discovered_at": a.discovered_at.isoformat()
            }
            for a in case.artifacts
        ],
        "graph_edges": [
            {
                "id": e.id,
                "source": e.source_id,
                "target": e.target_id,
                "relation": e.relation_type
            }
            for e in case.edges
        ]
    }
