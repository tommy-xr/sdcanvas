// Types
export * from './types/index.js';

// File format
export {
  CURRENT_FILE_VERSION,
  APP_IDENTIFIER,
  createExportFile,
  validateFileStructure,
  compareVersions,
  isVersionSupported,
  type FileMetadata,
  type SDCanvasFile,
  type ExportFormat,
  type ImportResult,
  type ValidationResult,
} from './fileFormat.js';

// Migrations
export {
  migrateToCurrentVersion,
  needsMigration,
  describeMigrationPath,
  type MigrationResult,
} from './migrations.js';

// Loader
export {
  parseContent,
  serializeContent,
  loadFromString,
} from './loader.js';

// Simulation
export {
  runSimulation,
  NODE_BEHAVIOR_MODELS,
  getNodeBehavior,
  calculateLatency,
  calculateP99Latency,
  getInstanceCount,
  analyzeQuery,
  analyzeQueriesForTable,
  estimateCacheHitRate,
  analyzeCacheKey,
  calculateCacheThroughLatency,
  getCacheEffectiveness,
  getCacheSuggestions,
} from './simulation/index.js';
