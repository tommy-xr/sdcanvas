import type { NodeProps } from '@xyflow/react';
import { Monitor, Smartphone, User } from 'lucide-react';
import type { UserNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const clientIcons = {
  browser: Monitor,
  mobile: Smartphone,
  desktop: User,
};

const clientLabels = {
  browser: 'Browser',
  mobile: 'Mobile',
  desktop: 'Desktop',
};

export function UserNode({ data, selected }: NodeProps) {
  const nodeData = data as UserNodeData;
  const Icon = clientIcons[nodeData.clientType] || Monitor;

  return (
    <BaseNode
      icon={<Icon size={18} />}
      label={nodeData.label}
      subtitle={clientLabels[nodeData.clientType]}
      color="#22c55e"
      selected={selected}
    />
  );
}
