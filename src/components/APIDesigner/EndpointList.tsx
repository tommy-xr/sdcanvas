import { Plus, Trash2 } from 'lucide-react';
import type { APIEndpoint } from '../../types/nodes';

interface EndpointListProps {
  endpoints: APIEndpoint[];
  selectedEndpointId: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onAddEndpoint: () => void;
  onDeleteEndpoint: (endpointId: string) => void;
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function EndpointList({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  onAddEndpoint,
  onDeleteEndpoint,
}: EndpointListProps) {
  return (
    <div className="w-72 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <button
          onClick={onAddEndpoint}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500
                     text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Endpoint
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {endpoints.length === 0 ? (
          <div className="text-center text-slate-500 py-8 px-4">
            <p className="text-sm">No endpoints yet</p>
            <p className="text-xs mt-1">Click "Add Endpoint" to create one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer
                  transition-colors
                  ${
                    selectedEndpointId === endpoint.id
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'hover:bg-slate-700/50 border border-transparent'
                  }
                `}
                onClick={() => onSelectEndpoint(endpoint.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`
                      px-1.5 py-0.5 rounded text-[10px] font-bold border
                      ${methodColors[endpoint.method]}
                    `}
                  >
                    {endpoint.method}
                  </span>
                  <span className="text-sm text-slate-300 truncate font-mono">
                    {endpoint.path}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEndpoint(endpoint.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400
                             hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
