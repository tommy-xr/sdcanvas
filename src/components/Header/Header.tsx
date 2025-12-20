import { useState, useEffect, useRef } from 'react';
import { Layers, Pencil, Trash2, Github, Download, Upload, FileJson, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { Viewport } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { exportToFile, importFromFile, openFileDialog } from '../../utils/exportImport';
import type { ExportFormat } from '../../utils/fileFormat';

export function Header() {
  const { fileName, setFileName, clearCanvas, setNodes, setEdges, nodes, edges } = useCanvasStore();
  const { getViewport, setViewport } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fileName);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    fileName?: string;
    nodeCount?: number;
    edgeCount?: number;
    warnings: string[];
    error?: string;
    migratedFrom?: string;
    pendingData?: { nodes: typeof nodes; edges: typeof edges; fileName: string; viewport?: Viewport };
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const hasContent = nodes.length > 0 || edges.length > 0;

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleExport = (format: ExportFormat) => {
    const viewport = getViewport();
    exportToFile(nodes, edges, fileName, format, viewport);
    setShowExportMenu(false);
  };

  const handleImportClick = () => {
    openFileDialog(async (file) => {
      const result = await importFromFile(file);
      if (result.success && result.data) {
        setImportResult({
          success: true,
          fileName: result.data.fileName,
          nodeCount: result.data.nodes.length,
          edgeCount: result.data.edges.length,
          warnings: result.warnings,
          migratedFrom: result.migratedFrom,
          pendingData: {
            nodes: result.data.nodes,
            edges: result.data.edges,
            fileName: result.data.fileName,
            viewport: result.data.viewport,
          },
        });
        setShowImportConfirm(true);
      } else {
        setImportResult({
          success: false,
          error: result.error,
          warnings: result.warnings,
        });
        setShowImportConfirm(true);
      }
    });
  };

  const handleImportConfirm = () => {
    if (importResult?.pendingData) {
      setNodes(importResult.pendingData.nodes);
      setEdges(importResult.pendingData.edges);
      setFileName(importResult.pendingData.fileName);
      if (importResult.pendingData.viewport) {
        setViewport(importResult.pendingData.viewport);
      }
    }
    setShowImportConfirm(false);
    setImportResult(null);
  };

  const handleImportCancel = () => {
    setShowImportConfirm(false);
    setImportResult(null);
  };

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

      {/* Import Button */}
      <button
        onClick={handleImportClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-gray-500 hover:text-blue-600
                   hover:bg-gray-100 transition-colors"
        title="Import from file"
      >
        <Upload size={16} />
        <span className="text-sm">Import</span>
      </button>

      {/* Export Button with dropdown */}
      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={!hasContent}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-gray-500 hover:text-blue-600
                     hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:text-gray-500 disabled:hover:bg-transparent"
          title="Export to file"
        >
          <Download size={16} />
          <span className="text-sm">Export</span>
        </button>

        {showExportMenu && (
          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 w-40">
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileJson size={16} className="text-blue-500" />
              Export as JSON
            </button>
            <button
              onClick={() => handleExport('yaml')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText size={16} className="text-purple-500" />
              Export as YAML
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-7 bg-gray-200" />

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

      {/* Import Confirmation Modal */}
      {showImportConfirm && importResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-96 max-w-[90vw]">
            {importResult.success ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={24} className="text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Import Ready</h3>
                </div>
                <div className="mb-4 text-sm text-gray-600">
                  <p className="mb-2">
                    <strong>{importResult.fileName}</strong>
                  </p>
                  <p>
                    {importResult.nodeCount} node{importResult.nodeCount !== 1 ? 's' : ''},{' '}
                    {importResult.edgeCount} connection{importResult.edgeCount !== 1 ? 's' : ''}
                  </p>
                  {importResult.migratedFrom && (
                    <p className="mt-2 text-blue-600">
                      File migrated from v{importResult.migratedFrom}
                    </p>
                  )}
                </div>
                {importResult.warnings.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="flex items-center gap-2 text-yellow-700 font-medium mb-1">
                      <AlertTriangle size={14} />
                      Warnings
                    </div>
                    <ul className="text-yellow-600 list-disc list-inside">
                      {importResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasContent && (
                  <p className="mb-4 text-sm text-orange-600">
                    This will replace your current canvas with {nodes.length} node{nodes.length !== 1 ? 's' : ''}.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleImportCancel}
                    className="flex-1 px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    className="flex-1 px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Import
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={24} className="text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Import Failed</h3>
                </div>
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {importResult.error}
                </div>
                {importResult.warnings.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="flex items-center gap-2 text-yellow-700 font-medium mb-1">
                      <AlertTriangle size={14} />
                      Additional Info
                    </div>
                    <ul className="text-yellow-600 list-disc list-inside">
                      {importResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={handleImportCancel}
                  className="w-full px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
