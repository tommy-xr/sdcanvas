import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';

interface BaseNodeProps {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  color: string;
  selected?: boolean;
  children?: ReactNode;
}

export function BaseNode({
  icon,
  label,
  subtitle,
  color,
  selected,
  children,
}: BaseNodeProps) {
  return (
    <div
      className={`
        min-w-[140px] rounded-lg border-2 bg-slate-800 shadow-lg
        transition-all duration-200
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      style={{ borderColor: color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600"
      />

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-md"
        style={{ backgroundColor: `${color}20` }}
      >
        <div style={{ color }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{label}</div>
          {subtitle && (
            <div className="text-xs text-slate-400 truncate">{subtitle}</div>
          )}
        </div>
      </div>

      {children && (
        <div className="px-3 py-2 text-xs text-slate-300 border-t border-slate-700">
          {children}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600"
      />
    </div>
  );
}
