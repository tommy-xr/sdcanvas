/**
 * Cache behavior modeling for simulation.
 * Models cache-through patterns and estimates hit rates.
 */

import type { RedisKey } from '../types/nodes.js';
import type { CacheAnalysis } from '../types/simulation.js';

/**
 * Estimate cache hit rate based on TTL, cardinality, and request rate.
 *
 * Logic:
 * - Average time between requests for same key = cardinality / rps
 * - If this time >= TTL, the key expires before next request (always miss)
 * - Otherwise, first request misses, subsequent requests hit until TTL
 * - Hit rate = (requests_per_key_per_ttl - 1) / requests_per_key_per_ttl
 */
export function estimateCacheHitRate(
  ttlSeconds: number,
  cardinality: number,
  rps: number
): number {
  if (ttlSeconds <= 0 || cardinality <= 0 || rps <= 0) {
    return 0;
  }

  // Average time between requests for the same key
  const avgTimeBetweenRequests = cardinality / rps;

  if (avgTimeBetweenRequests >= ttlSeconds) {
    // Key expires before next request - always miss
    return 0;
  }

  // Number of requests for the same key within TTL window
  const requestsPerKeyPerTtl = ttlSeconds / avgTimeBetweenRequests;

  // First request always misses, subsequent requests hit until TTL
  const hitRate = (requestsPerKeyPerTtl - 1) / requestsPerKeyPerTtl;

  return Math.max(0, Math.min(1, hitRate));
}

/**
 * Analyze cache effectiveness for a Redis key pattern
 */
export function analyzeCacheKey(
  key: RedisKey,
  rps: number
): CacheAnalysis {
  const ttlSeconds = key.ttl || 0;
  const cardinality = key.estimatedCardinality || 1;

  const estimatedHitRate = estimateCacheHitRate(ttlSeconds, cardinality, rps);
  const effectiveDbRps = rps * (1 - estimatedHitRate);

  return {
    keyPattern: key.pattern,
    ttlSeconds,
    cardinality,
    requestsPerSecond: rps,
    estimatedHitRate,
    effectiveDbRps,
  };
}

/**
 * Calculate effective latency for a cache-through pattern.
 * Returns weighted average of cache hit and miss latencies.
 */
export function calculateCacheThroughLatency(
  hitRate: number,
  cacheLatencyMs: number,
  dbLatencyMs: number
): number {
  // Cache hit: only cache latency
  // Cache miss: cache latency + db latency
  const hitLatency = cacheLatencyMs;
  const missLatency = cacheLatencyMs + dbLatencyMs;

  return hitRate * hitLatency + (1 - hitRate) * missLatency;
}

/**
 * Determine cache effectiveness category for reporting
 */
export function getCacheEffectiveness(
  hitRate: number
): 'hot' | 'warm' | 'cold' | 'ineffective' {
  if (hitRate >= 0.95) {
    return 'hot';
  }
  if (hitRate >= 0.50) {
    return 'warm';
  }
  if (hitRate >= 0.10) {
    return 'cold';
  }
  return 'ineffective';
}

/**
 * Generate cache optimization suggestions
 */
export function getCacheSuggestions(
  analysis: CacheAnalysis
): string[] {
  const suggestions: string[] = [];
  const effectiveness = getCacheEffectiveness(analysis.estimatedHitRate);

  if (effectiveness === 'ineffective') {
    if (analysis.ttlSeconds < 60) {
      suggestions.push(
        `Consider increasing TTL from ${analysis.ttlSeconds}s - current TTL is too short for the request pattern`
      );
    }
    if (analysis.cardinality > 100000) {
      suggestions.push(
        `High cardinality (${analysis.cardinality.toLocaleString()} keys) with low RPS leads to poor cache efficiency`
      );
    }
    suggestions.push(
      `Cache is ineffective (${(analysis.estimatedHitRate * 100).toFixed(1)}% hit rate) - DB sees ${analysis.effectiveDbRps.toFixed(0)} RPS`
    );
  } else if (effectiveness === 'cold') {
    suggestions.push(
      `Cache is cold (${(analysis.estimatedHitRate * 100).toFixed(1)}% hit rate) - consider increasing TTL or reducing cardinality`
    );
  }

  return suggestions;
}
