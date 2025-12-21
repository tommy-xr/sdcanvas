/**
 * Node behavior models for simulation.
 * Defines latency, resource usage, and scaling behavior for each node type.
 */

import type { SystemNodeType } from '../types/nodes.js';
import type { NodeBehaviorModel, LatencyModel } from '../types/simulation.js';

/**
 * Default behavior models for each node type.
 * Based on typical real-world performance characteristics.
 */
export const NODE_BEHAVIOR_MODELS: Record<SystemNodeType, NodeBehaviorModel> = {
  // User nodes are request sources, not processors
  user: {
    nodeType: 'user',
    latency: { baseMs: 0, varianceMs: 0, p99Multiplier: 1 },
    maxRpsPerInstance: Infinity,
    cpuPerRequest: 0,
    memoryPerRequestMB: 0,
  },

  // Load Balancer: Very fast, low overhead
  loadBalancer: {
    nodeType: 'loadBalancer',
    latency: { baseMs: 1, varianceMs: 2, p99Multiplier: 3 },
    maxRpsPerInstance: 100000,
    cpuPerRequest: 0.0001,
    memoryPerRequestMB: 0.001,
  },

  // CDN: Fast for cache hits, slower for misses
  cdn: {
    nodeType: 'cdn',
    latency: { baseMs: 5, varianceMs: 10, p99Multiplier: 4 },
    maxRpsPerInstance: 50000,
    cpuPerRequest: 0.0001,
    memoryPerRequestMB: 0.01,
  },

  // API Server: Moderate latency, CPU-bound
  apiServer: {
    nodeType: 'apiServer',
    latency: { baseMs: 20, varianceMs: 40, p99Multiplier: 5 },
    maxRpsPerInstance: 1000,
    cpuPerRequest: 0.01,
    memoryPerRequestMB: 0.5,
  },

  // PostgreSQL: Query-dependent, can be slow
  postgresql: {
    nodeType: 'postgresql',
    latency: { baseMs: 10, varianceMs: 50, p99Multiplier: 10 },
    maxRpsPerInstance: 5000,
    cpuPerRequest: 0.02,
    memoryPerRequestMB: 1,
  },

  // Redis: Very fast in-memory operations
  redis: {
    nodeType: 'redis',
    latency: { baseMs: 1, varianceMs: 2, p99Multiplier: 3 },
    maxRpsPerInstance: 100000,
    cpuPerRequest: 0.001,
    memoryPerRequestMB: 0.01,
  },

  // S3: Network-bound, higher latency
  s3Bucket: {
    nodeType: 's3Bucket',
    latency: { baseMs: 50, varianceMs: 100, p99Multiplier: 4 },
    maxRpsPerInstance: 5500, // S3 has per-prefix limits
    cpuPerRequest: 0,
    memoryPerRequestMB: 0,
  },

  // Message Queue: Fast enqueue, decouples processing
  messageQueue: {
    nodeType: 'messageQueue',
    latency: { baseMs: 5, varianceMs: 10, p99Multiplier: 4 },
    maxRpsPerInstance: 10000,
    cpuPerRequest: 0.001,
    memoryPerRequestMB: 0.1,
  },

  // Sticky notes don't participate in simulation
  stickyNote: {
    nodeType: 'stickyNote',
    latency: { baseMs: 0, varianceMs: 0, p99Multiplier: 1 },
    maxRpsPerInstance: Infinity,
    cpuPerRequest: 0,
    memoryPerRequestMB: 0,
  },
};

/**
 * Get the behavior model for a node type
 */
export function getNodeBehavior(nodeType: SystemNodeType): NodeBehaviorModel {
  return NODE_BEHAVIOR_MODELS[nodeType];
}

/**
 * Calculate latency for a request based on the latency model.
 * Uses a simple random distribution around the base latency.
 */
export function calculateLatency(
  model: LatencyModel,
  random: () => number = Math.random
): number {
  const variance = (random() - 0.5) * 2 * model.varianceMs;
  return Math.max(0, model.baseMs + variance);
}

/**
 * Calculate P99 latency from the model
 */
export function calculateP99Latency(model: LatencyModel): number {
  return model.baseMs * model.p99Multiplier;
}

/**
 * Get the number of instances for a node based on its scaling config
 */
export function getInstanceCount(
  scaling: { type: 'single' } | { type: 'fixed'; instances: number } | { type: 'auto' } | undefined
): number {
  if (!scaling || scaling.type === 'single') {
    return 1;
  }
  if (scaling.type === 'fixed') {
    return scaling.instances;
  }
  // For 'auto', start with 1 and let the simulation scale up
  return 1;
}
