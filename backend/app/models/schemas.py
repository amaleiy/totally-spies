from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

# Target Schemas
class TargetBase(BaseModel):
    type: str = Field(..., description="Target type: USERNAME, DOMAIN, EMAIL, IP")
    value: str = Field(..., description="Value to target/probe")
    notes: Optional[str] = ""
    status: Optional[str] = "ACTIVE"
    tags: Optional[List[str]] = Field(default_factory=list)

class TargetCreate(TargetBase):
    pass

class TargetUpdate(BaseModel):
    type: Optional[str] = None
    value: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

class TargetResponse(TargetBase):
    id: str
    case_id: str
    case_title: Optional[str] = ""
    created_at: datetime
    status: Optional[str] = "ACTIVE"
    tags: Optional[List[str]] = []
    progress: Optional[int] = 0
    last_scanned_at: Optional[datetime] = None
    scans_count: Optional[int] = 0
    artifacts_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ScanEvent Schemas
class ScanEventResponse(BaseModel):
    id: str
    scan_id: str
    event_type: str
    message: str
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Artifact Schemas
class ArtifactBase(BaseModel):
    node_type: str
    label: str
    url: Optional[str] = None
    confidence: float = 1.0
    metadata_json: Optional[Dict[str, Any]] = None

class ArtifactResponse(ArtifactBase):
    id: str
    case_id: str
    target_id: str
    scan_id: Optional[str] = None
    discovered_at: datetime

    model_config = ConfigDict(from_attributes=True)

# RelationEdge Schemas
class RelationEdgeResponse(BaseModel):
    id: str
    case_id: str
    source_id: str
    target_id: str
    relation_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Scan Schemas
class ScanCreate(BaseModel):
    target_id: str
    module: str = Field(default="clover", description="Module: clover (identity), sam (network), alex (media)")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ScanResponse(BaseModel):
    id: str
    case_id: str
    target_id: str
    module: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total: int
    completed: int
    matches_count: int
    error: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class TargetDetailResponse(BaseModel):
    target: TargetResponse
    artifacts: List[ArtifactResponse] = []
    scans: List[ScanResponse] = []

class TargetBulkCreate(BaseModel):
    case_id: str
    targets: List[TargetCreate]

# Case Schemas

class CaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    status: Optional[str] = "ACTIVE"
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = ""

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class CaseResponse(CaseBase):
    id: str
    created_at: datetime
    updated_at: datetime
    targets: List[TargetResponse] = []
    scans: List[ScanResponse] = []
    targets_count: Optional[int] = 0
    scans_count: Optional[int] = 0
    artifacts_count: Optional[int] = 0
    edges_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# Graph Response Schema
class GraphNode(BaseModel):
    id: str
    type: str  # targetNode, artifactNode
    data: Dict[str, Any]
    position: Optional[Dict[str, float]] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: Optional[bool] = False

class CaseGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
