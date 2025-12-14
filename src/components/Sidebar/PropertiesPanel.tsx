import { useCanvasStore } from '../../store/canvasStore';
import { Trash2, X } from 'lucide-react';
import type {
  UserNodeData,
  LoadBalancerNodeData,
  APIServerNodeData,
  PostgreSQLNodeData,
  S3BucketNodeData,
  RedisNodeData,
} from '../../types/nodes';

function UserProperties({ data, onChange }: { data: UserNodeData; onChange: (data: Partial<UserNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Client Type</label>
        <select
          value={data.clientType}
          onChange={(e) => onChange({ clientType: e.target.value as UserNodeData['clientType'] })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="browser">Browser</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
      </div>
    </div>
  );
}

function LoadBalancerProperties({ data, onChange }: { data: LoadBalancerNodeData; onChange: (data: Partial<LoadBalancerNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Algorithm</label>
        <select
          value={data.algorithm}
          onChange={(e) => onChange({ algorithm: e.target.value as LoadBalancerNodeData['algorithm'] })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="round-robin">Round Robin</option>
          <option value="least-connections">Least Connections</option>
          <option value="ip-hash">IP Hash</option>
          <option value="weighted">Weighted</option>
        </select>
      </div>
    </div>
  );
}

function APIServerProperties({ data, onChange }: { data: APIServerNodeData; onChange: (data: Partial<APIServerNodeData>) => void }) {
  const addEndpoint = () => {
    const newEndpoint = {
      id: `endpoint-${Date.now()}`,
      method: 'GET' as const,
      path: '/api/new',
    };
    onChange({ endpoints: [...(data.endpoints || []), newEndpoint] });
  };

  const removeEndpoint = (id: string) => {
    onChange({ endpoints: data.endpoints?.filter((e) => e.id !== id) || [] });
  };

  const updateEndpoint = (id: string, updates: Partial<typeof data.endpoints[0]>) => {
    onChange({
      endpoints: data.endpoints?.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ) || [],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Endpoints</label>
          <button
            onClick={addEndpoint}
            className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.endpoints?.map((endpoint) => (
            <div key={endpoint.id} className="flex items-center gap-1 bg-slate-700 p-2 rounded">
              <select
                value={endpoint.method}
                onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as typeof endpoint.method })}
                className="bg-slate-600 border-none rounded px-1 py-1 text-xs text-white w-16"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
              <input
                type="text"
                value={endpoint.path}
                onChange={(e) => updateEndpoint(endpoint.id, { path: e.target.value })}
                className="flex-1 bg-slate-600 border-none rounded px-2 py-1 text-xs text-white"
              />
              <button
                onClick={() => removeEndpoint(endpoint.id)}
                className="text-slate-400 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostgreSQLProperties({ data, onChange }: { data: PostgreSQLNodeData; onChange: (data: Partial<PostgreSQLNodeData>) => void }) {
  const addTable = () => {
    const newTable = {
      id: `table-${Date.now()}`,
      name: 'new_table',
      columns: [
        { id: `col-${Date.now()}`, name: 'id', type: 'serial', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
      ],
      indexes: [],
    };
    onChange({ tables: [...(data.tables || []), newTable] });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Tables</label>
          <button
            onClick={addTable}
            className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
          >
            + Add Table
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.tables?.map((table) => (
            <div key={table.id} className="bg-slate-700 p-2 rounded text-xs">
              <div className="font-medium text-slate-200">{table.name}</div>
              <div className="text-slate-400">
                {table.columns.length} columns, {table.indexes.length} indexes
              </div>
            </div>
          ))}
          {(!data.tables || data.tables.length === 0) && (
            <div className="text-xs text-slate-500 italic">No tables defined</div>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Double-click node to open schema designer (coming soon)
      </p>
    </div>
  );
}

function S3BucketProperties({ data, onChange }: { data: S3BucketNodeData; onChange: (data: Partial<S3BucketNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Bucket Name</label>
        <input
          type="text"
          value={data.bucketName || ''}
          onChange={(e) => onChange({ bucketName: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
          placeholder="my-bucket"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={data.isPublic || false}
          onChange={(e) => onChange({ isPublic: e.target.checked })}
          className="rounded bg-slate-700 border-slate-600"
        />
        <label htmlFor="isPublic" className="text-sm text-slate-300">
          Public Access
        </label>
      </div>
    </div>
  );
}

function RedisProperties({ data, onChange }: { data: RedisNodeData; onChange: (data: Partial<RedisNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Max Memory</label>
        <input
          type="text"
          value={data.maxMemory || ''}
          onChange={(e) => onChange({ maxMemory: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
          placeholder="256MB"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Eviction Policy</label>
        <select
          value={data.evictionPolicy}
          onChange={(e) => onChange({ evictionPolicy: e.target.value as RedisNodeData['evictionPolicy'] })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="noeviction">No Eviction</option>
          <option value="allkeys-lru">All Keys LRU</option>
          <option value="volatile-lru">Volatile LRU</option>
          <option value="allkeys-random">All Keys Random</option>
        </select>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { nodes, selectedNodeId, updateNode, deleteNode, setSelectedNodeId } = useCanvasStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-slate-800 border-l border-slate-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Properties</h2>
        <p className="text-sm text-slate-400">
          Select a component to view and edit its properties.
        </p>
      </div>
    );
  }

  const handleChange = (data: Record<string, unknown>) => {
    updateNode(selectedNode.id, data);
  };

  const handleLabelChange = (label: string) => {
    updateNode(selectedNode.id, { label });
  };

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  const renderTypeSpecificProps = () => {
    switch (selectedNode.type) {
      case 'user':
        return <UserProperties data={selectedNode.data as UserNodeData} onChange={handleChange} />;
      case 'loadBalancer':
        return <LoadBalancerProperties data={selectedNode.data as LoadBalancerNodeData} onChange={handleChange} />;
      case 'apiServer':
        return <APIServerProperties data={selectedNode.data as APIServerNodeData} onChange={handleChange} />;
      case 'postgresql':
        return <PostgreSQLProperties data={selectedNode.data as PostgreSQLNodeData} onChange={handleChange} />;
      case 's3Bucket':
        return <S3BucketProperties data={selectedNode.data as S3BucketNodeData} onChange={handleChange} />;
      case 'redis':
        return <RedisProperties data={selectedNode.data as RedisNodeData} onChange={handleChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">Properties</h2>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto pr-1">
        <div>
          <label className="block text-xs text-slate-400 mb-2">Label</label>
          <input
            type="text"
            value={(selectedNode.data as { label: string }).label || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">Type</label>
          <div className="text-sm text-slate-300 capitalize">
            {selectedNode.type?.replace(/([A-Z])/g, ' $1').trim()}
          </div>
        </div>

        <hr className="border-slate-700" />

        {renderTypeSpecificProps()}
      </div>

      <button
        onClick={handleDelete}
        className="mt-5 flex items-center justify-center gap-2 w-full bg-red-600/20 hover:bg-red-600/30
                   text-red-400 border border-red-600/50 rounded-lg py-2.5 text-sm transition-colors"
      >
        <Trash2 size={16} />
        Delete Component
      </button>
    </div>
  );
}
