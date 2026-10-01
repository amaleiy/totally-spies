import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Column, String, DateTime, Integer, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    status = Column(String(50), nullable=False, default="ACTIVE")  # ACTIVE, CLOSED, ARCHIVED
    tags = Column(JSON, nullable=True, default=list)
    notes = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    targets = relationship("Target", back_populates="case", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="case", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="case", cascade="all, delete-orphan")
    edges = relationship("RelationEdge", back_populates="case", cascade="all, delete-orphan")

    @property
    def targets_count(self) -> int:
        try:
            return len(self.targets) if self.targets is not None else 0
        except Exception:
            return 0

    @property
    def scans_count(self) -> int:
        try:
            return len(self.scans) if self.scans is not None else 0
        except Exception:
            return 0

    @property
    def artifacts_count(self) -> int:
        try:
            return len(self.artifacts) if self.artifacts is not None else 0
        except Exception:
            return 0

    @property
    def edges_count(self) -> int:
        try:
            return len(self.edges) if self.edges is not None else 0
        except Exception:
            return 0



class Target(Base):
    __tablename__ = "targets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # USERNAME, DOMAIN, EMAIL, IP
    value = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True, default="")
    status = Column(String(50), nullable=False, default="ACTIVE")  # ACTIVE, SCANNING, COMPLETED, PAUSED, FAILED
    tags = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="targets")
    scans = relationship("Scan", back_populates="target", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="target", cascade="all, delete-orphan")

    @property
    def case_title(self) -> str:
        try:
            return self.case.title if self.case else ""
        except Exception:
            return ""

    @property
    def scans_count(self) -> int:
        try:
            return len(self.scans) if self.scans is not None else 0
        except Exception:
            return 0

    @property
    def artifacts_count(self) -> int:
        try:
            return len(self.artifacts) if self.artifacts is not None else 0
        except Exception:
            return 0

    @property
    def last_scanned_at(self) -> Optional[datetime]:
        try:
            if not self.scans:
                return None
            sorted_scans = sorted(
                self.scans,
                key=lambda s: s.started_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True
            )
            return sorted_scans[0].started_at if sorted_scans else None
        except Exception:
            return None

    @property
    def progress(self) -> int:
        try:
            if not self.scans:
                return 0
            sorted_scans = sorted(
                self.scans,
                key=lambda s: s.started_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True
            )
            latest = sorted_scans[0]
            if latest.status == "COMPLETED":
                return 100
            if latest.status == "RUNNING" and latest.total > 0:
                return min(99, int((latest.completed / latest.total) * 100))
            if latest.status == "FAILED":
                return 0
            return 0
        except Exception:
            return 0

    @property
    def effective_status(self) -> str:
        try:
            if self.status in ["PAUSED", "FAILED"]:
                return self.status
            if self.scans:
                for s in self.scans:
                    if s.status == "RUNNING":
                        return "SCANNING"
                sorted_scans = sorted(
                    self.scans,
                    key=lambda s: s.started_at or datetime.min.replace(tzinfo=timezone.utc),
                    reverse=True
                )
                if sorted_scans and sorted_scans[0].status == "COMPLETED":
                    return "COMPLETED"
            return self.status or "ACTIVE"
        except Exception:
            return self.status or "ACTIVE"



class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String(36), ForeignKey("targets.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(50), nullable=False)  # clover, sam, alex
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    started_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    total = Column(Integer, default=0, nullable=False)
    completed = Column(Integer, default=0, nullable=False)
    matches_count = Column(Integer, default=0, nullable=False)
    error = Column(Text, nullable=True)
    config = Column(JSON, nullable=True, default=dict)

    case = relationship("Case", back_populates="scans")
    target = relationship("Target", back_populates="scans")
    events = relationship("ScanEvent", back_populates="scan", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="scan", cascade="all, delete-orphan")


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # PROGRESS, MATCH, LOG, ERROR, DONE
    message = Column(Text, nullable=False)
    payload = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="events")


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String(36), ForeignKey("targets.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    node_type = Column(String(50), nullable=False)  # PROFILE, ACCOUNT, SERVICE, REPO, DOMAIN, IP
    label = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    metadata_json = Column(JSON, nullable=True, default=dict)
    discovered_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="artifacts")
    target = relationship("Target", back_populates="artifacts")
    scan = relationship("Scan", back_populates="artifacts")


class RelationEdge(Base):
    __tablename__ = "relation_edges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(36), nullable=False)
    target_id = Column(String(36), nullable=False)
    relation_type = Column(String(50), nullable=False, default="OWNS_ACCOUNT")  # OWNS_ACCOUNT, LINKED_TO, HOSTED_ON
    created_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="edges")
