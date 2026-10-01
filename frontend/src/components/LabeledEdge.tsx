import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';

export interface LabeledEdgeData {
  label?: string;
  relationType?: string;
  confidence?: number;
  isHighConfidence?: boolean;
}

export const LabeledEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    label,
    selected,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const edgeData = (data || {}) as LabeledEdgeData;
    const relationLabel = (label as string) || edgeData.label || edgeData.relationType || 'CONNECTED_TO';
    const confidence = edgeData.confidence ?? 0.85;
    const isStrong = edgeData.isHighConfidence || confidence >= 0.85 || relationLabel === 'IDENTIFIES_AS' || relationLabel === 'USES_EMAIL' || relationLabel === 'USES_ACCOUNT';

    // Color based on relation type
    const getEdgeColor = (rel: string) => {
      const r = rel.toUpperCase();
      if (r.includes('IDENTIFIES') || r.includes('PERSON')) return '#3b82f6'; // blue
      if (r.includes('EMAIL') || r.includes('MAIL')) return '#f59e0b'; // amber
      if (r.includes('REGISTERED') || r.includes('DOMAIN')) return '#10b981'; // emerald
      if (r.includes('RESOLVES') || r.includes('IP')) return '#ef4444'; // red
      if (r.includes('BREACH') || r.includes('FOUND_IN')) return '#ec4899'; // pink
      if (r.includes('ACCOUNT') || r.includes('SAME_USERNAME')) return '#a855f7'; // purple
      return '#06b6d4'; // cyan default
    };

    const edgeColor = getEdgeColor(relationLabel);

    return (
      <>
        {/* Glowing background shadow path when selected or strong */}
        {selected && (
          <path
            d={edgePath}
            fill="none"
            stroke={edgeColor}
            strokeWidth={5}
            strokeOpacity={0.35}
            className="pointer-events-none"
          />
        )}

        {/* Primary Edge Line */}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: edgeColor,
            strokeWidth: isStrong ? 2.0 : 1.4,
            strokeDasharray: isStrong ? undefined : '5,5',
            opacity: isStrong ? 0.9 : 0.65,
          }}
        />

        {/* Centered Tactical Relationship Label Pill */}
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan select-none group cursor-pointer"
          >
            <div
              className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider uppercase transition-all duration-150 backdrop-blur-md border ${
                selected
                  ? 'bg-slate-950 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-[#080d16]/90 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:scale-105'
              }`}
              style={{
                borderColor: selected ? edgeColor : undefined,
                color: selected ? '#ffffff' : undefined,
              }}
            >
              <div className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: edgeColor }}
                />
                <span>{relationLabel}</span>
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);
