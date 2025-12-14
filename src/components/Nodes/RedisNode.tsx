import type { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { RedisNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const evictionLabels: Record<string, string> = {
  noeviction: 'No Eviction',
  'allkeys-lru': 'All Keys LRU',
  'volatile-lru': 'Volatile LRU',
  'allkeys-random': 'All Keys Random',
};

export function RedisNode({ data, selected }: NodeProps) {
  const nodeData = data as RedisNodeData;

  return (
    <BaseNode
      icon={<Zap size={18} />}
      label={nodeData.label}
      subtitle="Redis Cache"
      color="#dc382d"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Memory:</span>
          <span>{nodeData.maxMemory || '256MB'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Eviction:</span>
          <span className="truncate">{evictionLabels[nodeData.evictionPolicy] || 'LRU'}</span>
        </div>
      </div>
    </BaseNode>
  );
}
