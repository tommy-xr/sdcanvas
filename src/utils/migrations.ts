import type { SystemNode } from '../types/nodes';
import type { SystemEdge } from '../types/edges';
import { CURRENT_FILE_VERSION, compareVersions } from './fileFormat';

/**
 * Migration function type - transforms data from one version to the next
 */
type MigrationFn = (data: {
  nodes: SystemNode[];
  edges: SystemEdge[];
  metadata?: Record<string, unknown>;
}) => {
  nodes: SystemNode[];
  edges: SystemEdge[];
  metadata?: Record<string, unknown>;
  warnings: string[];
};

/**
 * Registry of migrations keyed by target version
 * Each migration upgrades data FROM the previous version TO the keyed version
 */
const migrations: Record<string, MigrationFn> = {
  // Example migration for future versions:
  // '1.1.0': (data) => {
  //   // Migrate from 1.0.0 to 1.1.0
  //   const warnings: string[] = [];
  //
  //   // Example: Add new required field with default value
  //   const nodes = data.nodes.map(node => {
  //     if (node.type === 'apiServer' && !('newField' in (node.data as any))) {
  //       warnings.push(`Node "${node.data?.label}" was migrated with default newField value`);
  //       return {
  //         ...node,
  //         data: { ...node.data, newField: 'default' }
  //       };
  //     }
  //     return node;
  //   });
  //
  //   return { ...data, nodes, warnings };
  // },
  //
  // '2.0.0': (data) => {
  //   // Migrate from 1.x.x to 2.0.0
  //   // Major version changes might involve restructuring data
  //   ...
  // },
};

/**
 * Get ordered list of versions that need to be migrated through
 */
function getMigrationPath(fromVersion: string): string[] {
  const versions = Object.keys(migrations).sort(compareVersions);
  return versions.filter(v => compareVersions(v, fromVersion) > 0);
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  success: boolean;
  nodes: SystemNode[];
  edges: SystemEdge[];
  warnings: string[];
  migratedFrom: string;
  migratedTo: string;
  migrationsApplied: string[];
}

/**
 * Run all necessary migrations to bring data from an older version to current
 */
export function migrateToCurrentVersion(
  nodes: SystemNode[],
  edges: SystemEdge[],
  fromVersion: string,
  metadata?: Record<string, unknown>
): MigrationResult {
  const allWarnings: string[] = [];
  const migrationsApplied: string[] = [];

  // If already at current version, no migration needed
  if (compareVersions(fromVersion, CURRENT_FILE_VERSION) >= 0) {
    return {
      success: true,
      nodes,
      edges,
      warnings: [],
      migratedFrom: fromVersion,
      migratedTo: fromVersion,
      migrationsApplied: [],
    };
  }

  // Get the migration path
  const migrationPath = getMigrationPath(fromVersion);

  if (migrationPath.length === 0) {
    // No migrations registered, but version is older
    // This is fine for 1.0.0 -> 1.0.0 or when we haven't added migrations yet
    return {
      success: true,
      nodes,
      edges,
      warnings: [],
      migratedFrom: fromVersion,
      migratedTo: CURRENT_FILE_VERSION,
      migrationsApplied: [],
    };
  }

  // Run each migration in order
  let currentData = { nodes, edges, metadata };

  for (const targetVersion of migrationPath) {
    const migration = migrations[targetVersion];
    if (migration) {
      try {
        const result = migration(currentData);
        currentData = {
          nodes: result.nodes,
          edges: result.edges,
          metadata: result.metadata,
        };
        allWarnings.push(...result.warnings);
        migrationsApplied.push(targetVersion);
      } catch (error) {
        return {
          success: false,
          nodes: currentData.nodes,
          edges: currentData.edges,
          warnings: [
            ...allWarnings,
            `Migration to ${targetVersion} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ],
          migratedFrom: fromVersion,
          migratedTo: migrationsApplied.length > 0
            ? migrationsApplied[migrationsApplied.length - 1]
            : fromVersion,
          migrationsApplied,
        };
      }
    }
  }

  return {
    success: true,
    nodes: currentData.nodes,
    edges: currentData.edges,
    warnings: allWarnings,
    migratedFrom: fromVersion,
    migratedTo: CURRENT_FILE_VERSION,
    migrationsApplied,
  };
}

/**
 * Check if data needs migration
 */
export function needsMigration(version: string): boolean {
  return compareVersions(version, CURRENT_FILE_VERSION) < 0;
}

/**
 * Get human-readable description of what migrations will be applied
 */
export function describeMigrationPath(fromVersion: string): string[] {
  const path = getMigrationPath(fromVersion);
  if (path.length === 0) {
    return [];
  }
  return path.map(v => `Upgrade to v${v}`);
}
