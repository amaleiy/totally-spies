from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.core.database import get_db
from app.models.db_models import Artifact, RelationEdge
from app.models.schemas import ArtifactResponse

router = APIRouter(tags=["artifacts"])

@router.get("/cases/{case_id}/artifacts", response_model=List[ArtifactResponse])
async def list_case_artifacts(
    case_id: str,
    scan_id: Optional[str] = Query(None, description="Filter artifacts by scan ID"),
    target_id: Optional[str] = Query(None, description="Filter artifacts by target ID"),
    db: AsyncSession = Depends(get_db)
):
    query = select(Artifact).where(Artifact.case_id == case_id)
    if scan_id:
        query = query.where(Artifact.scan_id == scan_id)
    if target_id:
        query = query.where(Artifact.target_id == target_id)
    query = query.order_by(Artifact.discovered_at.desc())

    result = await db.execute(query)
    return result.scalars().all()

@router.get("/artifacts/{artifact_id}", response_model=ArtifactResponse)
async def get_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    art = result.scalar_one_or_none()
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return art

@router.delete("/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    art = result.scalar_one_or_none()
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")
    
    # Cascade delete associated relation edges
    await db.execute(
        delete(RelationEdge).where(
            (RelationEdge.source_id == artifact_id) | (RelationEdge.target_id == artifact_id)
        )
    )
    await db.delete(art)
    await db.commit()
