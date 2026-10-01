import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Crosshair, User } from 'lucide-react';

export const TargetNode = memo(({ data }: { data: any }) => {
  return (
    <div className="relative px-6 py-4 bg-[#071318]/95 backdrop-blur-xl border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.3)] min-w-[220px] text-center group transition-all duration-300 hover:scale-105">
      {/* Top Green Category Pill */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 text-[10px] font-black tracking-widest uppercase rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)] select-none">
        {data.targetType || 'USERNAME'}
      </div>

      <div className="flex items-center justify-center gap-3 mt-1">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
          <User className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="text-left min-w-0">
          <div className="text-base font-black text-slate-100 font-mono tracking-tight truncate max-w-[170px]">
            {data.label}
          </div>
          <div className="text-xs text-emerald-400/90 font-mono truncate max-w-[170px]">
            {data.notes || 'Tracked Target Profile'}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 rounded-full"
      />
    </div>
  );
});
