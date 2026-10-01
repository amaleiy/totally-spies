from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.db_models import Case, Target, Artifact, RelationEdge

router = APIRouter(tags=["breaches"])

class BreachStatsResponse(BaseModel):
    total_records: int
    incidents_count: int
    unique_identifiers: int
    affected_services: int
    top_affected_countries: List[Dict[str, Any]]
    breach_types: List[Dict[str, Any]]
    live_connections: List[Dict[str, Any]]

class BreachIncident(BaseModel):
    id: str
    name: str
    records: int
    date: str
    time_ago: str
    source_status: str
    data_classes: List[str]
    description: str
    logo_color: str

class BreachLookupResult(BaseModel):
    query: str
    type: str
    total_found: int
    risk_score: int  # 0 - 100
    breaches: List[Dict[str, Any]]

class AttachBreachRequest(BaseModel):
    case_id: str
    target_id: Optional[str] = None
    breach_name: str
    query_value: str
    data_classes: List[str]
    records_count: Optional[int] = 0

# Sample dataset representing global breach incidents
BREACH_INCIDENTS = [
    {
        "id": "br-linkedin",
        "name": "LinkedIn",
        "records": 700000000,
        "date": "2021-06-22",
        "time_ago": "28 minutes ago",
        "source_status": "Verified",
        "data_classes": ["Email Addresses", "Phone Numbers", "Full Names", "Salaries", "Work Experience"],
        "description": "Massive scraped database containing 700M professional profiles sold on dark web forums.",
        "logo_color": "#0077b5"
    },
    {
        "id": "br-adobe",
        "name": "Adobe",
        "records": 153000000,
        "date": "2013-10-04",
        "time_ago": "12 minutes ago",
        "source_status": "Verified",
        "data_classes": ["Email Addresses", "Password Hashes", "Usernames", "Password Hints"],
        "description": "Compromised Adobe network with exposed encrypted passwords and source code assets.",
        "logo_color": "#ff0000"
    },
    {
        "id": "br-x-twitter",
        "name": "X (Twitter)",
        "records": 235000000,
        "date": "2023-01-04",
        "time_ago": "2 hours ago",
        "source_status": "Verified",
        "data_classes": ["Email Addresses", "Usernames", "Follower Counts", "Account Creation Dates"],
        "description": "Exposed email-to-Twitter account identifier database leaked publicly on hacking forums.",
        "logo_color": "#ffffff"
    },
    {
        "id": "br-canva",
        "name": "Canva",
        "records": 139000000,
        "date": "2019-05-24",
        "time_ago": "1 hour ago",
        "source_status": "Verified",
        "data_classes": ["Email Addresses", "Usernames", "Full Names", "Bcrypt Password Hashes", "Cities"],
        "description": "Graphic design platform breach orchestrated by Gnosticplayers group.",
        "logo_color": "#00c4cc"
    },
    {
        "id": "br-telegram",
        "name": "Telegram",
        "records": 487000000,
        "date": "2023-12-06",
        "time_ago": "3 hours ago",
        "source_status": "Verified",
        "data_classes": ["Phone Numbers", "User IDs", "Channel Memberships"],
        "description": "Leaked scraper compilation mapping phone numbers to Telegram handles and channels.",
        "logo_color": "#24a1de"
    },
    {
        "id": "br-dropbox",
        "name": "Dropbox",
        "records": 68000000,
        "date": "2016-08-31",
        "time_ago": "4 hours ago",
        "source_status": "Verified",
        "data_classes": ["Email Addresses", "Bcrypt Hashes", "SHA1 Hashes"],
        "description": "Cloud file storage compromise dating from reused employee credentials.",
        "logo_color": "#0061ff"
    },
    {
        "id": "br-tesla",
        "name": "Tesla",
        "records": 100000000,
        "date": "2023-05-10",
        "time_ago": "5 hours ago",
        "source_status": "Verified",
        "data_classes": ["Employee Social Security Numbers", "Internal Files", "Customer Contacts"],
        "description": "Whistleblower leak of internal employee databases and engineering communications.",
        "logo_color": "#e82127"
    }
]

@router.get("/stats", response_model=BreachStatsResponse)
async def get_breach_stats():
    return BreachStatsResponse(
        total_records=12428139991,
        incidents_count=1842,
        unique_identifiers=3612450120,
        affected_services=2412,
        top_affected_countries=[
            {"code": "US", "name": "United States", "records": "1.24B", "records_num": 1242813991, "flag": "🇺🇸", "lat": 38.0, "lon": -97.0},
            {"code": "RU", "name": "Russia", "records": "632.4M", "records_num": 632400000, "flag": "🇷🇺", "lat": 61.5, "lon": 105.3},
            {"code": "CN", "name": "China", "records": "511.8M", "records_num": 511800000, "flag": "🇨🇳", "lat": 35.8, "lon": 104.1},
            {"code": "IN", "name": "India", "records": "432.1M", "records_num": 432100000, "flag": "🇮🇳", "lat": 20.5, "lon": 78.9},
            {"code": "DE", "name": "Germany", "records": "298.6M", "records_num": 298600000, "flag": "🇩🇪", "lat": 51.1, "lon": 10.4},
            {"code": "UK", "name": "United Kingdom", "records": "245.1M", "records_num": 245100000, "flag": "🇬🇧", "lat": 55.3, "lon": -3.4},
            {"code": "SG", "name": "Singapore", "records": "98.4M", "records_num": 98400000, "flag": "🇸🇬", "lat": 1.35, "lon": 103.8},
            {"code": "BR", "name": "Brazil", "records": "189.4M", "records_num": 189400000, "flag": "🇧🇷", "lat": -14.2, "lon": -51.9},
            {"code": "AU", "name": "Australia", "records": "112.5M", "records_num": 112500000, "flag": "🇦🇺", "lat": -25.2, "lon": 133.7},
        ],
        breach_types=[
            {"type": "Email Addresses", "percentage": 42, "color": "#f43f5e"},
            {"type": "Passwords", "percentage": 18, "color": "#3b82f6"},
            {"type": "Usernames", "percentage": 16, "color": "#a855f7"},
            {"type": "Personal Information", "percentage": 12, "color": "#ec4899"},
            {"type": "Financial Data", "percentage": 7, "color": "#f97316"},
            {"type": "Other", "percentage": 5, "color": "#06b6d4"}
        ],
        live_connections=[
            {"role": "Collection Node", "location": "United States", "status": "Active", "color": "#f43f5e", "lat": 37.77, "lon": -122.41},
            {"role": "Processing Node", "location": "Germany", "status": "Active", "color": "#3b82f6", "lat": 50.11, "lon": 8.68},
            {"role": "Breach Source", "location": "Russia", "status": "Monitored", "color": "#f43f5e", "lat": 55.75, "lon": 37.61},
            {"role": "Mirror Node", "location": "Singapore", "status": "Active", "color": "#06b6d4", "lat": 1.35, "lon": 103.81},
            {"role": "Analysis Node", "location": "India", "status": "Active", "color": "#a855f7", "lat": 12.97, "lon": 77.59}
        ]
    )

@router.get("/recent", response_model=List[BreachIncident])
async def get_recent_breaches():
    return BREACH_INCIDENTS

@router.get("/largest", response_model=List[BreachIncident])
async def get_largest_breaches():
    return sorted(BREACH_INCIDENTS, key=lambda x: x["records"], reverse=True)[:5]

@router.get("/lookup", response_model=BreachLookupResult)
@router.get("/search", response_model=BreachLookupResult)
async def lookup_breach_data(
    query: str = Query(..., description="Query string: email, username, domain, IP, or hash"),
    type: str = Query("email", description="Query type: email, username, domain, ip, hash")
):
    q = query.strip().lower()
    t = type.strip().lower()

    # Generate deterministic matches based on query characteristics
    matched_breaches = []
    
    # Check against known sample breaches
    for inc in BREACH_INCIDENTS:
        # If user queries a domain like "adobe.com" or "linkedin.com"
        if inc["name"].lower() in q or (t == "domain" and inc["name"].lower() in q):
            matched_breaches.append({
                "breach_name": inc["name"],
                "records": inc["records"],
                "date": inc["date"],
                "data_classes": inc["data_classes"],
                "severity": "HIGH",
                "verified": True,
                "description": inc["description"]
            })

    # If no exact brand name match, provide realistic simulated intelligence for the query
    if not matched_breaches:
        matched_breaches = [
            {
                "breach_name": "Collection #1 Compilation",
                "records": 772904991,
                "date": "2019-01-16",
                "data_classes": ["Email Addresses", "Plaintext Passwords", "Password Hashes"],
                "severity": "CRITICAL",
                "verified": True,
                "description": "Massive credential stuffing list compiling breaches from 2,890 websites."
            },
            {
                "breach_name": "Exploit.in Dump",
                "records": 593427119,
                "date": "2016-10-15",
                "data_classes": ["Usernames", "Email Addresses", "Hashed Passwords"],
                "severity": "HIGH",
                "verified": True,
                "description": "Russian underground forum database aggregation leak."
            }
        ]

        if t in ["ip", "domain"]:
            matched_breaches.append({
                "breach_name": "Naz.API Credential Harvest",
                "records": 70840000,
                "date": "2024-01-08",
                "data_classes": ["IP Addresses", "User Credentials", "Session Cookies"],
                "severity": "HIGH",
                "verified": True,
                "description": "Infostealer log compilation harvested from compromised endpoints."
            })

    risk_score = 88 if len(matched_breaches) > 2 else (65 if len(matched_breaches) > 0 else 0)

    return BreachLookupResult(
        query=query,
        type=t,
        total_found=len(matched_breaches),
        risk_score=risk_score,
        breaches=matched_breaches
    )

@router.post("/attach", status_code=status.HTTP_201_CREATED)
async def attach_breach_to_case(
    payload: AttachBreachRequest,
    db: AsyncSession = Depends(get_db)
):
    case = (await db.execute(select(Case).where(Case.id == payload.case_id))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    target_id = payload.target_id
    if not target_id:
        # Find or create a target for the queried value
        res_t = await db.execute(select(Target).where(Target.case_id == payload.case_id, Target.value == payload.query_value))
        existing_t = res_t.scalar_one_or_none()
        if existing_t:
            target_id = existing_t.id
        else:
            new_t = Target(
                case_id=payload.case_id,
                type="EMAIL" if "@" in payload.query_value else "USERNAME",
                value=payload.query_value,
                notes=f"Created from Breach Intelligence lookup: {payload.breach_name}"
            )
            db.add(new_t)
            await db.flush()
            target_id = new_t.id

    # Create Artifact for the Breach
    artifact = Artifact(
        case_id=payload.case_id,
        target_id=target_id,
        node_type="BREACH",
        label=f"Breach: {payload.breach_name}",
        confidence=1.0,
        metadata_json={
            "breach_name": payload.breach_name,
            "query_value": payload.query_value,
            "data_classes": payload.data_classes,
            "records": payload.records_count,
            "category": "breach_exposure",
            "source": "WOOHP Breach DB"
        }
    )
    db.add(artifact)
    await db.flush()

    # Create Relation Edge
    edge = RelationEdge(
        case_id=payload.case_id,
        source_id=target_id,
        target_id=artifact.id,
        relation_type="EXPOSED_IN_BREACH"
    )
    db.add(edge)
    await db.commit()

    return {
        "status": "attached",
        "case_id": payload.case_id,
        "target_id": target_id,
        "artifact_id": artifact.id,
        "label": artifact.label
    }
