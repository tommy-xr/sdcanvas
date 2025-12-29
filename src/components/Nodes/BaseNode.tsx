import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import type { ScalingConfig } from '../../types/nodes';

interface BaseNodeProps {
  id?: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  color: string;
  selected?: boolean;
  children?: ReactNode;
  scaling?: ScalingConfig;
}

export function BaseNode({
  id,
  icon,
  label,
  subtitle,
  color,
  selected,
  children,
  scaling,
}: BaseNodeProps) {
  const showStack = scaling && scaling.type !== 'single';
  const isAuto = scaling?.type === 'auto';
  const stackCount = scaling?.type === 'fixed' ? Math.min(scaling.instances, 3) : 2;

  return (
    <div className="relative">
      {/* Stacked card shadows */}
      {showStack && (
        <>
          {stackCount >= 2 && (
            <div
              className={`absolute inset-0 rounded-lg border-2 bg-white shadow-sm ${isAuto ? 'border-dashed' : ''}`}
              style={{
                borderColor: color,
                transform: 'translate(8px, 8px)',
                zIndex: -2,
              }}
            />
          )}
          {stackCount >= 3 && (
            <div
              className={`absolute inset-0 rounded-lg border-2 bg-white shadow-sm ${isAuto ? 'border-dashed' : ''}`}
              style={{
                borderColor: color,
                transform: 'translate(4px, 4px)',
                zIndex: -1,
              }}
            />
          )}
        </>
      )}

      {/* Main card */}
      <div
        className={`
          relative min-w-[140px] rounded-lg border-2 bg-white shadow-md
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-100' : ''}
        `}
        style={{ borderColor: color }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-300"
          data-testid={id ? `node-${id}-target-handle` : undefined}
        />

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-md"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{label}</div>
            {subtitle && (
              <div className="text-xs text-gray-500 truncate">{subtitle}</div>
            )}
          </div>
          {/* Scaling badge */}
          {showStack && (
            <div
              className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {isAuto ? '∞' : scaling?.type === 'fixed' ? `×${scaling.instances}` : ''}
            </div>
          )}
        </div>

        {children && (
          <div className="px-3 py-2 text-xs text-gray-600 border-t border-gray-200">
            {children}
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-300"
          data-testid={id ? `node-${id}-source-handle` : undefined}
        />
      </div>
    </div>
  );
}
