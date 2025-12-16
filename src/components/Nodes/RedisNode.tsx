import type { NodeProps } from '@xyflow/react';
import { Zap, Key } from 'lucide-react';
import type { RedisNodeData, RedisKey } from '../../types/nodes';
import { BaseNode } from './BaseNode';

const valueTypeColors: Record<RedisKey['valueType'], string> = {
  string: 'text-green-400',
  counter: 'text-cyan-400',
  json: 'text-blue-400',
  list: 'text-yellow-400',
  set: 'text-purple-400',
  hash: 'text-orange-400',
  sortedSet: 'text-pink-400',
};

const valueTypeLabels: Record<RedisKey['valueType'], string> = {
  string: 'STR',
  counter: 'INT',
  json: 'JSON',
  list: 'LIST',
  set: 'SET',
  hash: 'HASH',
  sortedSet: 'ZSET',
};

export function RedisNode({ data, selected }: NodeProps) {
  const nodeData = data as RedisNodeData;
  const keyCount = nodeData.keys?.length || 0;
  const displayedKeys = nodeData.keys?.slice(0, 5) || [];
  const remainingCount = keyCount - 5;

  return (
    <BaseNode
      icon={<Zap size={18} />}
      label={nodeData.label}
      subtitle="Cache (Redis, Memcached)"
      color="#dc382d"
      selected={selected}
    >
      <div className="space-y-1">
        {keyCount > 0 ? (
          <>
            {displayedKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-1 font-mono">
                <Key size={10} className="text-slate-500 flex-shrink-0" />
                <span className="text-slate-400 truncate text-[11px]">{key.pattern}</span>
                <span className={`text-[9px] font-bold ${valueTypeColors[key.valueType]}`}>
                  {valueTypeLabels[key.valueType]}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-slate-500 text-[10px]">
                +{remainingCount} more key{remainingCount > 1 ? 's' : ''}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 italic text-[11px]">No keys defined</div>
        )}
      </div>
    </BaseNode>
  );
}
