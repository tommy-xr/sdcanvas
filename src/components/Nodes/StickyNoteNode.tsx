import type { NodeProps } from '@xyflow/react';
import type { StickyNoteNodeData } from '../../types/nodes';

const colorStyles = {
  yellow: { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900' },
  blue: { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
  green: { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900' },
  pink: { bg: 'bg-pink-200', border: 'border-pink-400', text: 'text-pink-900' },
  purple: { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900' },
};

export function StickyNoteNode({ data, selected }: NodeProps) {
  const nodeData = data as StickyNoteNodeData;
  const colors = colorStyles[nodeData.color] || colorStyles.yellow;

  return (
    <div
      className={`
        min-w-[160px] max-w-[280px] rounded-lg border-2 shadow-lg
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      <div className={`px-4 py-3 ${colors.text}`}>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">
          {nodeData.label || 'Note'}
        </div>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {nodeData.content || 'Click to add notes...'}
        </div>
      </div>
    </div>
  );
}
