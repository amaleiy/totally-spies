import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket
from sqlalchemy.future import select

from app.core.database import async_session_maker
from app.models.db_models import Scan, ScanEvent, Artifact, RelationEdge, Target
from app.modules.identity.scanner import CloverScanner
from app.modules.exposure.scanner import ExposureScanner

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ConnectionManager:
    """Manages active WebSocket connections grouped by scan_id and case_id."""
    def __init__(self):
        self.active_scan_connections: Dict[str, Set[WebSocket]] = {}
        self.active_case_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_scan(self, websocket: WebSocket, scan_id: str):
        await websocket.accept()
        if scan_id not in self.active_scan_connections:
            self.active_scan_connections[scan_id] = set()
        self.active_scan_connections[scan_id].add(websocket)

    def disconnect_scan(self, websocket: WebSocket, scan_id: str):
        if scan_id in self.active_scan_connections:
            self.active_scan_connections[scan_id].discard(websocket)

    async def connect_case(self, websocket: WebSocket, case_id: str):
        await websocket.accept()
        if case_id not in self.active_case_connections:
            self.active_case_connections[case_id] = set()
        self.active_case_connections[case_id].add(websocket)

    def disconnect_case(self, websocket: WebSocket, case_id: str):
        if case_id in self.active_case_connections:
            self.active_case_connections[case_id].discard(websocket)

    async def broadcast_scan(self, scan_id: str, message: Dict[str, Any]):
        if scan_id in self.active_scan_connections:
            dead_connections = set()
            for ws in self.active_scan_connections[scan_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.add(ws)
            self.active_scan_connections[scan_id].difference_update(dead_connections)

    async def broadcast_case(self, case_id: str, message: Dict[str, Any]):
        if case_id in self.active_case_connections:
            dead_connections = set()
            for ws in self.active_case_connections[case_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.add(ws)
            self.active_case_connections[case_id].difference_update(dead_connections)

manager = ConnectionManager()

class ScanOrchestrator:
    def __init__(self):
        self.scanner_modules = {
            "clover": CloverScanner(),
            "exposure": ExposureScanner(),
        }
        self.active_tasks: Dict[str, asyncio.Task] = {}

    async def start_scan(self, scan_id: str):
        """Asynchronously runs a scan task in the background."""
        task = asyncio.create_task(self._execute_scan(scan_id))
        self.active_tasks[scan_id] = task
        return task

    async def cancel_scan(self, scan_id: str) -> bool:
        """Cancels a currently executing background scan."""
        task = self.active_tasks.get(scan_id)
        if task and not task.done():
            task.cancel()
            return True
        return False

    async def _execute_scan(self, scan_id: str):
        # 1. Fetch scan and target in a brief session
        target_value: Optional[str] = None
        target_id: Optional[str] = None
        case_id: Optional[str] = None
        module_name: Optional[str] = None
        scan_config: Dict[str, Any] = {}
        scanner = None

        async with async_session_maker() as session:
            res = await session.execute(select(Scan).where(Scan.id == scan_id))
            scan = res.scalar_one_or_none()
            if not scan:
                return

            res_target = await session.execute(select(Target).where(Target.id == scan.target_id))
            target = res_target.scalar_one_or_none()
            if not target:
                scan.status = "FAILED"
                scan.error = "Target not found"
                await session.commit()
                return

            scanner = self.scanner_modules.get(scan.module)
            if not scanner:
                scan.status = "FAILED"
                scan.error = f"Unsupported scanner module: {scan.module}"
                await session.commit()
                return

            target_value = target.value
            target_id = target.id
            case_id = scan.case_id
            module_name = scan.module
            scan_config = scan.config or {}

            # Mark scan as RUNNING
            scan.status = "RUNNING"
            scan.started_at = utc_now()
            scan.total = len(getattr(scanner, "sites", []))
            scan.completed = 0
            scan.matches_count = 0
            
            start_event = ScanEvent(
                scan_id=scan.id,
                event_type="PROGRESS",
                message=f"Started {scanner.name.upper()} scanner with {scan.total} platforms.",
                payload={"total": scan.total, "target": target_value}
            )
            session.add(start_event)
            await session.commit()

        # Broadcast scan started
        total_sites = len(getattr(scanner, "sites", []))
        await manager.broadcast_scan(scan_id, {
            "type": "SCAN_STARTED",
            "scan_id": scan_id,
            "case_id": case_id,
            "total": total_sites,
            "module": module_name
        })
        await manager.broadcast_case(case_id, {
            "type": "SCAN_UPDATED",
            "scan_id": scan_id,
            "status": "RUNNING"
        })

        try:
            # 2. Stream probe execution without holding database session open
            async for probe in scanner.run(target_value, scan_config):
                new_artifact_dict = None
                new_edge_dict = None
                completed_count = 0
                matches_count = 0

                # Brief atomic transaction to persist probe result
                async with async_session_maker() as session:
                    res = await session.execute(select(Scan).where(Scan.id == scan_id))
                    scan = res.scalar_one_or_none()
                    if not scan:
                        break

                    scan.completed += 1
                    completed_count = scan.completed

                    event_type = "MATCH" if probe.is_match else "LOG"
                    event_msg = f"{'[+] MATCH' if probe.is_match else '[-] Clean'}: {probe.platform} ({probe.status_code})"
                    if probe.error:
                        event_msg += f" - {probe.error}"

                    scan_event = ScanEvent(
                        scan_id=scan.id,
                        event_type=event_type,
                        message=event_msg,
                        payload=probe.model_dump()
                    )
                    session.add(scan_event)

                    if probe.is_match:
                        scan.matches_count += 1
                        matches_count = scan.matches_count

                        cat = (probe.metadata or {}).get("category", "")
                        if module_name == "exposure":
                            artifact_label = probe.platform
                            if cat == "port":
                                rel_type = "EXPOSED_PORT"
                                n_type = "PORT"
                            elif cat == "vulnerability":
                                rel_type = "AFFECTED_BY"
                                n_type = "VULN"
                            elif cat in ["domain", "host"]:
                                rel_type = "RESOLVES_TO"
                                n_type = "HOST"
                            else:
                                rel_type = "EXPOSED_ASSET"
                                n_type = "ASSET"
                        else:
                            artifact_label = f"{probe.platform}: {target_value}"
                            rel_type = "OWNS_ACCOUNT"
                            n_type = "PROFILE"

                        artifact = Artifact(
                            case_id=case_id,
                            target_id=target_id,
                            scan_id=scan.id,
                            node_type=n_type,
                            label=artifact_label,
                            url=probe.url,
                            confidence=1.0,
                            metadata_json=probe.metadata
                        )
                        session.add(artifact)
                        await session.flush()

                        edge = RelationEdge(
                            case_id=case_id,
                            source_id=target_id,
                            target_id=artifact.id,
                            relation_type=rel_type
                        )
                        session.add(edge)
                        await session.flush()

                        new_artifact_dict = {
                            "id": artifact.id,
                            "type": "artifactNode",
                            "data": {
                                "label": artifact.label,
                                "node_type": artifact.node_type,
                                "url": artifact.url,
                                "confidence": artifact.confidence,
                                "metadata": artifact.metadata_json,
                                "discovered_at": artifact.discovered_at.isoformat()
                            }
                        }
                        new_edge_dict = {
                            "id": edge.id,
                            "source": edge.source_id,
                            "target": edge.target_id,
                            "label": edge.relation_type,
                            "animated": True
                        }
                    else:
                        matches_count = scan.matches_count

                    await session.commit()

                # Broadcast live telemetry over WebSocket
                payload = {
                    "type": "PROBE_RESULT",
                    "scan_id": scan_id,
                    "case_id": case_id,
                    "probe": probe.model_dump(),
                    "completed": completed_count,
                    "total": total_sites,
                    "matches_count": matches_count
                }
                if new_artifact_dict:
                    payload["new_node"] = new_artifact_dict
                    payload["new_edge"] = new_edge_dict

                await manager.broadcast_scan(scan_id, payload)
                await manager.broadcast_case(case_id, payload)

            # 3. Finalize scan status in brief transaction
            final_matches = 0
            final_completed = 0
            async with async_session_maker() as session:
                res = await session.execute(select(Scan).where(Scan.id == scan_id))
                scan = res.scalar_one_or_none()
                if scan:
                    scan.status = "COMPLETED"
                    scan.completed_at = utc_now()
                    final_matches = scan.matches_count
                    final_completed = scan.completed

                    done_event = ScanEvent(
                        scan_id=scan.id,
                        event_type="DONE",
                        message=f"Scan completed. Total probes: {scan.completed}, matches found: {scan.matches_count}.",
                        payload={"matches_count": scan.matches_count, "completed": scan.completed}
                    )
                    session.add(done_event)
                    await session.commit()

            summary = {
                "type": "SCAN_COMPLETED",
                "scan_id": scan_id,
                "case_id": case_id,
                "matches_count": final_matches,
                "completed": final_completed,
                "total": total_sites
            }
            await manager.broadcast_scan(scan_id, summary)
            await manager.broadcast_case(case_id, summary)

        except asyncio.CancelledError:
            async with async_session_maker() as session:
                res = await session.execute(select(Scan).where(Scan.id == scan_id))
                scan = res.scalar_one_or_none()
                if scan:
                    scan.status = "CANCELLED"
                    scan.completed_at = utc_now()
                    cancel_event = ScanEvent(
                        scan_id=scan.id,
                        event_type="DONE",
                        message=f"Mission stopped by investigator. Probed {scan.completed} platforms, found {scan.matches_count} matches.",
                        payload={"completed": scan.completed, "cancelled": True}
                    )
                    session.add(cancel_event)
                    await session.commit()

            cancel_payload = {
                "type": "SCAN_CANCELLED",
                "scan_id": scan_id,
                "case_id": case_id,
                "status": "CANCELLED"
            }
            await manager.broadcast_scan(scan_id, cancel_payload)
            await manager.broadcast_case(case_id, cancel_payload)

        except Exception as e:
            async with async_session_maker() as session:
                res = await session.execute(select(Scan).where(Scan.id == scan_id))
                scan = res.scalar_one_or_none()
                if scan:
                    scan.status = "FAILED"
                    scan.error = str(e)
                    scan.completed_at = utc_now()
                    err_event = ScanEvent(
                        scan_id=scan.id,
                        event_type="ERROR",
                        message=f"Scan encountered error: {str(e)}",
                        payload={"error": str(e)}
                    )
                    session.add(err_event)
                    await session.commit()

            err_payload = {"type": "SCAN_FAILED", "scan_id": scan_id, "error": str(e)}
            await manager.broadcast_scan(scan_id, err_payload)
            await manager.broadcast_case(case_id, err_payload)

        finally:
            self.active_tasks.pop(scan_id, None)

orchestrator = ScanOrchestrator()
