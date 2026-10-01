import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Sparkles,
  MousePointer,
  Hand,
  Maximize2,
  Minus,
  Plus,
  Layers,
  Search,
  RotateCcw,
  Network,
} from 'lucide-react';

import { EntityNode } from './EntityNode';
import { TargetNode } from './TargetNode';
import { ArtifactNode } from './ArtifactNode';
import { LabeledEdge } from './LabeledEdge';

interface InvestigationGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  onOrganizeLayout?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
}

const VerticalGraphControls: React.FC<{ onOrganize?: () => void }> = ({ onOrganize }) => {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();

  return (
    <div className="absolute top-16 left-4 z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-[#090f1d]/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl text-slate-300 font-mono select-none">
      <button
        onClick={() => {}}
        className="p-2 rounded-xl hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors"
        title="Pan / Move Tool"
      >
        <Hand className="w-4 h-4" />
      </button>

      <button
        onClick={() => zoomIn()}
        className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>

      <button
        onClick={() => zoomOut()}
        className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>

      <button
        onClick={() => fitView({ padding: 0.25, duration: 400 })}
        className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
        title="Fit View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-4 h-[1px] bg-slate-800 my-0.5" />

      {onOrganize && (
        <button
          onClick={onOrganize}
          className="p-2 rounded-xl hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors"
          title="Auto-Organize Layout"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 400 })}
        className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Reset View"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

const InnerInvestigationGraph: React.FC<InvestigationGraphProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onOrganizeLayout,
  searchQuery = '',
  onSearchChange,
  selectedCategory = 'all',
  onSelectCategory,
}) => {
  const nodeTypes = useMemo(
    () => ({
      entityNode: EntityNode,
      targetNode: TargetNode,
      artifactNode: ArtifactNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      labeledEdge: LabeledEdge,
    }),
    []
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#060911]">
      {/* Floating Search inside Graph (Matching media_1790758048229.jpg) */}
      <div className="absolute top-4 left-4 z-20 w-64 max-w-[calc(100%-2rem)]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search this graph..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d]/90 border border-slate-800/90 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 backdrop-blur-md shadow-xl transition-all"
          />
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2.2}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'labeledEdge',
          animated: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.4}
          color="rgba(30, 41, 59, 0.7)"
        />

        {/* Tactical Cyber Mini-Map (Bottom Right) */}
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(node: any) => {
            const cat = (node.data?.category || node.data?.targetType || '').toUpperCase();
            if (cat.includes('PERSON')) return '#3b82f6';
            if (cat.includes('DOMAIN')) return '#10b981';
            if (cat.includes('EMAIL')) return '#f59e0b';
            if (cat.includes('IP')) return '#ef4444';
            if (cat.includes('SOCIAL')) return '#8b5cf6';
            if (cat.includes('BREACH')) return '#ec4899';
            return '#06b6d4';
          }}
          className="!bg-[#090f1d]/95 !border !border-slate-800/90 !rounded-2xl !overflow-hidden !bottom-5 !right-5 !shadow-2xl"
          maskColor="rgba(6, 9, 17, 0.85)"
        />
      </ReactFlow>

      {/* Vertical Controls Toolbar */}
      <VerticalGraphControls onOrganize={onOrganizeLayout} />

      {/* Empty State HUD Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
          <div className="p-8 rounded-3xl bg-[#090f1d]/90 border border-slate-800/80 backdrop-blur-xl text-center max-w-md shadow-2xl pointer-events-auto space-y-3 font-mono">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Graph Entities Mapped</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              No artifacts or target relationships have been populated for this case yet. Add a target using the toolbar above or deploy an agent recon mission (Clover) to build your tactical graph.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const InvestigationGraph: React.FC<InvestigationGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <InnerInvestigationGraph {...props} />
    </ReactFlowProvider>
  );
};
