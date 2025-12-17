import type { NodeProps } from '@xyflow/react';
import { Network } from 'lucide-react';
import type { LoadBalancerNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const algorithmLabels = {
  'round-robin': 'Round Robin',
  'least-connections': 'Least Connections',
  'ip-hash': 'IP Hash',
  weighted: 'Weighted',
};

export function LoadBalancerNode({ data, selected }: NodeProps) {
  const nodeData = data as LoadBalancerNodeData;

  return (
    <BaseNode
      icon={<Network size={18} />}
      label={nodeData.label}
      subtitle="Load Balancer (nginx, ALB)"
      color="#f59e0b"
      selected={selected}
      scaling={nodeData.scaling}
    >
      <div className="flex items-center gap-1">
        <span className="text-slate-500">Algorithm:</span>
        <span>{algorithmLabels[nodeData.algorithm]}</span>
      </div>
    </BaseNode>
  );
}
