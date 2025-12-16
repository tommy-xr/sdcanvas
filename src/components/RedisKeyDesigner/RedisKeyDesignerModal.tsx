import { useState, useCallback } from 'react';
import { X, Key } from 'lucide-react';
import type { RedisNodeData, RedisKey } from '../../types/nodes';
import { KeyList } from './KeyList';
import { KeyEditor } from './KeyEditor';

interface RedisKeyDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RedisNodeData;
  onUpdate: (data: Partial<RedisNodeData>) => void;
}

export function RedisKeyDesignerModal({
  isOpen,
  onClose,
  data,
  onUpdate,
}: RedisKeyDesignerModalProps) {
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    data.keys?.[0]?.id || null
  );

  const keys = data.keys || [];
  const selectedKey = keys.find((k) => k.id === selectedKeyId) || null;

  const handleAddKey = useCallback(() => {
    const newKey: RedisKey = {
      id: `key-${Date.now()}`,
      pattern: 'new:key',
      valueType: 'string',
    };
    const newKeys = [...keys, newKey];
    onUpdate({ keys: newKeys });
    setSelectedKeyId(newKey.id);
  }, [keys, onUpdate]);

  const handleUpdateKey = useCallback(
    (keyId: string, updates: Partial<RedisKey>) => {
      const newKeys = keys.map((k) =>
        k.id === keyId ? { ...k, ...updates } : k
      );
      onUpdate({ keys: newKeys });
    },
    [keys, onUpdate]
  );

  const handleDeleteKey = useCallback(
    (keyId: string) => {
      const newKeys = keys.filter((k) => k.id !== keyId);
      onUpdate({ keys: newKeys });
      if (selectedKeyId === keyId) {
        setSelectedKeyId(newKeys[0]?.id || null);
      }
    },
    [keys, onUpdate, selectedKeyId]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-5xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <Key className="text-white" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Key Designer - {data.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <KeyList
            keys={keys}
            selectedKeyId={selectedKeyId}
            onSelectKey={setSelectedKeyId}
            onAddKey={handleAddKey}
            onDeleteKey={handleDeleteKey}
          />
          {selectedKey ? (
            <KeyEditor
              redisKey={selectedKey}
              onUpdate={(updates) => handleUpdateKey(selectedKey.id, updates)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Key size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select a key or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
