import type { NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import type { CDNNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

export function CDNNode({ data, selected }: NodeProps) {
  const nodeData = data as CDNNodeData;
  const ruleCount = nodeData.cacheRules?.length || 0;
  const displayedRules = nodeData.cacheRules?.slice(0, 4) || [];
  const remainingCount = ruleCount - 4;

  return (
    <BaseNode
      icon={<Globe size={18} />}
      label={nodeData.label}
      subtitle="CDN / Edge Cache"
      color="#8b5cf6"
      selected={selected}
    >
      <div className="space-y-1">
        {ruleCount > 0 ? (
          <>
            {displayedRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-1 font-mono">
                <span className="text-slate-400 truncate text-[11px]">{rule.pattern}</span>
                {rule.ttl && (
                  <span className="text-[9px] text-slate-500">
                    {formatTTL(rule.ttl)}
                  </span>
                )}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-slate-500 text-[10px]">
                +{remainingCount} more rule{remainingCount > 1 ? 's' : ''}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 italic text-[11px]">No cache rules defined</div>
        )}
      </div>
    </BaseNode>
  );
}

function formatTTL(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days}d`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
