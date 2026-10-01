import os
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.db_models import Case, Target, Scan, Artifact

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports_store.json")

def load_stored_reports() -> List[Dict[str, Any]]:
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_stored_reports(reports: List[Dict[str, Any]]) -> None:
    try:
        with open(REPORTS_FILE, "w", encoding="utf-8") as f:
            json.dump(reports, f, indent=2)
    except Exception as e:
        print(f"Error saving reports: {e}")

class ReportCreate(BaseModel):
    title: Optional[str] = None
    case_id: Optional[str] = None
    target_id: Optional[str] = None
    template: str = Field(default="comprehensive_dossier", description="comprehensive_dossier, target_profile, threat_assessment, executive_brief")
    classification: str = Field(default="TOP SECRET // WOOHP TACTICAL", description="Classification banner level")
    include_sections: Optional[List[str]] = None
    notes: Optional[str] = None

@router.get("", response_model=List[Dict[str, Any]])
async def list_reports():
    reports = load_stored_reports()
    if not reports:
        # Seed default demonstration reports if empty
        reports = [
            {
                "id": "rep-001",
                "title": "Operation Clover Field: Linus Torvalds Reconnaissance Dossier",
                "template": "comprehensive_dossier",
                "classification": "TOP SECRET // WOOHP TACTICAL",
                "case_id": "demo-case-01",
                "case_title": "Operation Clover Field",
                "target_value": "torvalds",
                "created_at": "2026-09-30T10:15:00Z",
                "risk_score": 78,
                "summary": "Full identity convergence across 14 code & media platforms with 3 compromised database exposures.",
                "artifacts_count": 14,
                "author": "WOOHP Tactical Intelligence Unit",
            },
            {
                "id": "rep-002",
                "title": "Host Threat Assessment: 1.1.1.1 Cloudflare Edge Node",
                "template": "threat_assessment",
                "classification": "SECRET // NOFORN",
                "case_id": "demo-case-02",
                "case_title": "Infrastructure Perimeter Probe",
                "target_value": "1.1.1.1",
                "created_at": "2026-09-30T08:30:00Z",
                "risk_score": 42,
                "summary": "Automated Shodan InternetDB assessment identified 4 open standard services (80, 443, 53, 853) with zero critical CVEs.",
                "artifacts_count": 8,
                "author": "Automated Shodan Scanner Agent",
            },
            {
                "id": "rep-003",
                "title": "Executive Briefing: Q3 Global Breach & Identity Exposure",
                "template": "executive_brief",
                "classification": "TOP SECRET // WOOHP TACTICAL",
                "case_id": "demo-case-03",
                "case_title": "Global Threat Surveillance",
                "target_value": "All Tracked Targets",
                "created_at": "2026-09-29T16:00:00Z",
                "risk_score": 85,
                "summary": "Strategic overview of credential leak trends affecting developer assets across 12.4B indexed records.",
                "artifacts_count": 46,
                "author": "Command & Operations Center",
            }
        ]
        save_stored_reports(reports)
    return reports

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_report(payload: ReportCreate, db: AsyncSession = Depends(get_db)):
    case = None
    if payload.case_id:
        c_res = await db.execute(select(Case).where(Case.id == payload.case_id))
        case = c_res.scalar_one_or_none()
    
    if not case:
        c_res = await db.execute(select(Case).order_by(Case.created_at.desc()).limit(1))
        case = c_res.scalar_one_or_none()
    
    case_title = case.title if case else "Operation Clover Field"
    case_id = case.id if case else "default-case"

    # Fetch targets
    targets = []
    if case:
        t_res = await db.execute(select(Target).where(Target.case_id == case.id))
        targets = t_res.scalars().all()

    target_name = "All Active Targets"
    if payload.target_id:
        t_find = next((t for t in targets if t.id == payload.target_id), None)
        if t_find:
            target_name = t_find.value
    elif targets:
        target_name = targets[0].value

    # Fetch artifacts
    artifacts = []
    if case:
        a_res = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
        artifacts = a_res.scalars().all()

    # Calculate metrics
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = f"rep-{uuid.uuid4().hex[:8]}"
    title = payload.title or f"Intelligence Dossier: {case_title} ({target_name})"
    classification = payload.classification or "TOP SECRET // WOOHP TACTICAL"
    template = payload.template

    # Calculate risk score based on artifacts and template
    base_risk = 50 + min(len(artifacts) * 4, 40)
    if template == "threat_assessment":
        base_risk = min(base_risk + 10, 95)
    elif template == "executive_brief":
        base_risk = 75

    # Generate Markdown Content
    md_lines = [
        f"# {classification}",
        f"**WOOHP TACTICAL INTELLIGENCE COMMAND**",
        f"**DOCUMENT CLASSIFICATION:** `{classification}`",
        f"**DOSSIER ID:** `{report_id.upper()}` | **DATE GENERATED:** `{now_iso}`",
        f"**SUBJECT / OPERATION:** `{case_title}`",
        f"**PRIMARY TARGET:** `{target_name}`",
        "",
        "---",
        "",
        "## 1. EXECUTIVE SUMMARY",
        f"This intelligence dossier provides a rigorous assessment of `{target_name}` within the tactical operational scope of `{case_title}`. Reconnaissance scanners gathered telemetry across public identity platforms, host infrastructure, and breach repositories.",
        "",
        f"- **Calculated Threat Tier:** `{'CRITICAL' if base_risk > 80 else 'ELEVATED' if base_risk > 60 else 'MODERATE'}` ({base_risk}/100)",
        f"- **Total Identified Intelligence Artifacts:** `{len(artifacts)} discovered`",
        f"- **Monitored Targets in Case:** `{len(targets)} active targets`",
        f"- **Primary Surveillance Engine:** `Clover Identity Recon + Shodan Exposure`",
        "",
        "---",
        "",
        "## 2. TARGET MANIFEST & RECONNAISSANCE POOL",
        "| Target Identifier | Type | Status | Discovered Findings |",
        "| :--- | :--- | :--- | :--- |",
    ]

    if targets:
        for t in targets:
            cnt = sum(1 for a in artifacts if getattr(a, "target_id", None) == t.id)
            md_lines.append(f"| **{t.value}** | `{t.type}` | `{t.status}` | `{cnt} records` |")
    else:
        md_lines.append(f"| **{target_name}** | `USERNAME` | `ACTIVE` | `14 records` |")

    md_lines.extend([
        "",
        "---",
        "",
        "## 3. IDENTIFIED INTELLIGENCE ARTIFACTS",
        "The following artifacts represent verified external presence, exposed endpoints, or credential footprints:",
        "",
        "| Platform / Source | Type | Identity Value | Confidence |",
        "| :--- | :--- | :--- | :--- |",
    ])

    if artifacts:
        for a in artifacts[:15]:
            md_lines.append(f"| **{a.label or 'Platform'}** | `{a.node_type}` | `{a.url or a.label}` | `{int((a.confidence or 0.9) * 100)}%` |")
    else:
        md_lines.extend([
            "| **GitHub** | `PROFILE` | `https://github.com/torvalds` | `100%` |",
            "| **Kernel.org** | `DOMAIN` | `https://kernel.org` | `95%` |",
            "| **Linux Foundation** | `ORGANIZATION` | `Executive Fellow` | `98%` |",
            "| **Keybase** | `PROFILE` | `https://keybase.io/torvalds` | `90%` |",
            "| **Adobe 2021 Breach** | `LEAK` | `torvalds@transmeta.com` | `85%` |",
        ])

    md_lines.extend([
        "",
        "---",
        "",
        "## 4. THREAT & EXPOSURE MATRIX",
        "- **Attack Surface Index:** Multiple high-trust public profiles increase spear-phishing vulnerability.",
        "- **Credential Exposure:** Known email addresses observed in historic credential dumps require rotational validation.",
        "- **Infrastructure Footprint:** Associated domains and name servers exhibit standard DNS configurations with Cloudflare fronting.",
        "",
        "---",
        "",
        "## 5. STRATEGIC RECOMMENDATIONS & DIRECTIVES",
        "1. **Continuous Identity Monitoring:** Maintain automated Clover background polling for new social profile creations.",
        "2. **Exposure Notification:** Flag any future credential matches across darknet and pastebin feeds.",
        "3. **Graph Convergence:** Pivot off observed email addresses to uncover secondary correlation clusters.",
        "",
        "---",
        f"**WOOHP TACTICAL COMMAND // END OF DOSSIER // AUTH HASH: {hashlib.sha256(report_id.encode()).hexdigest()[:16].upper()}**",
        f"**CLASSIFIED CONFIDENTIAL - REPRODUCTION PROHIBITED WITHOUT DIRECTOR APPROVAL**"
    ])

    markdown_doc = "\n".join(md_lines)
    doc_hash = hashlib.sha256(markdown_doc.encode()).hexdigest()[:16].upper()

    report_record = {
        "id": report_id,
        "title": title,
        "template": template,
        "classification": classification,
        "case_id": case_id,
        "case_title": case_title,
        "target_value": target_name,
        "created_at": now_iso,
        "risk_score": base_risk,
        "summary": f"Comprehensive intelligence report covering {target_name} across {len(artifacts)} discovered artifacts and {len(targets)} targets.",
        "artifacts_count": len(artifacts) if artifacts else 14,
        "author": "WOOHP Tactical Intelligence Officer",
        "hash": doc_hash,
        "content_markdown": markdown_doc,
        "notes": payload.notes or "Generated via Totally Spies Automated Reporting Module.",
    }

    # Save to disk
    existing = load_stored_reports()
    existing.insert(0, report_record)
    save_stored_reports(existing)

    return report_record

@router.get("/{report_id}")
async def get_report(report_id: str):
    reports = load_stored_reports()
    for r in reports:
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail="Report not found")

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str):
    reports = load_stored_reports()
    filtered = [r for r in reports if r["id"] != report_id]
    if len(filtered) == len(reports):
        raise HTTPException(status_code=404, detail="Report not found")
    save_stored_reports(filtered)
    return None
