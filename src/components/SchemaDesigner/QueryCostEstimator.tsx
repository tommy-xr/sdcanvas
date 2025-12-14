import { useState, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Search,
  Database,
  Zap,
  Clock,
} from 'lucide-react';
import type { DatabaseTable, QueryCostEstimate } from '../../types/nodes';

interface QueryCostEstimatorProps {
  tables: DatabaseTable[];
}

interface QueryConfig {
  tableId: string;
  whereColumns: string[];
  orderByColumn: string | null;
  joinTableId: string | null;
  joinColumn: string | null;
  limit: number | null;
}

export function QueryCostEstimator({ tables }: QueryCostEstimatorProps) {
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    tableId: tables[0]?.id || '',
    whereColumns: [],
    orderByColumn: null,
    joinTableId: null,
    joinColumn: null,
    limit: null,
  });

  const selectedTable = tables.find((t) => t.id === queryConfig.tableId);
  const joinTable = queryConfig.joinTableId
    ? tables.find((t) => t.id === queryConfig.joinTableId)
    : null;

  // Calculate cost estimate
  const costEstimate = useMemo((): QueryCostEstimate | null => {
    if (!selectedTable) return null;

    const rowCount = selectedTable.estimatedRows || 1000;
    const warnings: string[] = [];
    let scanType: QueryCostEstimate['scanType'] = 'seq_scan';
    let estimatedRows = rowCount;
    let estimatedCost = rowCount;
    const usedIndexes: string[] = [];

    // Check if WHERE columns have indexes
    if (queryConfig.whereColumns.length > 0) {
      const hasMatchingIndex = selectedTable.indexes.some((idx) => {
        // Check if index covers all WHERE columns (or starts with them)
        const indexColIds = idx.columns;
        return queryConfig.whereColumns.every((wc) => indexColIds.includes(wc));
      });

      if (hasMatchingIndex) {
        const matchingIdx = selectedTable.indexes.find((idx) =>
          queryConfig.whereColumns.every((wc) => idx.columns.includes(wc))
        );
        if (matchingIdx) {
          usedIndexes.push(matchingIdx.name);
          scanType = 'index_scan';
          // Assume index reduces rows significantly
          estimatedRows = Math.ceil(rowCount * 0.1);
          estimatedCost = Math.log2(rowCount) * 2;
        }
      } else {
        warnings.push(
          `No index covers WHERE columns: ${queryConfig.whereColumns
            .map((id) => selectedTable.columns.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(', ')}. Consider adding an index.`
        );
      }

      // Check for JSONB columns without GIN index
      queryConfig.whereColumns.forEach((colId) => {
        const col = selectedTable.columns.find((c) => c.id === colId);
        if (col && (col.type === 'jsonb' || col.type === 'json')) {
          const hasGinIndex = selectedTable.indexes.some(
            (idx) => idx.type === 'gin' && idx.columns.includes(colId)
          );
          if (!hasGinIndex) {
            warnings.push(
              `JSONB column "${col.name}" used in WHERE without GIN index. This will be slow for containment queries.`
            );
          }
        }
      });
    }

    // Check ORDER BY
    if (queryConfig.orderByColumn) {
      const hasOrderIndex = selectedTable.indexes.some((idx) =>
        idx.columns[0] === queryConfig.orderByColumn
      );
      if (!hasOrderIndex && !queryConfig.limit) {
        const col = selectedTable.columns.find((c) => c.id === queryConfig.orderByColumn);
        warnings.push(
          `ORDER BY "${col?.name}" without index will require a full sort. Consider adding an index.`
        );
        estimatedCost += rowCount * Math.log2(rowCount);
      }
    }

    // Check joins
    if (queryConfig.joinTableId && queryConfig.joinColumn) {
      const joinTbl = tables.find((t) => t.id === queryConfig.joinTableId);
      if (joinTbl) {
        const joinCol = joinTbl.columns.find((c) => c.id === queryConfig.joinColumn);
        const hasJoinIndex = joinTbl.indexes.some(
          (idx) => idx.columns[0] === queryConfig.joinColumn
        );

        if (!hasJoinIndex) {
          warnings.push(
            `Join column "${joinTbl.name}.${joinCol?.name}" has no index. This may cause a nested loop scan.`
          );
          estimatedCost += (joinTbl.estimatedRows || 1000) * estimatedRows;
        } else {
          const idx = joinTbl.indexes.find((i) => i.columns[0] === queryConfig.joinColumn);
          if (idx) usedIndexes.push(`${joinTbl.name}.${idx.name}`);
          estimatedCost += Math.log2(joinTbl.estimatedRows || 1000) * estimatedRows;
        }
      }
    }

    // Apply limit
    if (queryConfig.limit) {
      estimatedRows = Math.min(estimatedRows, queryConfig.limit);
    }

    return {
      estimatedRows,
      estimatedCost: Math.round(estimatedCost),
      scanType,
      usedIndexes,
      warnings,
    };
  }, [queryConfig, selectedTable, tables]);

  // Generate sample SQL
  const sampleSql = useMemo(() => {
    if (!selectedTable) return '';

    const parts: string[] = ['SELECT *'];
    parts.push(`FROM ${selectedTable.name}`);

    if (joinTable && queryConfig.joinColumn) {
      const joinCol = joinTable.columns.find((c) => c.id === queryConfig.joinColumn);
      const fkCol = selectedTable.columns.find(
        (c) => c.foreignKeyRef?.tableId === joinTable.id
      );
      parts.push(
        `JOIN ${joinTable.name} ON ${selectedTable.name}.${fkCol?.name || '?'} = ${joinTable.name}.${joinCol?.name || '?'}`
      );
    }

    if (queryConfig.whereColumns.length > 0) {
      const whereParts = queryConfig.whereColumns.map((colId) => {
        const col = selectedTable.columns.find((c) => c.id === colId);
        if (col?.type === 'jsonb') {
          return `${col.name} @> '{"key": "value"}'`;
        }
        return `${col?.name} = ?`;
      });
      parts.push(`WHERE ${whereParts.join(' AND ')}`);
    }

    if (queryConfig.orderByColumn) {
      const col = selectedTable.columns.find((c) => c.id === queryConfig.orderByColumn);
      parts.push(`ORDER BY ${col?.name}`);
    }

    if (queryConfig.limit) {
      parts.push(`LIMIT ${queryConfig.limit}`);
    }

    return parts.join('\n');
  }, [queryConfig, selectedTable, joinTable]);

  const toggleWhereColumn = (colId: string) => {
    setQueryConfig((prev) => ({
      ...prev,
      whereColumns: prev.whereColumns.includes(colId)
        ? prev.whereColumns.filter((c) => c !== colId)
        : [...prev.whereColumns, colId],
    }));
  };

  if (tables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
          <p>No tables to analyze</p>
          <p className="text-sm mt-1">Create tables in the Tables tab first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Query builder */}
      <div className="w-1/2 border-r border-slate-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Query Configuration</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure a query to estimate its cost
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Table selection */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              <Database size={12} className="inline mr-1" />
              From Table
            </label>
            <select
              value={queryConfig.tableId}
              onChange={(e) =>
                setQueryConfig({
                  ...queryConfig,
                  tableId: e.target.value,
                  whereColumns: [],
                  orderByColumn: null,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                         text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} (~{table.estimatedRows?.toLocaleString() || '1,000'} rows)
                </option>
              ))}
            </select>
          </div>

          {/* WHERE columns */}
          {selectedTable && (
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                <Search size={12} className="inline mr-1" />
                WHERE Columns (click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedTable.columns.map((col) => {
                  const isSelected = queryConfig.whereColumns.includes(col.id);
                  const hasIndex = selectedTable.indexes.some((idx) =>
                    idx.columns.includes(col.id)
                  );

                  return (
                    <button
                      key={col.id}
                      onClick={() => toggleWhereColumn(col.id)}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-colors
                        ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }
                      `}
                    >
                      {col.name}
                      {hasIndex && <Zap size={10} className="text-yellow-400" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <Zap size={10} className="inline text-yellow-400" /> = has index
              </p>
            </div>
          )}

          {/* ORDER BY */}
          {selectedTable && (
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                <Clock size={12} className="inline mr-1" />
                ORDER BY
              </label>
              <select
                value={queryConfig.orderByColumn || ''}
                onChange={(e) =>
                  setQueryConfig({
                    ...queryConfig,
                    orderByColumn: e.target.value || null,
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                           text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">None</option>
                {selectedTable.columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* JOIN */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">JOIN Table</label>
            <select
              value={queryConfig.joinTableId || ''}
              onChange={(e) =>
                setQueryConfig({
                  ...queryConfig,
                  joinTableId: e.target.value || null,
                  joinColumn: null,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                         text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              {tables
                .filter((t) => t.id !== queryConfig.tableId)
                .map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
            </select>

            {joinTable && (
              <div className="mt-2">
                <label className="block text-xs text-slate-400 mb-1">Join Column</label>
                <select
                  value={queryConfig.joinColumn || ''}
                  onChange={(e) =>
                    setQueryConfig({
                      ...queryConfig,
                      joinColumn: e.target.value || null,
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                             text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select column...</option>
                  {joinTable.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* LIMIT */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">LIMIT</label>
            <input
              type="number"
              value={queryConfig.limit || ''}
              onChange={(e) =>
                setQueryConfig({
                  ...queryConfig,
                  limit: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="No limit"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                         text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cost analysis */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        {/* SQL Preview */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Query Preview</h3>
          <pre className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {sampleSql || 'SELECT * FROM ...'}
          </pre>
        </div>

        {/* Cost estimate */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {costEstimate && (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Estimated Rows</div>
                  <div className="text-2xl font-bold text-white">
                    {costEstimate.estimatedRows.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Relative Cost</div>
                  <div className="text-2xl font-bold text-white">
                    {costEstimate.estimatedCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Scan type */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-2">Scan Type</div>
                <div
                  className={`
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                  ${
                    costEstimate.scanType === 'seq_scan'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                  }
                `}
                >
                  {costEstimate.scanType === 'seq_scan' ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {costEstimate.scanType.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              {/* Used indexes */}
              {costEstimate.usedIndexes.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">Used Indexes</div>
                  <div className="space-y-1">
                    {costEstimate.usedIndexes.map((idx, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-green-400"
                      >
                        <CheckCircle2 size={14} />
                        {idx}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {costEstimate.warnings.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-2">
                    <AlertTriangle size={16} />
                    Performance Warnings
                  </div>
                  <ul className="space-y-2">
                    {costEstimate.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-orange-400 mt-1">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {costEstimate.warnings.length === 0 && costEstimate.usedIndexes.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircle2 size={16} />
                    Query looks optimized!
                  </div>
                  <p className="text-sm text-slate-300 mt-2">
                    The query uses appropriate indexes for efficient data access.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
