import { Plus, Table2, Trash2 } from 'lucide-react';
import type { DatabaseTable } from '../../types/nodes';

interface TableListProps {
  tables: DatabaseTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  onDeleteTable: (tableId: string) => void;
}

export function TableList({
  tables,
  selectedTableId,
  onSelectTable,
  onAddTable,
  onDeleteTable,
}: TableListProps) {
  return (
    <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onAddTable}
          className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400
                     text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Table
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tables.length === 0 ? (
          <div className="text-center text-gray-400 py-8 px-4">
            <Table2 size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tables yet</p>
            <p className="text-xs mt-1">Click "Add Table" to create one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`
                  group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                  transition-colors
                  ${
                    selectedTableId === table.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
                onClick={() => onSelectTable(table.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Table2 size={14} className="flex-shrink-0" />
                  <span className="truncate text-sm">{table.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {table.columns.length} cols
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTable(table.id);
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
