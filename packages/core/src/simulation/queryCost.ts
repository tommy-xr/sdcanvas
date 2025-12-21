/**
 * Query cost analysis for database operations.
 * Analyzes queries to detect missing indexes and estimate query costs.
 */

import type {
  LinkedQuery,
  DatabaseTable,
  DatabaseIndex,
} from '../types/nodes.js';
import type {
  QueryAnalysis,
  QueryWarning,
  ScanType,
} from '../types/simulation.js';

/**
 * Cost model constants (milliseconds per 1K rows)
 */
const COST_PER_1K_ROWS = {
  seq_scan: 10, // Full table scan
  index_scan: 0.1, // B-tree lookup + row fetch
  index_only_scan: 0.05, // B-tree only, no heap access
} as const;

/**
 * Threshold for "large table" warnings
 */
const LARGE_TABLE_THRESHOLD = 100000;

/**
 * Check if an index covers the given columns
 */
function indexCoversColumns(
  index: DatabaseIndex,
  columns: string[],
  table: DatabaseTable
): 'full' | 'partial' | 'none' {
  if (columns.length === 0) {
    return 'none';
  }

  // Get column names from IDs
  const columnNames = columns.map((colId) => {
    const col = table.columns.find((c) => c.id === colId);
    return col?.name;
  }).filter((name): name is string => name !== undefined);

  // Check if index columns cover query columns
  // For a B-tree index, the leftmost columns must match
  const indexColumnNames = index.columns.map((colId) => {
    const col = table.columns.find((c) => c.id === colId);
    return col?.name;
  }).filter((name): name is string => name !== undefined);

  let matchedCount = 0;
  for (let i = 0; i < columnNames.length && i < indexColumnNames.length; i++) {
    if (indexColumnNames[i] === columnNames[i]) {
      matchedCount++;
    } else {
      break; // B-tree requires prefix match
    }
  }

  if (matchedCount === 0) {
    return 'none';
  }
  if (matchedCount === columnNames.length) {
    return 'full';
  }
  return 'partial';
}

/**
 * Check if an index is a covering index (includes all selected columns)
 */
function isCoveringIndex(
  index: DatabaseIndex,
  selectColumns: string[],
  whereColumns: string[],
  table: DatabaseTable
): boolean {
  if (!selectColumns.length) {
    return false;
  }

  // Get all column IDs in the index (main columns + include columns)
  const indexColumnIds = new Set([
    ...index.columns,
    ...(index.includeColumns || []),
  ]);

  // Check if all select columns are covered
  const allSelectCovered = selectColumns.every((colId) =>
    indexColumnIds.has(colId)
  );

  // Check if where columns are covered by the main index columns
  const whereCovered = indexCoversColumns(index, whereColumns, table);

  return allSelectCovered && whereCovered === 'full';
}

/**
 * Find the best index for a query
 */
function findBestIndex(
  query: LinkedQuery,
  table: DatabaseTable
): { index: DatabaseIndex | null; coverage: 'full' | 'partial' | 'none'; isCovering: boolean } {
  const whereColumns = query.whereColumns || [];
  const selectColumns = query.selectColumns || [];

  if (whereColumns.length === 0) {
    // No WHERE clause - will be a seq_scan
    return { index: null, coverage: 'none', isCovering: false };
  }

  let bestIndex: DatabaseIndex | null = null;
  let bestCoverage: 'full' | 'partial' | 'none' = 'none';
  let bestIsCovering = false;

  for (const index of table.indexes) {
    const coverage = indexCoversColumns(index, whereColumns, table);
    const covering = isCoveringIndex(index, selectColumns, whereColumns, table);

    // Prefer covering indexes, then full coverage, then partial
    if (coverage !== 'none') {
      const isBetter =
        (covering && !bestIsCovering) ||
        (coverage === 'full' && bestCoverage !== 'full') ||
        (coverage === 'partial' && bestCoverage === 'none');

      if (isBetter || bestIndex === null) {
        bestIndex = index;
        bestCoverage = coverage;
        bestIsCovering = covering;
      }
    }
  }

  return { index: bestIndex, coverage: bestCoverage, isCovering: bestIsCovering };
}

/**
 * Generate index suggestion for missing index
 */
function generateIndexSuggestion(
  query: LinkedQuery,
  table: DatabaseTable
): string {
  const whereColumns = query.whereColumns || [];
  const selectColumns = query.selectColumns || [];

  if (whereColumns.length === 0) {
    return '';
  }

  // Get column names
  const whereColNames = whereColumns
    .map((colId) => table.columns.find((c) => c.id === colId)?.name)
    .filter((name): name is string => name !== undefined);

  if (whereColNames.length === 0) {
    return '';
  }

  const indexName = `idx_${table.name}_${whereColNames.join('_')}`;
  let suggestion = `CREATE INDEX ${indexName} ON ${table.name}(${whereColNames.join(', ')})`;

  // Suggest INCLUDE clause for covering index if there are select columns
  const selectColNames = selectColumns
    .filter((colId) => !whereColumns.includes(colId))
    .map((colId) => table.columns.find((c) => c.id === colId)?.name)
    .filter((name): name is string => name !== undefined);

  if (selectColNames.length > 0) {
    suggestion += ` INCLUDE (${selectColNames.join(', ')})`;
  }

  return suggestion;
}

/**
 * Estimate query cost in milliseconds
 */
function estimateCost(
  scanType: ScanType,
  estimatedRows: number
): number {
  const rowsIn1K = estimatedRows / 1000;

  if (scanType === 'seq_scan') {
    return COST_PER_1K_ROWS.seq_scan * rowsIn1K;
  }
  if (scanType === 'index_only_scan') {
    // Log(N) for B-tree traversal
    const logFactor = Math.max(1, Math.log2(estimatedRows));
    return COST_PER_1K_ROWS.index_only_scan * logFactor;
  }
  // index_scan
  const logFactor = Math.max(1, Math.log2(estimatedRows));
  return COST_PER_1K_ROWS.index_scan * logFactor;
}

/**
 * Analyze a query and return cost estimates and warnings
 */
export function analyzeQuery(
  query: LinkedQuery,
  table: DatabaseTable
): QueryAnalysis {
  const estimatedRows = table.estimatedRows || 1000;
  const warnings: QueryWarning[] = [];

  // Find the best index for this query
  const { index, coverage, isCovering } = findBestIndex(query, table);

  let scanType: ScanType;
  let usedIndex: string | undefined;

  if (index === null || coverage === 'none') {
    // No usable index - sequential scan
    scanType = 'seq_scan';

    // Add warning for seq_scan on large table
    if (estimatedRows >= LARGE_TABLE_THRESHOLD && query.whereColumns?.length) {
      const suggestion = generateIndexSuggestion(query, table);
      warnings.push({
        type: 'seq_scan_large_table',
        message: `Sequential scan on ${table.name} with ${estimatedRows.toLocaleString()} rows`,
        suggestion: suggestion || 'Consider adding an index on frequently queried columns',
      });
    }

    // Add missing index warning
    if (query.whereColumns?.length) {
      const suggestion = generateIndexSuggestion(query, table);
      if (suggestion) {
        warnings.push({
          type: 'missing_index',
          message: `No index found for WHERE clause columns`,
          suggestion,
        });
      }
    }
  } else if (isCovering) {
    // Covering index - index-only scan
    scanType = 'index_only_scan';
    usedIndex = index.name;
  } else if (coverage === 'partial') {
    // Partial index match - still uses index but less efficiently
    scanType = 'index_scan';
    usedIndex = index.name;

    warnings.push({
      type: 'partial_index_match',
      message: `Index ${index.name} only partially matches query`,
      suggestion: generateIndexSuggestion(query, table),
    });
  } else {
    // Full index coverage
    scanType = 'index_scan';
    usedIndex = index.name;
  }

  const estimatedCostMs = estimateCost(scanType, estimatedRows);

  return {
    queryId: query.id,
    scanType,
    estimatedRowsScanned: scanType === 'seq_scan' ? estimatedRows : Math.max(1, Math.log2(estimatedRows) * 10),
    estimatedCostMs,
    usedIndex,
    warnings,
  };
}

/**
 * Analyze all queries for a table
 */
export function analyzeQueriesForTable(
  queries: LinkedQuery[],
  table: DatabaseTable
): QueryAnalysis[] {
  return queries
    .filter((q) => q.targetTableId === table.id)
    .map((q) => analyzeQuery(q, table));
}
