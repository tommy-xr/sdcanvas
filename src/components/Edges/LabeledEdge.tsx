import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { ConnectionData } from '../../types/edges';

// Size of the invisible interaction zone at edge endpoints
const HANDLE_SIZE = 16;

const connectionStyles: Record<string, { stroke: string; strokeDasharray?: string }> = {
  http: { stroke: '#3b82f6' },
  websocket: { stroke: '#8b5cf6', strokeDasharray: '5 5' },
  database: { stroke: '#336791', strokeDasharray: '3 3' },
  cache: { stroke: '#dc382d', strokeDasharray: '8 4' },
};

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-blue-600',
  PUT: 'text-yellow-600',
  DELETE: 'text-red-600',
  PATCH: 'text-purple-600',
};

const queryTypeColors: Record<string, string> = {
  SELECT: 'text-green-600',
  INSERT: 'text-blue-600',
  UPDATE: 'text-yellow-600',
  DELETE: 'text-red-600',
};

export function LabeledEdge({
  id,
  source,
  target,
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
  const testId = `edge-${source}-${target}`;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style = connectionStyles[edgeData?.connectionType || 'http'];

  // Determine what badge/prefix to show
  const renderPrefix = () => {
    if (edgeData?.connectionType === 'http' && edgeData.method) {
      return (
        <span className={`${methodColors[edgeData.method] || 'text-blue-600'} mr-1 font-bold`}>
          {edgeData.method}
        </span>
      );
    }
    if (edgeData?.connectionType === 'database' && edgeData.queryType) {
      return (
        <span className={`${queryTypeColors[edgeData.queryType] || 'text-gray-500'} mr-1 font-bold`}>
          {edgeData.queryType}
        </span>
      );
    }
    if (edgeData?.connectionType === 'websocket' && edgeData.eventName) {
      return (
        <span className="text-purple-600 mr-1">
          {edgeData.eventName}
        </span>
      );
    }
    return null;
  };

  // Determine the label text
  const labelText = () => {
    if (edgeData?.label) return edgeData.label;
    if (edgeData?.connectionType === 'database' && edgeData.tableName) {
      return edgeData.tableName;
    }
    return null;
  };

  const prefix = renderPrefix();
  const label = labelText();

  return (
    <g data-testid={testId} data-edge-id={id}>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: style.stroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: style.strokeDasharray,
        }}
      />
      {/* Invisible interaction zones at endpoints for Playwright testing */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={HANDLE_SIZE / 2}
        fill="transparent"
        data-testid={`${testId}-source-handle`}
        className="edge-handle-source"
        style={{ cursor: 'crosshair' }}
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={HANDLE_SIZE / 2}
        fill="transparent"
        data-testid={`${testId}-target-handle`}
        className="edge-handle-target"
        style={{ cursor: 'crosshair' }}
      />
      {(prefix || label) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`
              px-2 py-0.5 rounded text-xs font-medium
              bg-white border border-gray-300 shadow-sm
              ${selected ? 'ring-1 ring-blue-500' : ''}
            `}
            data-testid={`${testId}-label`}
          >
            {prefix}
            {label && <span className="text-gray-700">{label}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
