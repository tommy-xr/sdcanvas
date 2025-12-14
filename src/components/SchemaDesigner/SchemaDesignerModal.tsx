import { useState, useCallback } from 'react';
import { X, Database, Table2, Columns3, GitBranch, BarChart3 } from 'lucide-react';
import type { PostgreSQLNodeData, DatabaseTable } from '../../types/nodes';
import { TableList } from './TableList';
import { TableEditor } from './TableEditor';
import { ERDiagram } from './ERDiagram';
import { JoinVisualizer } from './JoinVisualizer';
import { QueryCostEstimator } from './QueryCostEstimator';

type TabType = 'tables' | 'er-diagram' | 'joins' | 'cost';

interface SchemaDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PostgreSQLNodeData;
  onUpdate: (data: Partial<PostgreSQLNodeData>) => void;
}

export function SchemaDesignerModal({
  isOpen,
  onClose,
  data,
  onUpdate,
}: SchemaDesignerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tables');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    data.tables?.[0]?.id || null
  );

  const tables = data.tables || [];
  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const handleAddTable = useCallback(() => {
    const newTable: DatabaseTable = {
      id: `table-${Date.now()}`,
      name: 'new_table',
      columns: [
        {
          id: `col-${Date.now()}`,
          name: 'id',
          type: 'serial',
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
        },
      ],
      indexes: [],
      estimatedRows: 1000,
    };
    const newTables = [...tables, newTable];
    onUpdate({ tables: newTables });
    setSelectedTableId(newTable.id);
  }, [tables, onUpdate]);

  const handleUpdateTable = useCallback(
    (tableId: string, updates: Partial<DatabaseTable>) => {
      const newTables = tables.map((t) =>
        t.id === tableId ? { ...t, ...updates } : t
      );
      onUpdate({ tables: newTables });
    },
    [tables, onUpdate]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      const newTables = tables.filter((t) => t.id !== tableId);
      onUpdate({ tables: newTables });
      if (selectedTableId === tableId) {
        setSelectedTableId(newTables[0]?.id || null);
      }
    },
    [tables, onUpdate, selectedTableId]
  );

  if (!isOpen) return null;

  const tabs = [
    { id: 'tables' as const, label: 'Tables', icon: Table2 },
    { id: 'er-diagram' as const, label: 'ER Diagram', icon: GitBranch },
    { id: 'joins' as const, label: 'Joins', icon: Columns3 },
    { id: 'cost' as const, label: 'Cost Est.', icon: BarChart3 },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Database className="text-[#336791]" size={24} />
            <h2 className="text-xl font-semibold text-white">
              Schema Designer - {data.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/20'
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
          {activeTab === 'tables' && (
            <div className="flex h-full">
              <TableList
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={setSelectedTableId}
                onAddTable={handleAddTable}
                onDeleteTable={handleDeleteTable}
              />
              {selectedTable ? (
                <TableEditor
                  table={selectedTable}
                  allTables={tables}
                  onUpdate={(updates) =>
                    handleUpdateTable(selectedTable.id, updates)
                  }
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Table2 size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Select a table or create a new one</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'er-diagram' && (
            <ERDiagram tables={tables} />
          )}

          {activeTab === 'joins' && (
            <JoinVisualizer tables={tables} />
          )}

          {activeTab === 'cost' && (
            <QueryCostEstimator tables={tables} />
          )}
        </div>
      </div>
    </div>
  );
}
