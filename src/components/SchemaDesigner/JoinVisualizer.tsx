import { useState, useMemo } from 'react';
import { Columns3, ArrowRight, Plus, Trash2 } from 'lucide-react';
import type { DatabaseTable, JoinType, DatabaseColumn } from '../../types/nodes';

interface JoinVisualizerProps {
  tables: DatabaseTable[];
}

interface JoinConfig {
  id: string;
  leftTableId: string;
  rightTableId: string;
  joinType: JoinType;
  leftColumnId: string;
  rightColumnId: string;
}

const JOIN_TYPES: { value: JoinType; label: string; description: string }[] = [
  { value: 'INNER', label: 'INNER JOIN', description: 'Returns only matching rows from both tables' },
  { value: 'LEFT', label: 'LEFT JOIN', description: 'Returns all rows from left table, matching from right' },
  { value: 'RIGHT', label: 'RIGHT JOIN', description: 'Returns all rows from right table, matching from left' },
  { value: 'FULL', label: 'FULL JOIN', description: 'Returns all rows when there is a match in either table' },
  { value: 'CROSS', label: 'CROSS JOIN', description: 'Returns Cartesian product of both tables' },
];

export function JoinVisualizer({ tables }: JoinVisualizerProps) {
  const [joins, setJoins] = useState<JoinConfig[]>([]);

  const addJoin = () => {
    if (tables.length < 2) return;

    const newJoin: JoinConfig = {
      id: `join-${Date.now()}`,
      leftTableId: tables[0].id,
      rightTableId: tables[1].id,
      joinType: 'INNER',
      leftColumnId: '',
      rightColumnId: '',
    };
    setJoins([...joins, newJoin]);
  };

  const updateJoin = (joinId: string, updates: Partial<JoinConfig>) => {
    setJoins(joins.map((j) => (j.id === joinId ? { ...j, ...updates } : j)));
  };

  const deleteJoin = (joinId: string) => {
    setJoins(joins.filter((j) => j.id !== joinId));
  };

  // Calculate resulting columns from joins
  const resultColumns = useMemo(() => {
    if (joins.length === 0) return [];

    const columns: { tableName: string; column: DatabaseColumn }[] = [];
    const addedTableIds = new Set<string>();

    joins.forEach((join) => {
      const leftTable = tables.find((t) => t.id === join.leftTableId);
      const rightTable = tables.find((t) => t.id === join.rightTableId);

      if (leftTable && !addedTableIds.has(leftTable.id)) {
        leftTable.columns.forEach((col) => {
          columns.push({ tableName: leftTable.name, column: col });
        });
        addedTableIds.add(leftTable.id);
      }

      if (rightTable && !addedTableIds.has(rightTable.id)) {
        rightTable.columns.forEach((col) => {
          columns.push({ tableName: rightTable.name, column: col });
        });
        addedTableIds.add(rightTable.id);
      }
    });

    return columns;
  }, [joins, tables]);

  // Generate SQL preview
  const sqlPreview = useMemo(() => {
    if (joins.length === 0) return '';

    const parts: string[] = [];
    const addedTableIds = new Set<string>();

    joins.forEach((join, idx) => {
      const leftTable = tables.find((t) => t.id === join.leftTableId);
      const rightTable = tables.find((t) => t.id === join.rightTableId);
      const leftCol = leftTable?.columns.find((c) => c.id === join.leftColumnId);
      const rightCol = rightTable?.columns.find((c) => c.id === join.rightColumnId);

      if (!leftTable || !rightTable) return;

      if (idx === 0) {
        parts.push(`SELECT *\nFROM ${leftTable.name}`);
        addedTableIds.add(leftTable.id);
      }

      if (!addedTableIds.has(rightTable.id)) {
        if (join.joinType === 'CROSS') {
          parts.push(`${join.joinType} JOIN ${rightTable.name}`);
        } else {
          const onClause =
            leftCol && rightCol
              ? `\n  ON ${leftTable.name}.${leftCol.name} = ${rightTable.name}.${rightCol.name}`
              : '\n  ON <condition>';
          parts.push(`${join.joinType} JOIN ${rightTable.name}${onClause}`);
        }
        addedTableIds.add(rightTable.id);
      }
    });

    return parts.join('\n');
  }, [joins, tables]);

  if (tables.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Columns3 size={48} className="mx-auto mb-3 opacity-50" />
          <p>Need at least 2 tables for joins</p>
          <p className="text-sm mt-1">Create tables in the Tables tab first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Join configuration */}
        <div className="w-1/2 border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Configure Joins</h3>
              <button
                onClick={addJoin}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500
                           text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Add Join
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {joins.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Columns3 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No joins configured</p>
                <p className="text-xs mt-1">Click "Add Join" to create one</p>
              </div>
            ) : (
              joins.map((join, idx) => (
                <JoinCard
                  key={join.id}
                  join={join}
                  tables={tables}
                  index={idx}
                  onUpdate={(updates) => updateJoin(join.id, updates)}
                  onDelete={() => deleteJoin(join.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preview area */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* SQL Preview */}
          <div className="flex-1 border-b border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300">SQL Preview</h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {sqlPreview ? (
                <pre className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap">
                  {sqlPreview}
                </pre>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Configure joins to see the SQL preview
                </div>
              )}
            </div>
          </div>

          {/* Result columns */}
          <div className="h-1/2 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300">
                Result Columns ({resultColumns.length})
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {resultColumns.length > 0 ? (
                <div className="space-y-1">
                  {resultColumns.map((rc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/30 rounded text-sm"
                    >
                      <span className="text-slate-400">{rc.tableName}.</span>
                      <span className="text-slate-200">{rc.column.name}</span>
                      <span className="text-slate-500 text-xs">({rc.column.type})</span>
                      {rc.column.isPrimaryKey && (
                        <span className="text-yellow-500 text-xs">PK</span>
                      )}
                      {rc.column.isForeignKey && (
                        <span className="text-blue-400 text-xs">FK</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Add joins to see result columns
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface JoinCardProps {
  join: JoinConfig;
  tables: DatabaseTable[];
  index: number;
  onUpdate: (updates: Partial<JoinConfig>) => void;
  onDelete: () => void;
}

function JoinCard({ join, tables, index, onUpdate, onDelete }: JoinCardProps) {
  const leftTable = tables.find((t) => t.id === join.leftTableId);
  const rightTable = tables.find((t) => t.id === join.rightTableId);
  const joinTypeInfo = JOIN_TYPES.find((t) => t.value === join.joinType);

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Join {index + 1}</span>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Join type */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Join Type</label>
        <select
          value={join.joinType}
          onChange={(e) => onUpdate({ joinType: e.target.value as JoinType })}
          className="w-full bg-slate-600 border-none rounded-lg px-3 py-2 text-sm text-white
                     focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {JOIN_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {joinTypeInfo && (
          <p className="text-xs text-slate-500 mt-1">{joinTypeInfo.description}</p>
        )}
      </div>

      {/* Table selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Left Table</label>
          <select
            value={join.leftTableId}
            onChange={(e) => onUpdate({ leftTableId: e.target.value, leftColumnId: '' })}
            className="w-full bg-slate-600 border-none rounded-lg px-3 py-2 text-sm text-white
                       focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight size={20} className="text-slate-500 mt-5" />

        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Right Table</label>
          <select
            value={join.rightTableId}
            onChange={(e) => onUpdate({ rightTableId: e.target.value, rightColumnId: '' })}
            className="w-full bg-slate-600 border-none rounded-lg px-3 py-2 text-sm text-white
                       focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Column selection (not for CROSS join) */}
      {join.joinType !== 'CROSS' && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Join Column</label>
            <select
              value={join.leftColumnId}
              onChange={(e) => onUpdate({ leftColumnId: e.target.value })}
              className="w-full bg-slate-600 border-none rounded-lg px-3 py-2 text-sm text-white
                         focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select column...</option>
              {leftTable?.columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-500 mt-5">=</span>

          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Join Column</label>
            <select
              value={join.rightColumnId}
              onChange={(e) => onUpdate({ rightColumnId: e.target.value })}
              className="w-full bg-slate-600 border-none rounded-lg px-3 py-2 text-sm text-white
                         focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select column...</option>
              {rightTable?.columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Visual join preview */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <JoinDiagram join={join} leftTable={leftTable} rightTable={rightTable} />
      </div>
    </div>
  );
}

interface JoinDiagramProps {
  join: JoinConfig;
  leftTable?: DatabaseTable;
  rightTable?: DatabaseTable;
}

function JoinDiagram({ join, leftTable, rightTable }: JoinDiagramProps) {
  // Visual representation of join type using Venn diagrams
  const getVennStyle = () => {
    const base = {
      left: 'w-16 h-16 rounded-full border-2',
      right: 'w-16 h-16 rounded-full border-2 -ml-6',
    };

    switch (join.joinType) {
      case 'INNER':
        return {
          left: `${base.left} border-slate-500 bg-transparent`,
          right: `${base.right} border-slate-500 bg-transparent`,
          overlap: 'bg-blue-500/30',
        };
      case 'LEFT':
        return {
          left: `${base.left} border-blue-500 bg-blue-500/30`,
          right: `${base.right} border-slate-500 bg-transparent`,
          overlap: 'bg-blue-500/30',
        };
      case 'RIGHT':
        return {
          left: `${base.left} border-slate-500 bg-transparent`,
          right: `${base.right} border-blue-500 bg-blue-500/30`,
          overlap: 'bg-blue-500/30',
        };
      case 'FULL':
        return {
          left: `${base.left} border-blue-500 bg-blue-500/30`,
          right: `${base.right} border-blue-500 bg-blue-500/30`,
          overlap: 'bg-blue-500/30',
        };
      case 'CROSS':
        return {
          left: `${base.left} border-blue-500 bg-blue-500/30`,
          right: `${base.right} border-blue-500 bg-blue-500/30 ml-2`,
          overlap: '',
        };
      default:
        return {
          left: base.left,
          right: base.right,
          overlap: '',
        };
    }
  };

  const vennStyle = getVennStyle();

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="flex items-center">
        <div className={vennStyle.left}></div>
        <div className={vennStyle.right}></div>
      </div>
      <div className="text-xs text-slate-400">
        <div className="font-medium text-slate-300">{leftTable?.name || 'Left'}</div>
        <div className="text-blue-400 my-1">{join.joinType} JOIN</div>
        <div className="font-medium text-slate-300">{rightTable?.name || 'Right'}</div>
      </div>
    </div>
  );
}
