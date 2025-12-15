import { useState, useEffect, useRef } from 'react';
import { Layers, Pencil, Trash2, Github } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export function Header() {
  const { fileName, setFileName, clearCanvas, nodes, edges } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fileName);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasContent = nodes.length > 0 || edges.length > 0;

  const handleClearCanvas = () => {
    clearCanvas();
    setShowClearConfirm(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      setFileName(trimmed);
    } else {
      setEditValue(fileName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(fileName);
      setIsEditing(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Layers size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">sdcanvas</span>
      </div>

      <div className="w-px h-7 bg-gray-200" />

      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900
                       focus:outline-none focus:border-blue-500 min-w-[200px]"
          />
        ) : (
          <button
            onClick={() => {
              setEditValue(fileName);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 hover:text-gray-900
                       hover:bg-gray-100 transition-colors group"
          >
            <span className="text-sm font-medium">{fileName}</span>
            <Pencil size={14} className="text-gray-400 group-hover:text-gray-600" />
          </button>
        )}
      </div>

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={!hasContent}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-gray-500 hover:text-red-500
                     hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:text-gray-500 disabled:hover:bg-transparent"
        >
          <Trash2 size={16} />
          <span className="text-sm">Clear Canvas</span>
        </button>

        {showClearConfirm && (
          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 w-64">
            <p className="text-sm text-gray-700 mb-3">
              Clear all {nodes.length} node{nodes.length !== 1 ? 's' : ''} and {edges.length} connection{edges.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCanvas}
                className="flex-1 px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <a
        href="https://github.com/tommy-xr/sdcanvas"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        title="View on GitHub"
      >
        <Github size={20} />
      </a>
    </header>
  );
}
