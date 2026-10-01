import { useState, useEffect, useRef, useCallback } from 'react';
import { GraphNode, GraphEdge } from '../types';

export interface TelemetryLog {
  id: string;
  time: string;
  type: 'MATCH' | 'LOG' | 'ERROR' | 'INFO';
  platform?: string;
  message: string;
  url?: string;
  statusCode?: number;
}

interface UseScanWebSocketProps {
  caseId: string;
  onNodeDiscovered?: (node: GraphNode) => void;
  onEdgeDiscovered?: (edge: GraphEdge) => void;
  onScanStatusChanged?: () => void;
}

export function useScanWebSocket({
  caseId,
  onNodeDiscovered,
  onEdgeDiscovered,
  onScanStatusChanged,
}: UseScanWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [scanProgress, setScanProgress] = useState<{
    scanId?: string;
    completed: number;
    total: number;
    matches: number;
    isScanning: boolean;
  }>({
    completed: 0,
    total: 0,
    matches: 0,
    isScanning: false,
  });

  const wsRef = useRef<WebSocket | null>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!caseId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/cases/${caseId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const timestamp = new Date().toLocaleTimeString();

        if (data.type === 'SCAN_STARTED') {
          setScanProgress({
            scanId: data.scan_id,
            completed: 0,
            total: data.total || 0,
            matches: 0,
            isScanning: true,
          });
          setLogs((prev) => [
            {
              id: Math.random().toString(),
              time: timestamp,
              type: 'INFO',
              message: `🚀 Initiated ${data.module.toUpperCase()} scan with ${data.total} platforms`,
            },
            ...prev.slice(0, 199),
          ]);
          onScanStatusChanged?.();
        } else if (data.type === 'PROBE_RESULT') {
          const probe = data.probe || {};
          setScanProgress((prev) => ({
            ...prev,
            completed: data.completed,
            total: data.total,
            matches: data.matches_count,
            isScanning: true,
          }));

          const logItem: TelemetryLog = {
            id: Math.random().toString(),
            time: timestamp,
            type: probe.is_match ? 'MATCH' : probe.error ? 'ERROR' : 'LOG',
            platform: probe.platform,
            message: probe.is_match
              ? `🎯 MATCH CONFIRMED: ${probe.platform} (${probe.url})`
              : probe.error
              ? `⚠️ ${probe.platform}: ${probe.error}`
              : `✓ Clean: ${probe.platform}`,
            url: probe.url,
            statusCode: probe.status_code,
          };
          setLogs((prev) => [logItem, ...prev.slice(0, 199)]);

          if (data.new_node && onNodeDiscovered) {
            onNodeDiscovered(data.new_node);
          }
          if (data.new_edge && onEdgeDiscovered) {
            onEdgeDiscovered(data.new_edge);
          }
        } else if (data.type === 'SCAN_COMPLETED') {
          setScanProgress((prev) => ({
            ...prev,
            isScanning: false,
            completed: data.total,
          }));
          setLogs((prev) => [
            {
              id: Math.random().toString(),
              time: timestamp,
              type: 'INFO',
              message: `🏁 Scan completed. Found ${data.matches_count} matching profiles across ${data.total} platforms.`,
            },
            ...prev.slice(0, 199),
          ]);
          onScanStatusChanged?.();
        } else if (data.type === 'SCAN_FAILED') {
          setScanProgress((prev) => ({
            ...prev,
            isScanning: false,
          }));
          setLogs((prev) => [
            {
              id: Math.random().toString(),
              time: timestamp,
              type: 'ERROR',
              message: `❌ Scan failed: ${data.error}`,
            },
            ...prev.slice(0, 199),
          ]);
          onScanStatusChanged?.();
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [caseId, onNodeDiscovered, onEdgeDiscovered, onScanStatusChanged]);

  return {
    isConnected,
    logs,
    scanProgress,
    clearLogs,
  };
}
