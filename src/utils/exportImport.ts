import type { Viewport } from '@xyflow/react';
import type { SystemNode } from '../types/nodes';
import type { SystemEdge } from '../types/edges';
import {
  createExportFile,
  serializeContent,
  loadFromString,
  type ExportFormat,
  type ImportResult,
} from '@sdcanvas/core';

/**
 * Export canvas data to a file and trigger download
 */
export function exportToFile(
  nodes: SystemNode[],
  edges: SystemEdge[],
  fileName: string,
  format: ExportFormat,
  viewport?: Viewport
): void {
  // Cast to core types (compatible structure)
  const fileData = createExportFile(
    nodes as unknown as Parameters<typeof createExportFile>[0],
    edges as unknown as Parameters<typeof createExportFile>[1],
    fileName,
    viewport
  );

  const content = serializeContent(fileData, format);
  const mimeType = format === 'yaml' ? 'application/x-yaml' : 'application/json';
  const extension = format === 'yaml' ? 'yaml' : 'json';

  // Create and trigger download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(fileName)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import canvas data from a file
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  try {
    const content = await file.text();
    const formatHint = (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) ? 'yaml' : 'json';

    // Use core's loadFromString for parsing and validation
    return loadFromString(content, {
      fileName: file.name,
      formatHint,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error reading file',
      warnings: [],
    };
  }
}

/**
 * Sanitize file name for download
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars
    .replace(/\s+/g, '_') // Replace spaces
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim underscores
}

/**
 * Read file as text - utility for file input handling
 */
export function createFileInput(
  accept: string,
  onFile: (file: File) => void
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      onFile(file);
    }
  };
  return input;
}

/**
 * Trigger file selection dialog
 */
export function openFileDialog(onFile: (file: File) => void): void {
  const input = createFileInput('.json,.yaml,.yml', onFile);
  input.click();
}
