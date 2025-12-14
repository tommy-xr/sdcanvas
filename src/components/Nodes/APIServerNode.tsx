import type { NodeProps } from '@xyflow/react';
import { Server } from 'lucide-react';
import type { APIServerNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const methodColors: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

export function APIServerNode({ data, selected }: NodeProps) {
  const nodeData = data as APIServerNodeData;
  const displayedEndpoints = nodeData.endpoints?.slice(0, 3) || [];
  const remainingCount = (nodeData.endpoints?.length || 0) - 3;

  return (
    <BaseNode
      icon={<Server size={18} />}
      label={nodeData.label}
      subtitle="API Server"
      color="#3b82f6"
      selected={selected}
    >
      {displayedEndpoints.length > 0 ? (
        <div className="space-y-1">
          {displayedEndpoints.map((endpoint) => (
            <div key={endpoint.id} className="flex items-center gap-1 font-mono">
              <span className={`text-[10px] font-bold ${methodColors[endpoint.method]}`}>
                {endpoint.method}
              </span>
              <span className="text-slate-400 truncate">{endpoint.path}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-slate-500 text-[10px]">
              +{remainingCount} more endpoint{remainingCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-500 italic">No endpoints defined</div>
      )}
    </BaseNode>
  );
}
