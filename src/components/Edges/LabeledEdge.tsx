import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { ConnectionData } from '../../types/edges';

const connectionStyles: Record<string, { stroke: string; strokeDasharray?: string }> = {
  http: { stroke: '#3b82f6' },
  websocket: { stroke: '#8b5cf6', strokeDasharray: '5 5' },
  database: { stroke: '#336791', strokeDasharray: '3 3' },
  cache: { stroke: '#dc382d', strokeDasharray: '8 4' },
};

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as ConnectionData | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style = connectionStyles[edgeData?.connectionType || 'http'];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: style.stroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: style.strokeDasharray,
        }}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`
              px-2 py-0.5 rounded text-xs font-medium
              bg-slate-700 border border-slate-600
              ${selected ? 'ring-1 ring-blue-400' : ''}
            `}
          >
            {edgeData.method && (
              <span className="text-blue-400 mr-1">{edgeData.method}</span>
            )}
            <span className="text-slate-200">{edgeData.label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
