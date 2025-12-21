/**
 * Simulation module exports
 */

// Engine
export { runSimulation } from './engine.js';

// Node behaviors
export {
  NODE_BEHAVIOR_MODELS,
  getNodeBehavior,
  calculateLatency,
  calculateP99Latency,
  getInstanceCount,
} from './nodeBehaviors.js';

// Query cost analysis
export {
  analyzeQuery,
  analyzeQueriesForTable,
} from './queryCost.js';

// Cache modeling
export {
  estimateCacheHitRate,
  analyzeCacheKey,
  calculateCacheThroughLatency,
  getCacheEffectiveness,
  getCacheSuggestions,
} from './cacheModel.js';
