import asyncio
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.db_models import Case, Target, Artifact, RelationEdge
from app.modules.identity.scanner import CloverScanner

router = APIRouter(prefix="/clover", tags=["clover"])

scanner_instance = CloverScanner()

class CloverLookupRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    categories: Optional[List[str]] = None
    platforms: Optional[List[str]] = None
    concurrency: int = Field(default=15, ge=1, le=30)
    timeout: float = Field(default=5.0, ge=1.0, le=20.0)
    permutations: bool = False

class AttachProfilesRequest(BaseModel):
    case_id: str
    target_username: str
    profiles: List[Dict[str, Any]]

@router.get("/platforms")
async def get_platforms():
    sites = scanner_instance.sites or []
    categories = set()
    category_counts: Dict[str, int] = {}

    for s in sites:
        cat = s.get("cat", "general").lower()
        categories.add(cat)
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Extract clean platforms list
    popular = []
    seen = set()
    for s in sites:
        name = s.get("name", "")
        if name and name.lower() not in seen:
            seen.add(name.lower())
            popular.append({
                "name": name,
                "category": s.get("cat", "general").lower(),
                "url_template": s.get("uri_pretty", "")
            })

    return {
        "total_platforms": len(sites),
        "categories": sorted(list(categories)),
        "category_counts": category_counts,
        "sample_platforms": popular[:60]
    }

def generate_username_permutations(base_username: str) -> List[str]:
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '', base_username).strip()
    if not clean:
        return []
    variants = [
        clean,
        f"{clean}_dev",
        f"{clean}123",
        f"{clean}_sec",
        f"{clean}.official",
        f"real_{clean}",
        f"the_{clean}",
    ]
    return list(dict.fromkeys(variants))

@router.post("/lookup")
async def lookup_username(payload: CloverLookupRequest):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    config = {
        "concurrency": payload.concurrency,
        "timeout": payload.timeout,
    }

    # If specific categories or platforms selected, filter
    all_sites = scanner_instance.sites or []
    filtered_sites = all_sites

    if payload.categories and len(payload.categories) > 0:
        cats = [c.lower() for c in payload.categories]
        filtered_sites = [s for s in filtered_sites if s.get("cat", "general").lower() in cats]

    if payload.platforms and len(payload.platforms) > 0:
        plats = [p.lower() for p in payload.platforms]
        filtered_sites = [s for s in filtered_sites if any(p in s.get("name", "").lower() for p in plats)]
    elif not payload.categories:
        # Fast default: probe popular recognizable platforms
        popular_keywords = [
            "github", "gitlab", "reddit", "telegram", "steam", "docker",
            "keybase", "pastebin", "hackernews", "disqus", "soundcloud",
            "chess", "producthunt", "medium", "pypi", "pinterest", "mastodon"
        ]
        filtered_sites = [s for s in filtered_sites if any(k in s.get("name", "").lower() for k in popular_keywords)]

    config = {
        "concurrency": payload.concurrency,
        "timeout": payload.timeout,
        "sites": filtered_sites,
    }

    # Run scan
    results = []
    async for probe_result in scanner_instance.run(username, config=config):
            if probe_result.is_match:
                results.append({
                    "platform": probe_result.platform,
                    "url": probe_result.url,
                    "status_code": probe_result.status_code,
                    "response_time": probe_result.response_time,
                    "confidence": probe_result.metadata.get("confidence", 0.95),
                    "category": probe_result.metadata.get("category", "general"),
                    "display_name": probe_result.metadata.get("display_name"),
                    "avatar_url": probe_result.metadata.get("avatar_url"),
                    "bio": probe_result.metadata.get("bio")
                })

    permutations = generate_username_permutations(username) if payload.permutations else []

    return {
        "username": username,
        "total_probed": len(filtered_sites),
        "total_matches": len(results),
        "matches": results,
        "permutations": permutations
    }

@router.post("/attach", status_code=status.HTTP_201_CREATED)
async def attach_profiles_to_case(payload: AttachProfilesRequest, db: AsyncSession = Depends(get_db)):
    case_res = await db.execute(select(Case).where(Case.id == payload.case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Find or create Target for this username
    t_res = await db.execute(
        select(Target).where(Target.case_id == payload.case_id, Target.value == payload.target_username)
    )
    target = t_res.scalar_one_or_none()
    if not target:
        target = Target(
            case_id=payload.case_id,
            type="USERNAME",
            value=payload.target_username,
            status="ACTIVE",
            notes="Added via Clover Identity Reconnaissance"
        )
        db.add(target)
        await db.commit()
        await db.refresh(target)

    # Attach each profile as an Artifact
    created_artifacts = []
    for p in payload.profiles:
        plat = p.get("platform", "Unknown")
        url = p.get("url", "")
        conf = float(p.get("confidence", 0.95))

        # Check if already exists
        a_res = await db.execute(
            select(Artifact).where(Artifact.case_id == payload.case_id, Artifact.url == url)
        )
        existing = a_res.scalar_one_or_none()
        if not existing:
            artifact = Artifact(
                case_id=payload.case_id,
                target_id=target.id,
                node_type="PROFILE",
                label=plat,
                url=url,
                confidence=conf,
                metadata_json={
                    "platform": plat,
                    "category": p.get("category", "social"),
                    "status_code": p.get("status_code", 200),
                    "response_time": p.get("response_time"),
                    "bio": p.get("bio"),
                    "display_name": p.get("display_name"),
                }
            )
            db.add(artifact)
            await db.flush()

            edge = RelationEdge(
                case_id=payload.case_id,
                source_id=target.id,
                target_id=artifact.id,
                relation_type="OWNS_ACCOUNT"
            )
            db.add(edge)
            created_artifacts.append(plat)

    await db.commit()

    return {
        "status": "success",
        "case_id": payload.case_id,
        "target_id": target.id,
        "attached_count": len(created_artifacts),
        "attached_platforms": created_artifacts
    }
