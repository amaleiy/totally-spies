import math
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.db_models import Target, Artifact, RelationEdge
from app.models.schemas import CaseGraphResponse, GraphNode, GraphEdge

class GraphService:
    @staticmethod
    async def get_case_graph(session: AsyncSession, case_id: str) -> CaseGraphResponse:
        """Constructs graph nodes and edges for visualization in React Flow."""
        
        # 1. Fetch Targets
        target_res = await session.execute(
            select(Target).where(Target.case_id == case_id)
        )
        targets = target_res.scalars().all()

        # 2. Fetch Artifacts
        artifact_res = await session.execute(
            select(Artifact).where(Artifact.case_id == case_id)
        )
        artifacts = artifact_res.scalars().all()

        # 3. Fetch Relation Edges
        edge_res = await session.execute(
            select(RelationEdge).where(RelationEdge.case_id == case_id)
        )
        db_edges = edge_res.scalars().all()

        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []

        # Position targets in the center
        target_coords: Dict[str, Dict[str, float]] = {}
        for idx, t in enumerate(targets):
            x = 350.0 + (idx * 250.0)
            y = 250.0
            target_coords[t.id] = {"x": x, "y": y}
            nodes.append(
                GraphNode(
                    id=t.id,
                    type="targetNode",
                    position={"x": x, "y": y},
                    data={
                        "label": t.value,
                        "targetType": t.type,
                        "notes": t.notes,
                        "created_at": t.created_at.isoformat()
                    }
                )
            )

        # Position artifacts radially around their corresponding target
        radius = 280.0
        target_artifact_count: Dict[str, int] = {}
        
        # Count artifacts per target first to calculate angles
        for art in artifacts:
            target_artifact_count[art.target_id] = target_artifact_count.get(art.target_id, 0) + 1

        target_artifact_idx: Dict[str, int] = {}
        for art in artifacts:
            center = target_coords.get(art.target_id, {"x": 350.0, "y": 250.0})
            total = target_artifact_count.get(art.target_id, 1)
            cur_idx = target_artifact_idx.get(art.target_id, 0)
            target_artifact_idx[art.target_id] = cur_idx + 1

            angle = (2 * math.pi * cur_idx) / max(total, 1)
            node_x = center["x"] + radius * math.cos(angle)
            node_y = center["y"] + radius * math.sin(angle)

            nodes.append(
                GraphNode(
                    id=art.id,
                    type="artifactNode",
                    position={"x": round(node_x, 1), "y": round(node_y, 1)},
                    data={
                        "label": art.label,
                        "node_type": art.node_type,
                        "url": art.url,
                        "confidence": art.confidence,
                        "metadata": art.metadata_json or {},
                        "discovered_at": art.discovered_at.isoformat()
                    }
                )
            )

        # Construct Edges
        for e in db_edges:
            edges.append(
                GraphEdge(
                    id=e.id,
                    source=e.source_id,
                    target=e.target_id,
                    label=e.relation_type,
                    animated=True
                )
            )

        return CaseGraphResponse(nodes=nodes, edges=edges)
