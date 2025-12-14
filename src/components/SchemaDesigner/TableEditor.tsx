import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type {
  DatabaseTable,
  DatabaseColumn,
  DatabaseIndex,
  ColumnType,
  IndexType,
} from '../../types/nodes';

interface TableEditorProps {
  table: DatabaseTable;
  allTables: DatabaseTable[];
  onUpdate: (updates: Partial<DatabaseTable>) => void;
}

const COLUMN_TYPES: { label: string; value: ColumnType; category: string }[] = [
  // Numeric
  { label: 'serial', value: 'serial', category: 'Numeric' },
  { label: 'bigserial', value: 'bigserial', category: 'Numeric' },
  { label: 'smallint', value: 'smallint', category: 'Numeric' },
  { label: 'integer', value: 'integer', category: 'Numeric' },
  { label: 'bigint', value: 'bigint', category: 'Numeric' },
  { label: 'decimal', value: 'decimal', category: 'Numeric' },
  { label: 'numeric', value: 'numeric', category: 'Numeric' },
  { label: 'real', value: 'real', category: 'Numeric' },
  { label: 'double precision', value: 'double precision', category: 'Numeric' },
  // Character
  { label: 'char', value: 'char', category: 'Character' },
  { label: 'varchar', value: 'varchar', category: 'Character' },
  { label: 'text', value: 'text', category: 'Character' },
  // Date/Time
  { label: 'timestamp', value: 'timestamp', category: 'Date/Time' },
  { label: 'timestamptz', value: 'timestamptz', category: 'Date/Time' },
  { label: 'date', value: 'date', category: 'Date/Time' },
  { label: 'time', value: 'time', category: 'Date/Time' },
  { label: 'interval', value: 'interval', category: 'Date/Time' },
  // Boolean
  { label: 'boolean', value: 'boolean', category: 'Boolean' },
  // UUID
  { label: 'uuid', value: 'uuid', category: 'UUID' },
  // JSON
  { label: 'json', value: 'json', category: 'JSON' },
  { label: 'jsonb', value: 'jsonb', category: 'JSON' },
  // Binary
  { label: 'bytea', value: 'bytea', category: 'Binary' },
  // Arrays
  { label: 'integer[]', value: 'integer[]', category: 'Array' },
  { label: 'text[]', value: 'text[]', category: 'Array' },
  { label: 'varchar[]', value: 'varchar[]', category: 'Array' },
  { label: 'jsonb[]', value: 'jsonb[]', category: 'Array' },
];

const INDEX_TYPES: { value: IndexType; label: string; description: string }[] = [
  { value: 'btree', label: 'B-tree', description: 'Default, good for equality and range queries' },
  { value: 'hash', label: 'Hash', description: 'Optimized for equality comparisons' },
  { value: 'gin', label: 'GIN', description: 'Best for JSONB, arrays, and full-text search' },
  { value: 'gist', label: 'GiST', description: 'For geometric and full-text data' },
  { value: 'brin', label: 'BRIN', description: 'For large tables with natural ordering' },
];

export function TableEditor({ table, allTables, onUpdate }: TableEditorProps) {
  const [activeSection, setActiveSection] = useState<'columns' | 'indexes'>('columns');

  const handleTableNameChange = (name: string) => {
    onUpdate({ name });
  };

  const handleEstimatedRowsChange = (value: string) => {
    const rows = parseInt(value, 10);
    if (!isNaN(rows) && rows >= 0) {
      onUpdate({ estimatedRows: rows });
    }
  };

  // Column operations
  const addColumn = () => {
    const newColumn: DatabaseColumn = {
      id: `col-${Date.now()}`,
      name: 'new_column',
      type: 'varchar',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
    };
    onUpdate({ columns: [...table.columns, newColumn] });
  };

  const updateColumn = (columnId: string, updates: Partial<DatabaseColumn>) => {
    const newColumns = table.columns.map((c) =>
      c.id === columnId ? { ...c, ...updates } : c
    );
    onUpdate({ columns: newColumns });
  };

  const deleteColumn = (columnId: string) => {
    onUpdate({ columns: table.columns.filter((c) => c.id !== columnId) });
  };

  // Index operations
  const addIndex = () => {
    const newIndex: DatabaseIndex = {
      id: `idx-${Date.now()}`,
      name: `idx_${table.name}_new`,
      columns: [],
      isUnique: false,
      type: 'btree',
    };
    onUpdate({ indexes: [...table.indexes, newIndex] });
  };

  const updateIndex = (indexId: string, updates: Partial<DatabaseIndex>) => {
    const newIndexes = table.indexes.map((i) =>
      i.id === indexId ? { ...i, ...updates } : i
    );
    onUpdate({ indexes: newIndexes });
  };

  const deleteIndex = (indexId: string) => {
    onUpdate({ indexes: table.indexes.filter((i) => i.id !== indexId) });
  };

  // Get columns that would benefit from GIN index
  const jsonbColumns = table.columns.filter(
    (c) => c.type === 'jsonb' || c.type === 'json' || c.type.includes('[]')
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Table header */}
      <div className="p-4 border-b border-slate-700 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Table Name</label>
            <input
              type="text"
              value={table.name}
              onChange={(e) => handleTableNameChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                         text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-slate-400 mb-1">Est. Rows</label>
            <input
              type="number"
              value={table.estimatedRows || 1000}
              onChange={(e) => handleEstimatedRowsChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                         text-white text-sm focus:border-blue-500 focus:outline-none"
              min="0"
            />
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('columns')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'columns'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Columns ({table.columns.length})
          </button>
          <button
            onClick={() => setActiveSection('indexes')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'indexes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Indexes ({table.indexes.length})
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'columns' ? (
          <ColumnsSection
            columns={table.columns}
            allTables={allTables}
            currentTableId={table.id}
            onAddColumn={addColumn}
            onUpdateColumn={updateColumn}
            onDeleteColumn={deleteColumn}
          />
        ) : (
          <IndexesSection
            indexes={table.indexes}
            columns={table.columns}
            tableName={table.name}
            jsonbColumns={jsonbColumns}
            onAddIndex={addIndex}
            onUpdateIndex={updateIndex}
            onDeleteIndex={deleteIndex}
          />
        )}
      </div>
    </div>
  );
}

// Columns Section Component
interface ColumnsSectionProps {
  columns: DatabaseColumn[];
  allTables: DatabaseTable[];
  currentTableId: string;
  onAddColumn: () => void;
  onUpdateColumn: (columnId: string, updates: Partial<DatabaseColumn>) => void;
  onDeleteColumn: (columnId: string) => void;
}

function ColumnsSection({
  columns,
  allTables,
  currentTableId,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}: ColumnsSectionProps) {
  const otherTables = allTables.filter((t) => t.id !== currentTableId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Columns</h3>
        <button
          onClick={onAddColumn}
          className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600
                     text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Column
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_140px_50px_50px_50px_50px_180px_40px] gap-2 px-3 py-2
                      bg-slate-700/50 rounded-lg text-xs text-slate-400 font-medium">
        <div>Name</div>
        <div>Type</div>
        <div className="text-center" title="Primary Key">PK</div>
        <div className="text-center" title="Not Null">NN</div>
        <div className="text-center" title="Unique">UQ</div>
        <div className="text-center" title="Foreign Key">FK</div>
        <div>FK Reference</div>
        <div></div>
      </div>

      {/* Column rows */}
      <div className="space-y-2">
        {columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            otherTables={otherTables}
            onUpdate={(updates) => onUpdateColumn(column.id, updates)}
            onDelete={() => onDeleteColumn(column.id)}
          />
        ))}
      </div>

      {columns.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          No columns defined. Click "Add Column" to create one.
        </div>
      )}
    </div>
  );
}

interface ColumnRowProps {
  column: DatabaseColumn;
  otherTables: DatabaseTable[];
  onUpdate: (updates: Partial<DatabaseColumn>) => void;
  onDelete: () => void;
}

function ColumnRow({ column, otherTables, onUpdate, onDelete }: ColumnRowProps) {
  const selectedFKTable = column.foreignKeyRef
    ? otherTables.find((t) => t.id === column.foreignKeyRef?.tableId)
    : null;

  return (
    <div className="grid grid-cols-[1fr_140px_50px_50px_50px_50px_180px_40px] gap-2 items-center
                    bg-slate-700/30 rounded-lg px-3 py-2 hover:bg-slate-700/50 transition-colors">
      {/* Name */}
      <input
        type="text"
        value={column.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="bg-slate-600 border-none rounded px-2 py-1 text-sm text-white
                   focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />

      {/* Type */}
      <select
        value={column.type}
        onChange={(e) => onUpdate({ type: e.target.value as ColumnType })}
        className="bg-slate-600 border-none rounded px-2 py-1 text-sm text-white
                   focus:ring-1 focus:ring-blue-500 focus:outline-none"
      >
        {Object.entries(
          COLUMN_TYPES.reduce((acc, type) => {
            if (!acc[type.category]) acc[type.category] = [];
            acc[type.category].push(type);
            return acc;
          }, {} as Record<string, typeof COLUMN_TYPES>)
        ).map(([category, types]) => (
          <optgroup key={category} label={category}>
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Primary Key */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={column.isPrimaryKey}
          onChange={(e) =>
            onUpdate({
              isPrimaryKey: e.target.checked,
              isNullable: e.target.checked ? false : column.isNullable,
              isUnique: e.target.checked ? true : column.isUnique,
            })
          }
          className="w-4 h-4 rounded bg-slate-600 border-slate-500
                     text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Not Null */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={!column.isNullable}
          onChange={(e) => onUpdate({ isNullable: !e.target.checked })}
          disabled={column.isPrimaryKey}
          className="w-4 h-4 rounded bg-slate-600 border-slate-500
                     text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Unique */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={column.isUnique}
          onChange={(e) => onUpdate({ isUnique: e.target.checked })}
          disabled={column.isPrimaryKey}
          className="w-4 h-4 rounded bg-slate-600 border-slate-500
                     text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Foreign Key checkbox */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={column.isForeignKey}
          onChange={(e) =>
            onUpdate({
              isForeignKey: e.target.checked,
              foreignKeyRef: e.target.checked ? undefined : undefined,
            })
          }
          className="w-4 h-4 rounded bg-slate-600 border-slate-500
                     text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* FK Reference */}
      {column.isForeignKey ? (
        <div className="flex gap-1">
          <select
            value={column.foreignKeyRef?.tableId || ''}
            onChange={(e) => {
              const tableId = e.target.value;
              const table = otherTables.find((t) => t.id === tableId);
              const firstPK = table?.columns.find((c) => c.isPrimaryKey);
              onUpdate({
                foreignKeyRef: tableId
                  ? { tableId, columnId: firstPK?.id || '' }
                  : undefined,
              });
            }}
            className="flex-1 bg-slate-600 border-none rounded px-1 py-1 text-xs text-white
                       focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Table...</option>
            {otherTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedFKTable && (
            <select
              value={column.foreignKeyRef?.columnId || ''}
              onChange={(e) =>
                onUpdate({
                  foreignKeyRef: {
                    tableId: column.foreignKeyRef!.tableId,
                    columnId: e.target.value,
                  },
                })
              }
              className="flex-1 bg-slate-600 border-none rounded px-1 py-1 text-xs text-white
                         focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Column...</option>
              {selectedFKTable.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="text-slate-500 text-xs">-</div>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// Indexes Section Component
interface IndexesSectionProps {
  indexes: DatabaseIndex[];
  columns: DatabaseColumn[];
  tableName: string;
  jsonbColumns: DatabaseColumn[];
  onAddIndex: () => void;
  onUpdateIndex: (indexId: string, updates: Partial<DatabaseIndex>) => void;
  onDeleteIndex: (indexId: string) => void;
}

function IndexesSection({
  indexes,
  columns,
  tableName,
  jsonbColumns,
  onAddIndex,
  onUpdateIndex,
  onDeleteIndex,
}: IndexesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Indexes</h3>
        <button
          onClick={onAddIndex}
          className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600
                     text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Index
        </button>
      </div>

      {/* GIN index suggestion */}
      {jsonbColumns.length > 0 && (
        <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-500/30
                        rounded-lg p-3 text-sm">
          <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-blue-400 font-medium">Tip:</span>
            <span className="text-slate-300 ml-1">
              You have JSONB/array columns ({jsonbColumns.map(c => c.name).join(', ')}).
              Consider adding GIN indexes for efficient querying.
            </span>
          </div>
        </div>
      )}

      {/* Index list */}
      <div className="space-y-3">
        {indexes.map((index) => (
          <IndexCard
            key={index.id}
            index={index}
            columns={columns}
            tableName={tableName}
            onUpdate={(updates) => onUpdateIndex(index.id, updates)}
            onDelete={() => onDeleteIndex(index.id)}
          />
        ))}
      </div>

      {indexes.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          No indexes defined. Click "Add Index" to create one.
        </div>
      )}
    </div>
  );
}

interface IndexCardProps {
  index: DatabaseIndex;
  columns: DatabaseColumn[];
  tableName: string;
  onUpdate: (updates: Partial<DatabaseIndex>) => void;
  onDelete: () => void;
}

function IndexCard({ index, columns, tableName, onUpdate, onDelete }: IndexCardProps) {
  const toggleColumn = (columnId: string) => {
    const newColumns = index.columns.includes(columnId)
      ? index.columns.filter((c) => c !== columnId)
      : [...index.columns, columnId];
    onUpdate({ columns: newColumns });
  };

  const selectedIndexType = INDEX_TYPES.find((t) => t.value === index.type);

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Index name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Index Name</label>
            <input
              type="text"
              value={index.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full bg-slate-600 border-none rounded px-3 py-1.5 text-sm text-white
                         focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder={`idx_${tableName}_...`}
            />
          </div>

          <div className="flex gap-4">
            {/* Index type */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={index.type}
                onChange={(e) => onUpdate({ type: e.target.value as IndexType })}
                className="w-full bg-slate-600 border-none rounded px-3 py-1.5 text-sm text-white
                           focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {INDEX_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedIndexType && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedIndexType.description}
                </p>
              )}
            </div>

            {/* Unique checkbox */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id={`unique-${index.id}`}
                checked={index.isUnique}
                onChange={(e) => onUpdate({ isUnique: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-600 border-slate-500
                           text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`unique-${index.id}`} className="text-sm text-slate-300">
                Unique
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Column selection */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">
          Indexed Columns (select in order)
        </label>
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => {
            const isSelected = index.columns.includes(column.id);
            const order = index.columns.indexOf(column.id) + 1;

            return (
              <button
                key={column.id}
                onClick={() => toggleColumn(column.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-colors
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }
                `}
              >
                {isSelected && (
                  <span className="w-4 h-4 bg-blue-800 rounded-full flex items-center justify-center text-[10px]">
                    {order}
                  </span>
                )}
                {column.name}
                <span className="text-slate-400 text-[10px]">({column.type})</span>
              </button>
            );
          })}
        </div>
        {index.columns.length === 0 && (
          <p className="text-xs text-slate-500 mt-2">
            Click columns above to add them to the index
          </p>
        )}
      </div>

      {/* Preview */}
      {index.columns.length > 0 && (
        <div className="bg-slate-900/50 rounded p-2 font-mono text-xs text-slate-400">
          CREATE {index.isUnique ? 'UNIQUE ' : ''}INDEX {index.name} ON {tableName}
          <br />
          &nbsp;&nbsp;USING {index.type} (
          {index.columns
            .map((cId) => columns.find((c) => c.id === cId)?.name)
            .filter(Boolean)
            .join(', ')}
          );
        </div>
      )}
    </div>
  );
}
