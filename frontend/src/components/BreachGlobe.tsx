import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react';

export interface BreachNode {
  code: string;
  name: string;
  records: string;
  records_num: number;
  flag: string;
  lat: number;
  lon: number;
  color?: string;
  threat_level?: string;
  recent_breach?: string;
}

export type ConnectionType = 'breach' | 'processing' | 'mirror' | 'verified';

export interface GlobeConnection {
  from: string; // country code
  to: string;   // country code
  type: ConnectionType;
  color: string;
  speed: number;
}

interface BreachGlobeProps {
  nodes?: BreachNode[];
  onSelectNode?: (node: BreachNode) => void;
  className?: string;
}

const DEFAULT_NODES: BreachNode[] = [
  {
    code: 'US',
    name: 'United States',
    records: '1.24B',
    records_num: 1242813991,
    flag: '🇺🇸',
    lat: 38.0,
    lon: -97.0,
    color: '#ef4444',
    threat_level: 'CRITICAL (Tier 1)',
    recent_breach: 'Collection #1, LinkedIn, Adobe',
  },
  {
    code: 'RU',
    name: 'Russia',
    records: '632.4M',
    records_num: 632400000,
    flag: '🇷🇺',
    lat: 58.0,
    lon: 85.0,
    color: '#ef4444',
    threat_level: 'CRITICAL (Breach Origin)',
    recent_breach: 'Exploit.in, Mail.ru, Darknet Combolists',
  },
  {
    code: 'CN',
    name: 'China',
    records: '511.8M',
    records_num: 511800000,
    flag: '🇨🇳',
    lat: 35.0,
    lon: 104.0,
    color: '#ef4444',
    threat_level: 'HIGH (Exfiltration Target)',
    recent_breach: 'Weibo Cache, QQ Data Scrape',
  },
  {
    code: 'IN',
    name: 'India',
    records: '432.1M',
    records_num: 432100000,
    flag: '🇮🇳',
    lat: 21.0,
    lon: 78.5,
    color: '#a855f7',
    threat_level: 'HIGH (Analysis Hub)',
    recent_breach: 'Aadhaar Leak Mirrors, Telecom Dump',
  },
  {
    code: 'DE',
    name: 'Germany',
    records: '298.6M',
    records_num: 298600000,
    flag: '🇩🇪',
    lat: 51.1,
    lon: 10.4,
    color: '#06b6d4',
    threat_level: 'MEDIUM (Processing Node)',
    recent_breach: 'Telekom Cache, Auto Industry Scraping',
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    records: '245.1M',
    records_num: 245100000,
    flag: '🇬🇧',
    lat: 54.0,
    lon: -2.5,
    color: '#10b981',
    threat_level: 'ELEVATED (Verified Intel)',
    recent_breach: 'NHS Archive, Revolut Credentials',
  },
  {
    code: 'SG',
    name: 'Singapore',
    records: '98.4M',
    records_num: 98400000,
    flag: '🇸🇬',
    lat: 1.35,
    lon: 103.8,
    color: '#06b6d4',
    threat_level: 'MONITORED (Mirror Node)',
    recent_breach: 'FinTech API Token Exfiltration',
  },
  {
    code: 'BR',
    name: 'Brazil',
    records: '189.4M',
    records_num: 189400000,
    flag: '🇧🇷',
    lat: -14.2,
    lon: -51.9,
    color: '#ef4444',
    threat_level: 'HIGH (PII Leak Hub)',
    recent_breach: 'Serasa Experian 223M PII Dump',
  },
  {
    code: 'AU',
    name: 'Australia',
    records: '112.5M',
    records_num: 112500000,
    flag: '🇦🇺',
    lat: -25.2,
    lon: 133.7,
    color: '#a855f7',
    threat_level: 'MODERATE (Collection Station)',
    recent_breach: 'Medibank, Optus Telemetry Dump',
  },
  {
    code: 'JP',
    name: 'Japan',
    records: '145.2M',
    records_num: 145200000,
    flag: '🇯🇵',
    lat: 36.2,
    lon: 138.2,
    color: '#06b6d4',
    threat_level: 'MONITORED (Processing Node)',
    recent_breach: 'LINE Messaging Session Tokens',
  },
];

const CONNECTIONS: GlobeConnection[] = [
  // 🔴 Breach / Source Activity
  { from: 'RU', to: 'US', type: 'breach', color: '#ef4444', speed: 0.008 },
  { from: 'CN', to: 'DE', type: 'breach', color: '#ef4444', speed: 0.006 },
  { from: 'BR', to: 'US', type: 'breach', color: '#ef4444', speed: 0.007 },
  // 🔵 Processing / Collection Nodes
  { from: 'US', to: 'IN', type: 'processing', color: '#06b6d4', speed: 0.007 },
  { from: 'SG', to: 'AU', type: 'processing', color: '#06b6d4', speed: 0.006 },
  { from: 'DE', to: 'US', type: 'processing', color: '#06b6d4', speed: 0.008 },
  // 🟣 Analysis / Mirror Nodes
  { from: 'DE', to: 'SG', type: 'mirror', color: '#a855f7', speed: 0.009 },
  { from: 'JP', to: 'US', type: 'mirror', color: '#a855f7', speed: 0.008 },
  { from: 'IN', to: 'SG', type: 'mirror', color: '#a855f7', speed: 0.007 },
  // 🟢 Verified Intelligence
  { from: 'US', to: 'UK', type: 'verified', color: '#10b981', speed: 0.008 },
  { from: 'UK', to: 'DE', type: 'verified', color: '#10b981', speed: 0.006 },
  { from: 'AU', to: 'US', type: 'verified', color: '#10b981', speed: 0.007 },
];

export const BreachGlobe: React.FC<BreachGlobeProps> = ({
  nodes = DEFAULT_NODES,
  onSelectNode,
  className = '',
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoveredPolygon, setHoveredPolygon] = useState<any | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Resize observer to fill parent container
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch country boundaries
  useEffect(() => {
    fetch('/globe/countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error('Failed to load country boundaries GeoJSON:', err));
  }, []);

  // Setup globe controls & initial viewpoint
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.6;
        controls.enableZoom = true;
      }
      globeRef.current.pointOfView({ lat: 28, lng: 15, altitude: 2.1 }, 1000);
    }
  }, []);

  // Sync autoRotate
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = autoRotate;
      }
    }
  }, [autoRotate]);

  // Arcs data calculation
  const arcsData = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.code, n]));
    const result: any[] = [];
    for (const c of CONNECTIONS) {
      const from = nodeMap.get(c.from);
      const to = nodeMap.get(c.to);
      if (from && to) {
        result.push({
          ...c,
          startLat: from.lat,
          startLng: from.lon,
          endLat: to.lat,
          endLng: to.lon,
        });
      }
    }
    return result;
  }, [nodes]);

  // Pulsing rings for top hotspots
  const ringsData = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      maxR: n.records_num > 400000000 ? 7 : 5,
      propagationSpeed: 2.2,
      repeatPeriod: 1200,
    }));
  }, [nodes]);

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (!globeRef.current) return;
    const current = globeRef.current.pointOfView();
    const newAlt = Math.max(0.8, Math.min(3.5, current.altitude + delta));
    globeRef.current.pointOfView({ ...current, altitude: newAlt }, 400);
  };

  const handleReset = () => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 28, lng: 15, altitude: 2.1 }, 800);
    setAutoRotate(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[580px] flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0, 0, 0, 0)"
        globeImageUrl="/globe/earth-night.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        showAtmosphere={true}
        atmosphereColor="#06b6d4"
        atmosphereAltitude={0.22}
        // Country Boundaries
        polygonsData={countries.features}
        polygonAltitude={0.008}
        polygonCapColor={(d: any) =>
          d === hoveredPolygon ? 'rgba(6, 182, 212, 0.35)' : 'rgba(4, 9, 20, 0.28)'
        }
        polygonSideColor={() => 'rgba(6, 182, 212, 0.08)'}
        polygonStrokeColor={() => 'rgba(6, 182, 212, 0.55)'}
        onPolygonHover={(polygon: any) => setHoveredPolygon(polygon || null)}
        onPolygonClick={({ properties: d }: any) => {
          const iso = d.ISO_A2 || d.ISO_A3;
          const name = d.ADMIN || d.NAME;
          const found = nodes.find(
            (n) => n.code === iso || n.name.toLowerCase() === name.toLowerCase()
          );
          if (found && onSelectNode) {
            onSelectNode(found);
          } else if (onSelectNode) {
            onSelectNode({
              code: iso || 'LOC',
              name: name || 'Target Territory',
              records: '24.8M',
              records_num: 24800000,
              flag: '🌐',
              lat: 0,
              lon: 0,
              threat_level: 'MONITORED REGION',
              recent_breach: 'Underground Darknet Scrape & Credentials Leak',
            });
          }
        }}
        polygonLabel={({ properties: d }: any) => `
          <div style="background: rgba(9, 15, 29, 0.95); border: 1px solid rgba(6, 182, 212, 0.6); padding: 8px 12px; border-radius: 10px; font-family: monospace; font-size: 11px; color: #f1f5f9; box-shadow: 0 0 20px rgba(6, 182, 212, 0.35); pointer-events: none;">
            <div style="font-weight: 800; color: #38bdf8; font-size: 12px;">${d.ADMIN || d.NAME}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">ISO: ${d.ISO_A2 || d.ISO_A3 || '--'}</div>
            <div style="font-size: 9px; color: #f43f5e; margin-top: 4px; font-weight: 600;">Active OSINT Monitoring Zone</div>
          </div>
        `}
        // Animated Great-Circle Arcs
        arcsData={arcsData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => [d.color, '#ffffff', d.color]}
        arcAltitude={0.24}
        arcStroke={1.5}
        arcDashLength={0.35}
        arcDashGap={1.0}
        arcDashAnimateTime={2000}
        // Breach Nodes (Points)
        pointsData={nodes}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lon}
        pointColor={(d: any) => d.color || '#ef4444'}
        pointAltitude={0.03}
        pointRadius={(d: any) => (d.records_num > 400000000 ? 1.05 : 0.8)}
        onPointClick={(point: any) => {
          if (point && onSelectNode) onSelectNode(point);
        }}
        pointLabel={(d: any) => `
          <div style="background: rgba(9, 15, 29, 0.95); border: 1px solid rgba(244, 63, 94, 0.7); padding: 8px 12px; border-radius: 10px; font-family: monospace; font-size: 11px; color: #f1f5f9; box-shadow: 0 0 25px rgba(244, 63, 94, 0.45); pointer-events: none;">
            <div style="font-weight: 800; color: #ffffff; font-size: 13px;">${d.flag || ''} ${d.name} (${d.code})</div>
            <div style="color: #f43f5e; font-weight: 800; font-size: 12px; margin-top: 2px;">${Number(d.records_num || 0).toLocaleString()} Records</div>
            <div style="color: #38bdf8; font-size: 10px; margin-top: 2px;">Status: ${d.threat_level || 'CRITICAL HUB'}</div>
            <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Feed: ${d.recent_breach || 'Massive Combolist Leak'}</div>
            <div style="color: #64748b; font-size: 8px; margin-top: 4px; text-transform: uppercase;">Click node to open dossier</div>
          </div>
        `}
        // Pulsing Rings for Threat Hotspots
        ringsData={ringsData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lon}
        ringColor={(d: any) => () => d.color || '#ef4444'}
        ringMaxRadius={(d: any) => d.maxR}
        ringPropagationSpeed={(d: any) => d.propagationSpeed}
        ringRepeatPeriod={(d: any) => d.repeatPeriod}
        // Labels
        labelsData={nodes}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lon}
        labelText={(d: any) => d.name}
        labelSize={(d: any) => (d.records_num > 400000000 ? 1.3 : 1.0)}
        labelDotRadius={0.5}
        labelColor={() => '#f8fafc'}
        labelResolution={2}
        onLabelClick={(label: any) => {
          if (label && onSelectNode) onSelectNode(label);
        }}
      />

      {/* Floating On-Screen Controls Toolbar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-[#090f1d]/85 border border-slate-800/80 backdrop-blur-md shadow-xl text-slate-300">
        <button
          onClick={() => handleZoom(-0.35)}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-800/70 hover:text-cyan-300 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(0.35)}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-800/70 hover:text-cyan-300 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleReset}
          title="Reset Orbit & Zoom"
          className="p-1.5 rounded-lg hover:bg-slate-800/70 hover:text-cyan-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          title={autoRotate ? 'Pause Rotation' : 'Resume Auto-Rotation'}
          className={`p-1.5 rounded-lg transition-colors ${
            autoRotate
              ? 'text-cyan-400 hover:bg-cyan-950/40'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Orbit instruction hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-slate-950/70 border border-slate-800/80 text-[10px] font-mono text-slate-400 backdrop-blur-sm shadow-md flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>WebGL 3D Earth • Drag to orbit • Scroll to zoom • Click any country or node</span>
      </div>
    </div>
  );
};
