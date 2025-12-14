import type { NodeProps } from '@xyflow/react';
import { HardDrive } from 'lucide-react';
import type { S3BucketNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

export function S3BucketNode({ data, selected }: NodeProps) {
  const nodeData = data as S3BucketNodeData;

  return (
    <BaseNode
      icon={<HardDrive size={18} />}
      label={nodeData.label}
      subtitle="S3 Bucket"
      color="#ff9900"
      selected={selected}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Bucket:</span>
          <span className="font-mono truncate">{nodeData.bucketName || 'unnamed'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Access:</span>
          <span className={nodeData.isPublic ? 'text-yellow-400' : 'text-green-400'}>
            {nodeData.isPublic ? 'Public' : 'Private'}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
