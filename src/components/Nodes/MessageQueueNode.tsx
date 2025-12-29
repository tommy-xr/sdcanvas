import type { NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import type { MessageQueueNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const providerLabels: Record<string, string> = {
  sqs: 'SQS',
  rabbitmq: 'RabbitMQ',
  kafka: 'Kafka',
  pubsub: 'Pub/Sub',
  generic: 'Queue',
};

export function MessageQueueNode({ id, data, selected }: NodeProps) {
  const nodeData = data as MessageQueueNodeData;
  const topicCount = nodeData.topics?.length || 0;
  const displayedTopics = nodeData.topics?.slice(0, 4) || [];
  const remainingCount = topicCount - 4;

  return (
    <BaseNode
      id={id}
      icon={<MessageSquare size={18} />}
      label={nodeData.label}
      subtitle={`Message Queue (${providerLabels[nodeData.provider || 'generic']})`}
      color="#ec4899"
      selected={selected}
    >
      <div className="space-y-1">
        {nodeData.queueType === 'fifo' && (
          <div className="text-[10px] text-pink-400 font-medium">FIFO</div>
        )}
        {topicCount > 0 ? (
          <>
            {displayedTopics.map((topic) => (
              <div key={topic.id} className="flex items-center gap-1 font-mono">
                <span className="text-slate-400 truncate text-[11px]">{topic.name}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-slate-500 text-[10px]">
                +{remainingCount} more topic{remainingCount > 1 ? 's' : ''}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 italic text-[11px]">No topics defined</div>
        )}
      </div>
    </BaseNode>
  );
}
