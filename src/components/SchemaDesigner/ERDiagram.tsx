import { useMemo, useState, useCallback, useRef } from 'react';
import { Key, Link2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { DatabaseTable, DatabaseColumn } from '../../types/nodes';

interface ERDiagramProps {
  tables: DatabaseTable[];
}

interface TablePosition {
  x: number;
  y: number;
}

interface Relationship {
  fromTable: DatabaseTable;
  fromColumn: DatabaseColumn;
  toTable: DatabaseTable;
  toColumn: DatabaseColumn;
}

export function ERDiagram({ tables }: ERDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate table positions in a grid layout
  const tablePositions = useMemo((): Map<string, TablePosition> => {
    const positions = new Map<string, TablePosition>();
    const cols = Math.ceil(Math.sqrt(tables.length));
    const tableWidth = 220;
    const tableHeight = 200;
    const padding = 80;

    tables.forEach((table, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(table.id, {
        x: col * (tableWidth + padding) + 50,
        y: row * (tableHeight + padding) + 50,
      });
    });

    return positions;
  }, [tables]);

  // Find all relationships (foreign keys)
  const relationships = useMemo((): Relationship[] => {
    const rels: Relationship[] = [];

    tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.isForeignKey && column.foreignKeyRef) {
          const targetTable = tables.find(
            (t) => t.id === column.foreignKeyRef?.tableId
          );
          const targetColumn = targetTable?.columns.find(
            (c) => c.id === column.foreignKeyRef?.columnId
          );

          if (targetTable && targetColumn) {
            rels.push({
              fromTable: table,
              fromColumn: column,
              toTable: targetTable,
              toColumn: targetColumn,
            });
          }
        }
      });
    });

    return rels;
  }, [tables]);

  // Mouse handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.25, Math.min(2, z + delta)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (tables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Link2 size={48} className="mx-auto mb-3 opacity-50" />
          <p>No tables to display</p>
          <p className="text-sm mt-1">Create tables in the Tables tab first</p>
        </div>
      </div>
    );
  }

  const tableWidth = 200;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {tables.length} table{tables.length !== 1 ? 's' : ''},{' '}
            {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} className="text-gray-700" />
          </button>
          <span className="text-sm text-gray-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} className="text-gray-700" />
          </button>
          <button
            onClick={resetView}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Reset View"
          >
            <Maximize2 size={16} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Diagram area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
            </marker>
          </defs>

          {/* Relationship lines */}
          {relationships.map((rel, i) => {
            const fromPos = tablePositions.get(rel.fromTable.id)!;
            const toPos = tablePositions.get(rel.toTable.id)!;

            const fromColIndex = rel.fromTable.columns.findIndex(
              (c) => c.id === rel.fromColumn.id
            );
            const toColIndex = rel.toTable.columns.findIndex(
              (c) => c.id === rel.toColumn.id
            );

            // Calculate connection points
            const fromX = fromPos.x + tableWidth;
            const fromY = fromPos.y + 40 + fromColIndex * 24 + 12;
            const toX = toPos.x;
            const toY = toPos.y + 40 + toColIndex * 24 + 12;

            // Create a curved path
            const midX = (fromX + toX) / 2;

            return (
              <g key={i}>
                <path
                  d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {/* Cardinality labels */}
                <text
                  x={fromX + 10}
                  y={fromY - 8}
                  fill="#94a3b8"
                  fontSize="10"
                >
                  1
                </text>
                <text
                  x={toX - 15}
                  y={toY - 8}
                  fill="#94a3b8"
                  fontSize="10"
                >
                  n
                </text>
              </g>
            );
          })}

          {/* Tables */}
          {tables.map((table) => {
            const pos = tablePositions.get(table.id)!;
            const tableHeight = 40 + table.columns.length * 24 + 8;

            return (
              <g key={table.id} transform={`translate(${pos.x}, ${pos.y})`}>
                {/* Table background */}
                <rect
                  width={tableWidth}
                  height={tableHeight}
                  rx="8"
                  fill="#ffffff"
                  stroke="#e5e5e5"
                  strokeWidth="2"
                />

                {/* Table header */}
                <rect
                  width={tableWidth}
                  height="36"
                  rx="8"
                  fill="#336791"
                />
                <rect
                  y="28"
                  width={tableWidth}
                  height="8"
                  fill="#336791"
                />
                <text
                  x={tableWidth / 2}
                  y="24"
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="600"
                >
                  {table.name}
                </text>

                {/* Columns */}
                {table.columns.map((column, colIndex) => {
                  const y = 40 + colIndex * 24;
                  const isPK = column.isPrimaryKey;
                  const isFK = column.isForeignKey;

                  return (
                    <g key={column.id} transform={`translate(0, ${y})`}>
                      {/* Column row */}
                      <rect
                        x="4"
                        y="2"
                        width={tableWidth - 8}
                        height="20"
                        rx="4"
                        fill={isPK ? '#1e40af20' : 'transparent'}
                      />

                      {/* Icons */}
                      {isPK && (
                        <g transform="translate(10, 6)">
                          <Key size={12} className="text-yellow-500" />
                        </g>
                      )}
                      {isFK && !isPK && (
                        <g transform="translate(10, 6)">
                          <Link2 size={12} className="text-blue-400" />
                        </g>
                      )}

                      {/* Column name */}
                      <text
                        x={isPK || isFK ? 28 : 12}
                        y="16"
                        fill={isPK ? '#ca8a04' : isFK ? '#2563eb' : '#374151'}
                        fontSize="11"
                        fontWeight={isPK ? '600' : '400'}
                      >
                        {column.name}
                      </text>

                      {/* Column type */}
                      <text
                        x={tableWidth - 12}
                        y="16"
                        textAnchor="end"
                        fill="#6b7280"
                        fontSize="10"
                      >
                        {column.type}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-200 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Key size={12} className="text-yellow-500" />
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-2">
          <Link2 size={12} className="text-blue-400" />
          <span>Foreign Key</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-400"></div>
          <span>Relationship</span>
        </div>
      </div>
    </div>
  );
}
