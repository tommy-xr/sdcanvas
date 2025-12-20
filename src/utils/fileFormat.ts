import type { SystemNode } from '../types/nodes';
import type { SystemEdge } from '../types/edges';
import type { Viewport } from '@xyflow/react';

// Current file format version - increment when making breaking changes
export const CURRENT_FILE_VERSION = '1.0.0';

// Application identifier for file validation
export const APP_IDENTIFIER = 'sdcanvas';

/**
 * Metadata included in exported files
 */
export interface FileMetadata {
  fileName: string;
  nodeCount: number;
  edgeCount: number;
  exportedAt: string;
}

/**
 * The complete file format for sdcanvas exports
 */
export interface SDCanvasFile {
  // Header fields for identification and versioning
  app: typeof APP_IDENTIFIER;
  version: string;

  // The actual canvas data
  nodes: SystemNode[];
  edges: SystemEdge[];

  // Viewport state (pan and zoom)
  viewport?: Viewport;

  // Optional metadata
  metadata: FileMetadata;
}

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'yaml';

/**
 * Result of a file import operation
 */
export interface ImportResult {
  success: boolean;
  data?: {
    nodes: SystemNode[];
    edges: SystemEdge[];
    fileName: string;
    viewport?: Viewport;
  };
  error?: string;
  warnings: string[];
  migratedFrom?: string; // Original version if migration was performed
}

/**
 * Result of file validation
 */
export interface ValidationResult {
  isValid: boolean;
  version?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Create a file object ready for export
 */
export function createExportFile(
  nodes: SystemNode[],
  edges: SystemEdge[],
  fileName: string,
  viewport?: Viewport
): SDCanvasFile {
  return {
    app: APP_IDENTIFIER,
    version: CURRENT_FILE_VERSION,
    nodes,
    edges,
    viewport,
    metadata: {
      fileName,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      exportedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validate basic file structure without parsing version-specific data
 */
export function validateFileStructure(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid file format: not an object'], warnings };
  }

  const file = data as Record<string, unknown>;

  // Check app identifier
  if (file.app !== APP_IDENTIFIER) {
    // Could be an older format without app identifier, or wrong file
    if (!file.app) {
      warnings.push('File missing app identifier - attempting to import as legacy format');
    } else {
      errors.push(`Invalid file: expected app "${APP_IDENTIFIER}", got "${file.app}"`);
    }
  }

  // Check version
  if (!file.version) {
    warnings.push('File missing version - assuming version 1.0.0');
  } else if (typeof file.version !== 'string') {
    errors.push('Invalid version format: expected string');
  }

  // Check required data
  if (!Array.isArray(file.nodes)) {
    errors.push('Invalid file: nodes must be an array');
  }

  if (!Array.isArray(file.edges)) {
    errors.push('Invalid file: edges must be an array');
  }

  return {
    isValid: errors.length === 0,
    version: typeof file.version === 'string' ? file.version : '1.0.0',
    errors,
    warnings,
  };
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Check if a version is supported (not newer than current)
 */
export function isVersionSupported(version: string): boolean {
  return compareVersions(version, CURRENT_FILE_VERSION) <= 0;
}
