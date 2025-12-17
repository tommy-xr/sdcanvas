import { useCanvasStore } from '../../store/canvasStore';
import { Trash2, X, ExternalLink } from 'lucide-react';
import type {
  UserNodeData,
  LoadBalancerNodeData,
  CDNNodeData,
  CDNCacheRule,
  APIServerNodeData,
  PostgreSQLNodeData,
  S3BucketNodeData,
  RedisNodeData,
  MessageQueueNodeData,
  MessageQueueTopic,
  StickyNoteNodeData,
  ScalingConfig,
} from '../../types/nodes';

interface PropertiesPanelProps {
  onOpenSchemaDesigner: (nodeId: string) => void;
  onOpenAPIDesigner: (nodeId: string) => void;
  onOpenRedisKeyDesigner: (nodeId: string) => void;
}

function ScalingProperties({ scaling, onChange }: { scaling?: ScalingConfig; onChange: (scaling: ScalingConfig) => void }) {
  const scalingType = scaling?.type || 'single';
  const instances = scaling?.type === 'fixed' ? scaling.instances : 2;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Scaling</label>
        <select
          value={scalingType}
          onChange={(e) => {
            const type = e.target.value as 'single' | 'fixed' | 'auto';
            if (type === 'single') onChange({ type: 'single' });
            else if (type === 'auto') onChange({ type: 'auto' });
            else onChange({ type: 'fixed', instances: 2 });
          }}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
        >
          <option value="single">Single Instance</option>
          <option value="fixed">Fixed Count</option>
          <option value="auto">Auto-scaling</option>
        </select>
      </div>
      {scalingType === 'fixed' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Instances</label>
          <input
            type="number"
            min={2}
            max={100}
            value={instances}
            onChange={(e) => onChange({ type: 'fixed', instances: Math.max(2, parseInt(e.target.value) || 2) })}
            className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
          />
        </div>
      )}
    </div>
  );
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
      <ScalingProperties
        scaling={data.scaling}
        onChange={(scaling) => onChange({ scaling })}
      />
    </div>
  );
}

function CDNProperties({ data, onChange }: { data: CDNNodeData; onChange: (data: Partial<CDNNodeData>) => void }) {
  const addCacheRule = () => {
    const newRule: CDNCacheRule = {
      id: `rule-${Date.now()}`,
      pattern: '/*',
    };
    onChange({ cacheRules: [...(data.cacheRules || []), newRule] });
  };

  const removeCacheRule = (id: string) => {
    onChange({ cacheRules: data.cacheRules?.filter((r) => r.id !== id) || [] });
  };

  const updateCacheRule = (id: string, updates: Partial<CDNCacheRule>) => {
    onChange({
      cacheRules: data.cacheRules?.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ) || [],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Provider</label>
        <select
          value={data.provider || 'generic'}
          onChange={(e) => onChange({ provider: e.target.value as CDNNodeData['provider'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
        >
          <option value="generic">Generic CDN</option>
          <option value="cloudflare">Cloudflare</option>
          <option value="cloudfront">AWS CloudFront</option>
          <option value="akamai">Akamai</option>
          <option value="fastly">Fastly</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Cache Rules</label>
          <button
            onClick={addCacheRule}
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.cacheRules?.map((rule) => (
            <div key={rule.id} className="bg-gray-100 p-2 rounded space-y-2">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={rule.pattern}
                  onChange={(e) => updateCacheRule(rule.id, { pattern: e.target.value })}
                  placeholder="/static/*"
                  className="flex-1 bg-gray-200 border-none rounded px-2 py-1 text-xs text-gray-900 font-mono"
                />
                <button
                  onClick={() => removeCacheRule(rule.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rule.ttl || ''}
                  onChange={(e) => updateCacheRule(rule.id, { ttl: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  placeholder="TTL (sec)"
                  className="w-24 bg-gray-200 border-none rounded px-2 py-1 text-xs text-gray-900"
                />
                <span className="text-[10px] text-gray-500">seconds</span>
              </div>
            </div>
          ))}
          {(!data.cacheRules || data.cacheRules.length === 0) && (
            <div className="text-xs text-gray-400 italic">No cache rules defined</div>
          )}
        </div>
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
      <ScalingProperties
        scaling={data.scaling}
        onChange={(scaling) => onChange({ scaling })}
      />
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

function RedisProperties({
  data,
  onChange,
  onOpenKeyDesigner,
}: {
  data: RedisNodeData;
  onChange: (data: Partial<RedisNodeData>) => void;
  onOpenKeyDesigner?: () => void;
}) {
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
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Keys</label>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {data.keys?.map((key) => (
            <div key={key.id} className="bg-gray-100 p-2 rounded text-xs">
              <div className="font-medium text-gray-700 font-mono">{key.pattern}</div>
              <div className="text-gray-500">
                {key.valueType}{key.ttl ? `, TTL: ${key.ttl}s` : ''}
              </div>
            </div>
          ))}
          {(!data.keys || data.keys.length === 0) && (
            <div className="text-xs text-gray-400 italic">No keys defined</div>
          )}
        </div>
      </div>
      {onOpenKeyDesigner && (
        <button
          onClick={onOpenKeyDesigner}
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200
                     text-gray-700 border border-gray-300 rounded-lg py-2 text-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open Key Designer
        </button>
      )}
      <p className="text-xs text-gray-400">
        Or double-click the node on the canvas
      </p>
    </div>
  );
}

function MessageQueueProperties({ data, onChange }: { data: MessageQueueNodeData; onChange: (data: Partial<MessageQueueNodeData>) => void }) {
  const addTopic = () => {
    const newTopic: MessageQueueTopic = {
      id: `topic-${Date.now()}`,
      name: 'new-topic',
    };
    onChange({ topics: [...(data.topics || []), newTopic] });
  };

  const removeTopic = (id: string) => {
    onChange({ topics: data.topics?.filter((t) => t.id !== id) || [] });
  };

  const updateTopic = (id: string, updates: Partial<MessageQueueTopic>) => {
    onChange({
      topics: data.topics?.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ) || [],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Provider</label>
        <select
          value={data.provider || 'generic'}
          onChange={(e) => onChange({ provider: e.target.value as MessageQueueNodeData['provider'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
        >
          <option value="generic">Generic Queue</option>
          <option value="sqs">AWS SQS</option>
          <option value="rabbitmq">RabbitMQ</option>
          <option value="kafka">Apache Kafka</option>
          <option value="pubsub">Google Pub/Sub</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Queue Type</label>
        <select
          value={data.queueType || 'standard'}
          onChange={(e) => onChange({ queueType: e.target.value as MessageQueueNodeData['queueType'] })}
          className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
        >
          <option value="standard">Standard</option>
          <option value="fifo">FIFO (Ordered)</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Topics / Queues</label>
          <button
            onClick={addTopic}
            className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.topics?.map((topic) => (
            <div key={topic.id} className="flex items-center gap-1 bg-gray-100 p-2 rounded">
              <input
                type="text"
                value={topic.name}
                onChange={(e) => updateTopic(topic.id, { name: e.target.value })}
                className="flex-1 bg-gray-200 border-none rounded px-2 py-1 text-xs text-gray-900 font-mono"
              />
              <button
                onClick={() => removeTopic(topic.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {(!data.topics || data.topics.length === 0) && (
            <div className="text-xs text-gray-400 italic">No topics defined</div>
          )}
        </div>
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

export function PropertiesPanel({ onOpenSchemaDesigner, onOpenAPIDesigner, onOpenRedisKeyDesigner }: PropertiesPanelProps) {
  const { nodes, selectedNodeId, updateNode, deleteNode, setSelectedNodeId } = useCanvasStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200">
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
      case 'cdn':
        return <CDNProperties data={selectedNode.data as CDNNodeData} onChange={handleChange} />;
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
        return (
          <RedisProperties
            data={selectedNode.data as RedisNodeData}
            onChange={handleChange}
            onOpenKeyDesigner={() => onOpenRedisKeyDesigner(selectedNode.id)}
          />
        );
      case 'messageQueue':
        return <MessageQueueProperties data={selectedNode.data as MessageQueueNodeData} onChange={handleChange} />;
      case 'stickyNote':
        return <StickyNoteProperties data={selectedNode.data as StickyNoteNodeData} onChange={handleChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
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
