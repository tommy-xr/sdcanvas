import { useCanvasStore } from '../../store/canvasStore';
import { Trash2, X, ExternalLink } from 'lucide-react';
import type {
  UserNodeData,
  LoadBalancerNodeData,
  APIServerNodeData,
  PostgreSQLNodeData,
  S3BucketNodeData,
  RedisNodeData,
  StickyNoteNodeData,
} from '../../types/nodes';

interface PropertiesPanelProps {
  onOpenSchemaDesigner: (nodeId: string) => void;
  onOpenAPIDesigner: (nodeId: string) => void;
}

function UserProperties({ data, onChange }: { data: UserNodeData; onChange: (data: Partial<UserNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Client Type</label>
        <select
          value={data.clientType}
          onChange={(e) => onChange({ clientType: e.target.value as UserNodeData['clientType'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
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
        <label className="block text-xs text-gray-500 mb-1">Algorithm</label>
        <select
          value={data.algorithm}
          onChange={(e) => onChange({ algorithm: e.target.value as LoadBalancerNodeData['algorithm'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
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

function APIServerProperties({
  data,
  onChange,
  onOpenAPIDesigner,
}: {
  data: APIServerNodeData;
  onChange: (data: Partial<APIServerNodeData>) => void;
  onOpenAPIDesigner?: () => void;
}) {
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
          <label className="text-xs text-gray-500">Endpoints</label>
          <button
            onClick={addEndpoint}
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.endpoints?.map((endpoint) => (
            <div key={endpoint.id} className="flex items-center gap-1 bg-gray-100 p-2 rounded">
              <select
                value={endpoint.method}
                onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as typeof endpoint.method })}
                className="bg-gray-200 border-none rounded px-1 py-1 text-xs text-gray-900 w-16"
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
                className="flex-1 bg-gray-200 border-none rounded px-2 py-1 text-xs text-gray-900"
              />
              <button
                onClick={() => removeEndpoint(endpoint.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {onOpenAPIDesigner && (
        <button
          onClick={onOpenAPIDesigner}
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200
                     text-gray-700 border border-gray-300 rounded-lg py-2 text-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open API Designer
        </button>
      )}
      <p className="text-xs text-gray-400">
        Or double-click the node on the canvas
      </p>
    </div>
  );
}

function PostgreSQLProperties({
  data,
  onChange,
  onOpenSchemaDesigner,
}: {
  data: PostgreSQLNodeData;
  onChange: (data: Partial<PostgreSQLNodeData>) => void;
  onOpenSchemaDesigner?: () => void;
}) {
  const addTable = () => {
    const newTable = {
      id: `table-${Date.now()}`,
      name: 'new_table',
      columns: [
        { id: `col-${Date.now()}`, name: 'id', type: 'serial', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
      ],
      indexes: [],
      estimatedRows: 1000,
    };
    onChange({ tables: [...(data.tables || []), newTable] });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Tables</label>
          <button
            onClick={addTable}
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded"
          >
            + Add Table
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.tables?.map((table) => (
            <div key={table.id} className="bg-gray-100 p-2 rounded text-xs">
              <div className="font-medium text-gray-700">{table.name}</div>
              <div className="text-gray-500">
                {table.columns.length} columns, {table.indexes.length} indexes
              </div>
            </div>
          ))}
          {(!data.tables || data.tables.length === 0) && (
            <div className="text-xs text-gray-400 italic">No tables defined</div>
          )}
        </div>
      </div>
      {onOpenSchemaDesigner && (
        <button
          onClick={onOpenSchemaDesigner}
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200
                     text-gray-700 border border-gray-300 rounded-lg py-2 text-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open Schema Designer
        </button>
      )}
      <p className="text-xs text-gray-400">
        Or double-click the node on the canvas
      </p>
    </div>
  );
}

function S3BucketProperties({ data, onChange }: { data: S3BucketNodeData; onChange: (data: Partial<S3BucketNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Bucket Name</label>
        <input
          type="text"
          value={data.bucketName || ''}
          onChange={(e) => onChange({ bucketName: e.target.value })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
          placeholder="my-bucket"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={data.isPublic || false}
          onChange={(e) => onChange({ isPublic: e.target.checked })}
          className="rounded bg-gray-50 border-gray-300"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700">
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
        <label className="block text-xs text-gray-500 mb-1">Max Memory</label>
        <input
          type="text"
          value={data.maxMemory || ''}
          onChange={(e) => onChange({ maxMemory: e.target.value })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
          placeholder="256MB"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Eviction Policy</label>
        <select
          value={data.evictionPolicy}
          onChange={(e) => onChange({ evictionPolicy: e.target.value as RedisNodeData['evictionPolicy'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
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

const noteColors = [
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-300' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-300' },
  { value: 'green', label: 'Green', class: 'bg-green-300' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-300' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-300' },
];

function StickyNoteProperties({ data, onChange }: { data: StickyNoteNodeData; onChange: (data: Partial<StickyNoteNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-2">Content</label>
        <textarea
          value={data.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 resize-none"
          placeholder="Add your notes here..."
          rows={5}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-2">Color</label>
        <div className="flex gap-2">
          {noteColors.map((color) => (
            <button
              key={color.value}
              onClick={() => onChange({ color: color.value as StickyNoteNodeData['color'] })}
              className={`
                w-8 h-8 rounded-lg ${color.class} transition-all
                ${data.color === color.value ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : 'hover:scale-110'}
              `}
              title={color.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel({ onOpenSchemaDesigner, onOpenAPIDesigner }: PropertiesPanelProps) {
  const { nodes, selectedNodeId, updateNode, deleteNode, setSelectedNodeId } = useCanvasStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Properties</h2>
          <p className="text-sm text-gray-500">
            Select a component to view and edit its properties.
          </p>
        </div>
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
        return (
          <APIServerProperties
            data={selectedNode.data as APIServerNodeData}
            onChange={handleChange}
            onOpenAPIDesigner={() => onOpenAPIDesigner(selectedNode.id)}
          />
        );
      case 'postgresql':
        return (
          <PostgreSQLProperties
            data={selectedNode.data as PostgreSQLNodeData}
            onChange={handleChange}
            onOpenSchemaDesigner={() => onOpenSchemaDesigner(selectedNode.id)}
          />
        );
      case 's3Bucket':
        return <S3BucketProperties data={selectedNode.data as S3BucketNodeData} onChange={handleChange} />;
      case 'redis':
        return <RedisProperties data={selectedNode.data as RedisNodeData} onChange={handleChange} />;
      case 'stickyNote':
        return <StickyNoteProperties data={selectedNode.data as StickyNoteNodeData} onChange={handleChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Label</label>
            <input
              type="text"
              value={(selectedNode.data as { label: string }).label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Type</label>
            <div className="text-sm text-gray-700 capitalize">
              {selectedNode.type?.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>

          <hr className="border-gray-200" />

          {renderTypeSpecificProps()}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 w-full bg-red-50 hover:bg-red-100
                     text-red-600 border border-red-200 rounded-lg py-2.5 text-sm transition-colors"
        >
          <Trash2 size={16} />
          Delete Component
        </button>
      </div>
    </div>
  );
}
