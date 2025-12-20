import * as yaml from 'js-yaml';
import type { SystemNode } from './types/nodes.js';
import type { SystemEdge } from './types/edges.js';
import type { Viewport } from './types/base.js';
import {
  validateFileStructure,
  isVersionSupported,
  type ImportResult,
  type SDCanvasFile,
  CURRENT_FILE_VERSION,
} from './fileFormat.js';
import { migrateToCurrentVersion, needsMigration } from './migrations.js';

/**
 * Valid node types for validation
 */
const VALID_NODE_TYPES = [
  'user', 'loadBalancer', 'cdn', 'apiServer', 'postgresql',
  's3Bucket', 'redis', 'messageQueue', 'stickyNote'
];

/**
 * Parse file content based on format hint or content detection
 */
export function parseContent(content: string, formatHint?: 'json' | 'yaml'): unknown {
  if (formatHint === 'yaml') {
    return yaml.load(content);
  }

  if (formatHint === 'json') {
    return JSON.parse(content);
  }

  // Auto-detect: try JSON first, fall back to YAML
  try {
    return JSON.parse(content);
  } catch {
    return yaml.load(content);
  }
}

/**
 * Serialize data to string format
 */
export function serializeContent(data: unknown, format: 'json' | 'yaml'): string {
  if (format === 'yaml') {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true, // Don't use YAML references
      sortKeys: false, // Preserve key order
    });
  }
  return JSON.stringify(data, null, 2);
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

    if (!VALID_NODE_TYPES.includes(node.type)) {
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
 * Load and validate canvas data from string content.
 * This is a headless version that doesn't depend on browser APIs.
 */
export function loadFromString(
  content: string,
  options?: {
    fileName?: string;
    formatHint?: 'json' | 'yaml';
  }
): ImportResult {
  const warnings: string[] = [];
  const fileName = options?.fileName ?? 'untitled';

  try {
    const data = parseContent(content, options?.formatHint);

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
    const edgeValidation = validateEdges(edges, nodeValidation.nodes);

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

    // Extract file name from metadata or use provided name
    const importedFileName = fileData.metadata?.fileName ||
      fileName.replace(/\.(json|yaml|yml)$/i, '');

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
      error: error instanceof Error ? error.message : 'Unknown error parsing content',
      warnings,
    };
  }
}
