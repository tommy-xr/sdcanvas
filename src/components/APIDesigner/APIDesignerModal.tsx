import { useState, useCallback, useMemo } from 'react';
import { X, Server, FileJson, Database } from 'lucide-react';
import type { APIServerNodeData, APIEndpoint } from '../../types/nodes';
import type { SystemNode } from '../../types/nodes';
import { EndpointList } from './EndpointList';
import { EndpointEditor } from './EndpointEditor';
import { SchemaEditor } from './SchemaEditor';
import { QueryLinker } from './QueryLinker';

type TabType = 'endpoints' | 'schemas' | 'queries';

interface APIDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: APIServerNodeData;
  onUpdate: (data: Partial<APIServerNodeData>) => void;
  allNodes: SystemNode[];
}

export function APIDesignerModal({
  isOpen,
  onClose,
  data,
  onUpdate,
  allNodes,
}: APIDesignerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('endpoints');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    data.endpoints?.[0]?.id || null
  );

  const endpoints = useMemo(() => data.endpoints || [], [data.endpoints]);
  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId) || null;

  // Get all database nodes for linking
  const databaseNodes = allNodes.filter(
    (n) => n.type === 'postgresql'
  ) as SystemNode[];

  const handleAddEndpoint = useCallback(() => {
    const newEndpoint: APIEndpoint = {
      id: `endpoint-${Date.now()}`,
      method: 'GET',
      path: '/api/new',
      description: '',
      linkedQueries: [],
    };
    const newEndpoints = [...endpoints, newEndpoint];
    onUpdate({ endpoints: newEndpoints });
    setSelectedEndpointId(newEndpoint.id);
  }, [endpoints, onUpdate]);

  const handleUpdateEndpoint = useCallback(
    (endpointId: string, updates: Partial<APIEndpoint>) => {
      const newEndpoints = endpoints.map((e) =>
        e.id === endpointId ? { ...e, ...updates } : e
      );
      onUpdate({ endpoints: newEndpoints });
    },
    [endpoints, onUpdate]
  );

  const handleDeleteEndpoint = useCallback(
    (endpointId: string) => {
      const newEndpoints = endpoints.filter((e) => e.id !== endpointId);
      onUpdate({ endpoints: newEndpoints });
      if (selectedEndpointId === endpointId) {
        setSelectedEndpointId(newEndpoints[0]?.id || null);
      }
    },
    [endpoints, onUpdate, selectedEndpointId]
  );

  if (!isOpen) return null;

  const tabs = [
    { id: 'endpoints' as const, label: 'Endpoints', icon: Server },
    { id: 'schemas' as const, label: 'Schemas', icon: FileJson },
    { id: 'queries' as const, label: 'DB Queries', icon: Database },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Server className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              API Designer - {data.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/20'
                }
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'endpoints' && (
            <div className="flex h-full">
              <EndpointList
                endpoints={endpoints}
                selectedEndpointId={selectedEndpointId}
                onSelectEndpoint={setSelectedEndpointId}
                onAddEndpoint={handleAddEndpoint}
                onDeleteEndpoint={handleDeleteEndpoint}
              />
              {selectedEndpoint ? (
                <EndpointEditor
                  endpoint={selectedEndpoint}
                  onUpdate={(updates) =>
                    handleUpdateEndpoint(selectedEndpoint.id, updates)
                  }
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Server size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Select an endpoint or create a new one</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schemas' && (
            <SchemaEditor
              endpoints={endpoints}
              selectedEndpointId={selectedEndpointId}
              onSelectEndpoint={setSelectedEndpointId}
              onUpdateEndpoint={handleUpdateEndpoint}
            />
          )}

          {activeTab === 'queries' && (
            <QueryLinker
              endpoints={endpoints}
              selectedEndpointId={selectedEndpointId}
              onSelectEndpoint={setSelectedEndpointId}
              onUpdateEndpoint={handleUpdateEndpoint}
              databaseNodes={databaseNodes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
