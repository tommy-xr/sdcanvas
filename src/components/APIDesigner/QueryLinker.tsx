import { Plus, Trash2, Database, Link, ArrowRight } from 'lucide-react';
import type { APIEndpoint, LinkedQuery, PostgreSQLNodeData, SystemNode } from '../../types/nodes';

interface QueryLinkerProps {
  endpoints: APIEndpoint[];
  selectedEndpointId: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onUpdateEndpoint: (endpointId: string, updates: Partial<APIEndpoint>) => void;
  databaseNodes: SystemNode[];
}

const QUERY_TYPES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
type QueryType = (typeof QUERY_TYPES)[number];

const queryTypeColors: Record<QueryType, string> = {
  SELECT: 'bg-green-500/20 text-green-400 border-green-500/30',
  INSERT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  UPDATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function QueryLinker({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  onUpdateEndpoint,
  databaseNodes,
}: QueryLinkerProps) {
  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId);
  const linkedQueries = selectedEndpoint?.linkedQueries || [];

  const addLinkedQuery = () => {
    if (!selectedEndpointId || databaseNodes.length === 0) return;

    const firstDb = databaseNodes[0];
    const dbData = firstDb.data as PostgreSQLNodeData;
    const firstTable = dbData.tables?.[0];

    const newQuery: LinkedQuery = {
      id: `query-${Date.now()}`,
      targetNodeId: firstDb.id,
      targetTableId: firstTable?.id || '',
      queryType: 'SELECT',
    };

    onUpdateEndpoint(selectedEndpointId, {
      linkedQueries: [...linkedQueries, newQuery],
    });
  };

  const updateLinkedQuery = (queryId: string, updates: Partial<LinkedQuery>) => {
    if (!selectedEndpointId) return;

    onUpdateEndpoint(selectedEndpointId, {
      linkedQueries: linkedQueries.map((q) =>
        q.id === queryId ? { ...q, ...updates } : q
      ),
    });
  };

  const removeLinkedQuery = (queryId: string) => {
    if (!selectedEndpointId) return;

    onUpdateEndpoint(selectedEndpointId, {
      linkedQueries: linkedQueries.filter((q) => q.id !== queryId),
    });
  };

  return (
    <div className="flex h-full">
      {/* Endpoint list sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Select Endpoint</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              onClick={() => onSelectEndpoint(endpoint.id)}
              className={`
                px-3 py-2 rounded-lg cursor-pointer mb-1 transition-colors
                ${
                  selectedEndpointId === endpoint.id
                    ? 'bg-blue-600/20 border border-blue-500/30'
                    : 'hover:bg-gray-100 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <span className="text-sm text-gray-700 truncate font-mono">
                  {endpoint.path}
                </span>
              </div>
              {endpoint.linkedQueries && endpoint.linkedQueries.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                  <Database size={10} />
                  {endpoint.linkedQueries.length} queries
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Query linking area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEndpoint ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Database Queries for{' '}
                    <span className={getMethodColor(selectedEndpoint.method)}>
                      {selectedEndpoint.method}
                    </span>{' '}
                    <span className="font-mono">{selectedEndpoint.path}</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Link this endpoint to database operations
                  </p>
                </div>
                <button
                  onClick={addLinkedQuery}
                  disabled={databaseNodes.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400
                             disabled:bg-gray-200 disabled:cursor-not-allowed
                             text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Add Query
                </button>
              </div>
            </div>

            {/* Query list */}
            <div className="flex-1 overflow-y-auto p-4">
              {databaseNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Database size={48} className="mb-3 opacity-50" />
                  <p>No database nodes in your diagram</p>
                  <p className="text-sm mt-1">
                    Add a PostgreSQL node to link database queries
                  </p>
                </div>
              ) : linkedQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Link size={48} className="mb-3 opacity-50" />
                  <p>No queries linked to this endpoint</p>
                  <p className="text-sm mt-1">
                    Click "Add Query" to link a database operation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedQueries.map((query, index) => (
                    <QueryCard
                      key={query.id}
                      query={query}
                      index={index}
                      databaseNodes={databaseNodes}
                      onUpdate={(updates) => updateLinkedQuery(query.id, updates)}
                      onRemove={() => removeLinkedQuery(query.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Flow visualization */}
            {linkedQueries.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <h4 className="text-xs text-gray-500 mb-3">Data Flow</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <span className={`text-xs font-bold ${getMethodColor(selectedEndpoint.method)}`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className="text-sm text-gray-700 ml-2 font-mono">
                      {selectedEndpoint.path}
                    </span>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                  {linkedQueries.map((query) => {
                    const dbNode = databaseNodes.find((n) => n.id === query.targetNodeId);
                    const dbData = dbNode?.data as PostgreSQLNodeData | undefined;
                    const table = dbData?.tables?.find((t) => t.id === query.targetTableId);

                    return (
                      <div
                        key={query.id}
                        className={`
                          px-3 py-2 rounded-lg border flex items-center gap-2
                          ${queryTypeColors[query.queryType]}
                        `}
                      >
                        <span className="text-xs font-bold">{query.queryType}</span>
                        <span className="text-sm">{table?.name || 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Database size={48} className="mx-auto mb-3 opacity-50" />
              <p>Select an endpoint to manage its database queries</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface QueryCardProps {
  query: LinkedQuery;
  index: number;
  databaseNodes: SystemNode[];
  onUpdate: (updates: Partial<LinkedQuery>) => void;
  onRemove: () => void;
}

function QueryCard({ query, index, databaseNodes, onUpdate, onRemove }: QueryCardProps) {
  const selectedDb = databaseNodes.find((n) => n.id === query.targetNodeId);
  const dbData = selectedDb?.data as PostgreSQLNodeData | undefined;
  const tables = dbData?.tables || [];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-medium">Query {index + 1}</span>
        <button
          onClick={onRemove}
          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Query Type */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Query Type</label>
          <select
            value={query.queryType}
            onChange={(e) => onUpdate({ queryType: e.target.value as QueryType })}
            className="w-full bg-gray-200 border-none rounded-lg px-3 py-2
                       text-gray-900 text-sm focus:ring-1 focus:ring-blue-500"
          >
            {QUERY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Database */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Database</label>
          <select
            value={query.targetNodeId}
            onChange={(e) => {
              const newDb = databaseNodes.find((n) => n.id === e.target.value);
              const newDbData = newDb?.data as PostgreSQLNodeData | undefined;
              onUpdate({
                targetNodeId: e.target.value,
                targetTableId: newDbData?.tables?.[0]?.id || '',
              });
            }}
            className="w-full bg-gray-200 border-none rounded-lg px-3 py-2
                       text-gray-900 text-sm focus:ring-1 focus:ring-blue-500"
          >
            {databaseNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {(node.data as PostgreSQLNodeData).label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Table</label>
          <select
            value={query.targetTableId}
            onChange={(e) => onUpdate({ targetTableId: e.target.value })}
            className="w-full bg-gray-200 border-none rounded-lg px-3 py-2
                       text-gray-900 text-sm focus:ring-1 focus:ring-blue-500"
          >
            {tables.length === 0 ? (
              <option value="">No tables</option>
            ) : (
              tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="mt-4">
        <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
        <input
          type="text"
          value={query.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="e.g., Fetch user by ID"
          className="w-full bg-gray-200 border-none rounded-lg px-3 py-2
                     text-gray-900 text-sm focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* SQL Preview */}
      {query.targetTableId && (
        <div className="mt-4 bg-gray-100 rounded-lg p-3">
          <span className="text-xs text-gray-500">SQL Preview:</span>
          <pre className="text-sm text-gray-700 font-mono mt-1">
            {generateSqlPreview(query, tables.find((t) => t.id === query.targetTableId)?.name)}
          </pre>
        </div>
      )}
    </div>
  );
}

function generateSqlPreview(query: LinkedQuery, tableName?: string): string {
  if (!tableName) return '-- Select a table';

  switch (query.queryType) {
    case 'SELECT':
      return `SELECT * FROM ${tableName} WHERE ...`;
    case 'INSERT':
      return `INSERT INTO ${tableName} (...) VALUES (...)`;
    case 'UPDATE':
      return `UPDATE ${tableName} SET ... WHERE ...`;
    case 'DELETE':
      return `DELETE FROM ${tableName} WHERE ...`;
    default:
      return '';
  }
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };
  return colors[method] || 'text-gray-500';
}
