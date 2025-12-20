import * as yaml from 'js-yaml';
import type { Viewport } from '@xyflow/react';
import type { SystemNode } from '../types/nodes';
import type { SystemEdge } from '../types/edges';
import {
  createExportFile,
  validateFileStructure,
  isVersionSupported,
  type ExportFormat,
  type ImportResult,
  type SDCanvasFile,
  CURRENT_FILE_VERSION,
} from './fileFormat';
import { migrateToCurrentVersion, needsMigration } from './migrations';

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
  const fileData = createExportFile(nodes, edges, fileName, viewport);
  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === 'yaml') {
    content = yaml.dump(fileData, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true, // Don't use YAML references
      sortKeys: false, // Preserve key order
    });
    mimeType = 'application/x-yaml';
    extension = 'yaml';
  } else {
    content = JSON.stringify(fileData, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  }

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
 * Parse file content based on format
 */
function parseFileContent(content: string, fileName: string): { data: unknown; format: ExportFormat } {
  const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml');

  if (isYaml) {
    return { data: yaml.load(content), format: 'yaml' };
  }

  // Try JSON first, fall back to YAML
  try {
    return { data: JSON.parse(content), format: 'json' };
  } catch {
    // Might be YAML with .json extension (unlikely but handle it)
    try {
      return { data: yaml.load(content), format: 'yaml' };
    } catch {
      throw new Error('Unable to parse file as JSON or YAML');
    }
  }
}

/**
 * Import canvas data from a file
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  const warnings: string[] = [];

  try {
    const content = await file.text();
    const { data } = parseFileContent(content, file.name);

    // Validate basic structure
    const validation = validateFileStructure(data);
    warnings.push(...validation.warnings);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        warnings,
      };
    }

    const fileData = data as SDCanvasFile;
    const version = validation.version || '1.0.0';

    // Check if version is from the future
    if (!isVersionSupported(version)) {
      return {
        success: false,
        error: `File version ${version} is newer than supported version ${CURRENT_FILE_VERSION}. Please update sdcanvas.`,
        warnings,
      };
    }

    // Run migrations if needed
    let nodes = fileData.nodes;
    let edges = fileData.edges;
    let migratedFrom: string | undefined;

    if (needsMigration(version)) {
      const migrationResult = migrateToCurrentVersion(
        fileData.nodes,
        fileData.edges,
        version,
        fileData.metadata as unknown as Record<string, unknown>
      );

      if (!migrationResult.success) {
        return {
          success: false,
          error: 'Migration failed: ' + migrationResult.warnings.join('; '),
          warnings,
        };
      }

      nodes = migrationResult.nodes;
      edges = migrationResult.edges;
      warnings.push(...migrationResult.warnings);

      if (migrationResult.migrationsApplied.length > 0) {
        migratedFrom = version;
        warnings.push(
          `File migrated from v${version} to v${CURRENT_FILE_VERSION}`
        );
      }
    }

    // Validate nodes and edges have required fields
    const nodeValidation = validateNodes(nodes);
    const edgeValidation = validateEdges(edges, nodes);

    warnings.push(...nodeValidation.warnings, ...edgeValidation.warnings);

    if (!nodeValidation.isValid) {
      return {
        success: false,
        error: 'Invalid nodes: ' + nodeValidation.errors.join('; '),
        warnings,
      };
    }

    if (!edgeValidation.isValid) {
      return {
        success: false,
        error: 'Invalid edges: ' + edgeValidation.errors.join('; '),
        warnings,
      };
    }

    // Extract file name from metadata or use file name
    const importedFileName = fileData.metadata?.fileName ||
      file.name.replace(/\.(json|yaml|yml)$/i, '');

    // Validate viewport if present
    const viewport = validateViewport(fileData.viewport);

    return {
      success: true,
      data: {
        nodes: nodeValidation.nodes,
        edges: edgeValidation.edges,
        fileName: importedFileName,
        viewport,
      },
      warnings,
      migratedFrom,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error reading file',
      warnings,
    };
  }
}

/**
 * Validate and clean up nodes
 */
function validateNodes(nodes: unknown[]): {
  isValid: boolean;
  nodes: SystemNode[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validNodes: SystemNode[] = [];

  const validNodeTypes = [
    'user', 'loadBalancer', 'cdn', 'apiServer', 'postgresql',
    's3Bucket', 'redis', 'messageQueue', 'stickyNote'
  ];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;

    if (!node || typeof node !== 'object') {
      errors.push(`Node at index ${i} is not an object`);
      continue;
    }

    if (!node.id || typeof node.id !== 'string') {
      errors.push(`Node at index ${i} missing valid id`);
      continue;
    }

    if (!node.type || typeof node.type !== 'string') {
      errors.push(`Node "${node.id}" missing type`);
      continue;
    }

    if (!validNodeTypes.includes(node.type)) {
      warnings.push(`Node "${node.id}" has unknown type "${node.type}" - will import anyway`);
    }

    if (!node.position || typeof node.position !== 'object') {
      errors.push(`Node "${node.id}" missing position`);
      continue;
    }

    if (!node.data || typeof node.data !== 'object') {
      errors.push(`Node "${node.id}" missing data`);
      continue;
    }

    validNodes.push(node as unknown as SystemNode);
  }

  return {
    isValid: errors.length === 0,
    nodes: validNodes,
    errors,
    warnings,
  };
}

/**
 * Validate and clean up edges
 */
function validateEdges(edges: unknown[], nodes: SystemNode[]): {
  isValid: boolean;
  edges: SystemEdge[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validEdges: SystemEdge[] = [];

  const nodeIds = new Set(nodes.map(n => n.id));

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i] as Record<string, unknown>;

    if (!edge || typeof edge !== 'object') {
      errors.push(`Edge at index ${i} is not an object`);
      continue;
    }

    if (!edge.id || typeof edge.id !== 'string') {
      errors.push(`Edge at index ${i} missing valid id`);
      continue;
    }

    if (!edge.source || typeof edge.source !== 'string') {
      errors.push(`Edge "${edge.id}" missing source`);
      continue;
    }

    if (!edge.target || typeof edge.target !== 'string') {
      errors.push(`Edge "${edge.id}" missing target`);
      continue;
    }

    // Check if source and target nodes exist
    if (!nodeIds.has(edge.source)) {
      warnings.push(`Edge "${edge.id}" references missing source node "${edge.source}" - skipping`);
      continue;
    }

    if (!nodeIds.has(edge.target)) {
      warnings.push(`Edge "${edge.id}" references missing target node "${edge.target}" - skipping`);
      continue;
    }

    validEdges.push(edge as unknown as SystemEdge);
  }

  return {
    isValid: true, // Edges are non-critical, we can skip invalid ones
    edges: validEdges,
    errors,
    warnings,
  };
}

/**
 * Validate viewport data
 */
function validateViewport(viewport: unknown): Viewport | undefined {
  if (!viewport || typeof viewport !== 'object') {
    return undefined;
  }

  const v = viewport as Record<string, unknown>;

  if (
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.zoom === 'number' &&
    isFinite(v.x) &&
    isFinite(v.y) &&
    isFinite(v.zoom) &&
    v.zoom > 0
  ) {
    return { x: v.x, y: v.y, zoom: v.zoom };
  }

  return undefined;
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
