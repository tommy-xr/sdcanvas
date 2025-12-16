import { Plus, Key, Trash2 } from 'lucide-react';
import type { RedisKey } from '../../types/nodes';

interface KeyListProps {
  keys: RedisKey[];
  selectedKeyId: string | null;
  onSelectKey: (keyId: string) => void;
  onAddKey: () => void;
  onDeleteKey: (keyId: string) => void;
}

const VALUE_TYPE_LABELS: Record<RedisKey['valueType'], string> = {
  string: 'STR',
  counter: 'INT',
  json: 'JSON',
  list: 'LIST',
  set: 'SET',
  hash: 'HASH',
  sortedSet: 'ZSET',
};

export function KeyList({
  keys,
  selectedKeyId,
  onSelectKey,
  onAddKey,
  onDeleteKey,
}: KeyListProps) {
  return (
    <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onAddKey}
          className="flex items-center justify-center gap-2 w-full bg-red-500 hover:bg-red-400
                     text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Key
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {keys.length === 0 ? (
          <div className="text-center text-gray-400 py-8 px-4">
            <Key size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No keys defined</p>
            <p className="text-xs mt-1">Click "Add Key" to create one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {keys.map((key) => (
              <div
                key={key.id}
                className={`
                  group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                  transition-colors
                  ${
                    selectedKeyId === key.id
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
                onClick={() => onSelectKey(key.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Key size={14} className="flex-shrink-0" />
                  <span className="truncate text-sm font-mono">{key.pattern}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                    {VALUE_TYPE_LABELS[key.valueType]}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteKey(key.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400
                               hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
