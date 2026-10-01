from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.orchestrator import manager

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/scans/{scan_id}")
async def websocket_scan_endpoint(websocket: WebSocket, scan_id: str):
    await manager.connect_scan(websocket, scan_id)
    try:
        while True:
            # Keep connection alive & listen for client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_scan(websocket, scan_id)
    except Exception:
        manager.disconnect_scan(websocket, scan_id)

@router.websocket("/cases/{case_id}")
async def websocket_case_endpoint(websocket: WebSocket, case_id: str):
    await manager.connect_case(websocket, case_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_case(websocket, case_id)
    except Exception:
        manager.disconnect_case(websocket, case_id)
