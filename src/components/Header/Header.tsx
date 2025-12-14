import { useState, useEffect, useRef } from 'react';
import { Layers, Pencil } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export function Header() {
  const { fileName, setFileName } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fileName);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Layers size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">sdcanvas</span>
      </div>

      <div className="w-px h-7 bg-slate-600" />

      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-white
                       focus:outline-none focus:border-blue-500 min-w-[200px]"
          />
        ) : (
          <button
            onClick={() => {
              setEditValue(fileName);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-2 py-1 rounded text-slate-300 hover:text-white
                       hover:bg-slate-700 transition-colors group"
          >
            <span className="text-sm font-medium">{fileName}</span>
            <Pencil size={14} className="text-slate-500 group-hover:text-slate-300" />
          </button>
        )}
      </div>
    </header>
  );
}
