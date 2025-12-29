import type { NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import type { PostgreSQLNodeData } from '../../types/nodes';
import { BaseNode } from './BaseNode';

export function PostgreSQLNode({ id, data, selected }: NodeProps) {
  const nodeData = data as PostgreSQLNodeData;
  const tableCount = nodeData.tables?.length || 0;

  return (
    <BaseNode
      id={id}
      icon={<Database size={18} />}
      label={nodeData.label}
      subtitle="Relational (Postgres, MySQL)"
      color="#336791"
      selected={selected}
    >
      <div className="space-y-1">
        {tableCount > 0 ? (
          <>
            {nodeData.tables.slice(0, 3).map((table) => (
              <div key={table.id} className="flex items-center gap-1">
                <span className="text-slate-400">T</span>
                <span className="truncate">{table.name}</span>
                <span className="text-slate-500 text-[10px]">
                  ({table.columns.length} cols)
                </span>
              </div>
            ))}
            {tableCount > 3 && (
              <div className="text-slate-500 text-[10px]">
                +{tableCount - 3} more table{tableCount - 3 > 1 ? 's' : ''}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 italic">No tables defined</div>
        )}
      </div>
    </BaseNode>
  );
}
