import type { APIEndpoint, HTTPMethod } from '../../types/nodes';

interface EndpointEditorProps {
  endpoint: APIEndpoint;
  onUpdate: (updates: Partial<APIEndpoint>) => void;
}

const HTTP_METHODS: { value: HTTPMethod; label: string; color: string }[] = [
  { value: 'GET', label: 'GET', color: 'bg-green-500' },
  { value: 'POST', label: 'POST', color: 'bg-blue-500' },
  { value: 'PUT', label: 'PUT', color: 'bg-yellow-500' },
  { value: 'DELETE', label: 'DELETE', color: 'bg-red-500' },
  { value: 'PATCH', label: 'PATCH', color: 'bg-purple-500' },
];

export function EndpointEditor({ endpoint, onUpdate }: EndpointEditorProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-medium text-white mb-4">Edit Endpoint</h3>

        {/* Method + Path */}
        <div className="flex gap-3">
          <div className="w-32">
            <label className="block text-xs text-slate-400 mb-1">Method</label>
            <select
              value={endpoint.method}
              onChange={(e) => onUpdate({ method: e.target.value as HTTPMethod })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5
                         text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              {HTTP_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Path</label>
            <input
              type="text"
              value={endpoint.path}
              onChange={(e) => onUpdate({ path: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5
                         text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="/api/endpoint"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div>
          <label className="block text-xs text-slate-400 mb-2">Description</label>
          <textarea
            value={endpoint.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5
                       text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
            rows={3}
            placeholder="Describe what this endpoint does..."
          />
        </div>

        {/* Path Parameters */}
        <PathParameters path={endpoint.path} />

        {/* Quick Preview */}
        <div>
          <label className="block text-xs text-slate-400 mb-2">Preview</label>
          <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
            <span className={getMethodColorClass(endpoint.method)}>
              {endpoint.method}
            </span>
            <span className="text-slate-300 ml-2">{endpoint.path}</span>
            {endpoint.description && (
              <p className="text-slate-500 mt-2 text-xs font-sans">
                {endpoint.description}
              </p>
            )}
          </div>
        </div>

        {/* Linked Resources Summary */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Linked Resources</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Request Schema:</span>
              <span className="text-slate-300 ml-2">
                {endpoint.requestSchema ? 'Defined' : 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Response Schema:</span>
              <span className="text-slate-300 ml-2">
                {endpoint.responseSchema ? 'Defined' : 'Not set'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Database Queries:</span>
              <span className="text-slate-300 ml-2">
                {endpoint.linkedQueries?.length || 0} linked
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Use the "Schemas" and "DB Queries" tabs to configure these
          </p>
        </div>
      </div>
    </div>
  );
}

function PathParameters({ path }: { path: string }) {
  // Extract path parameters like :id or {id}
  const params = path.match(/[:{}](\w+)/g)?.map((p) => p.replace(/[:{}]/g, '')) || [];

  if (params.length === 0) return null;

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-2">Path Parameters</label>
      <div className="flex flex-wrap gap-2">
        {params.map((param, idx) => (
          <span
            key={idx}
            className="px-2 py-1 bg-slate-700 rounded text-sm text-blue-400 font-mono"
          >
            {param}
          </span>
        ))}
      </div>
    </div>
  );
}

function getMethodColorClass(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };
  return colors[method] || 'text-slate-400';
}
