/**
 * Simulation types for the sdcanvas simulation engine.
 * These types define the configuration, metrics, and results
 * for running headless simulations of system designs.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for a simulation run
 */
export interface SimulationConfig {
  /** How long to simulate in seconds */
  durationSeconds: number;
  /** Incoming requests per second at entry points */
  requestsPerSecond: number;
  /** For reproducible randomization */
  seed?: number;
}

// ============================================================================
// Resource Models
// ============================================================================

/**
 * CPU resource state
 */
export interface CPUResources {
  cores: number;
  utilizationPercent: number;
}

/**
 * Memory resource state
 */
export interface MemoryResources {
  totalMB: number;
  usedMB: number;
}

/**
 * Network resource state
 */
export interface NetworkResources {
  bandwidthMbps: number;
  usedMbps: number;
}

/**
 * Per-node resource model
 */
export interface NodeResources {
  cpu: CPUResources;
  memory: MemoryResources;
  network: NetworkResources;
}

// ============================================================================
// Node Metrics
// ============================================================================

/**
 * Per-node metrics collected during simulation
 */
export interface NodeMetrics {
  nodeId: string;
  requestsReceived: number;
  requestsProcessed: number;
  requestsQueued: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  peakRPS: number;
  resources: NodeResources;
  errors: number;
}

// ============================================================================
// Edge Metrics
// ============================================================================

/**
 * Edge/connection metrics collected during simulation
 */
export interface EdgeMetrics {
  edgeId: string;
  requestCount: number;
  totalBytesTransferred: number;
  avgLatencyMs: number;
}

// ============================================================================
// Bottleneck Detection
// ============================================================================

export type BottleneckType =
  | 'cpu_overload'
  | 'memory_exhaustion'
  | 'network_saturation'
  | 'queue_buildup'
  | 'connection_limit'
  | 'high_latency';

/**
 * Information about a detected bottleneck
 */
export interface BottleneckInfo {
  nodeId: string;
  type: BottleneckType;
  severity: 'warning' | 'critical';
  message: string;
  suggestion: string;
}

// ============================================================================
// Timeline (for replay/graphing)
// ============================================================================

/**
 * Snapshot of node metrics at a point in time
 */
export interface NodeMetricsSnapshot {
  rps: number;
  latencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
  errorRate: number;
}

/**
 * Snapshot of the entire simulation at a point in time
 */
export interface TimelineSnapshot {
  timestamp: number;
  nodeMetrics: Record<string, NodeMetricsSnapshot>;
}

// ============================================================================
// Entry Point (User Node) Metrics
// ============================================================================

/**
 * Round-trip metrics for entry point (user/client) nodes
 */
export interface EntryPointMetrics {
  nodeId: string;
  /** Total requests sent from this entry point */
  totalRequests: number;
  /** Successful responses received */
  successfulResponses: number;
  /** Failed requests (errors/timeouts) */
  failedRequests: number;
  /** Average round-trip time in milliseconds */
  avgRoundTripMs: number;
  /** P99 round-trip time in milliseconds */
  p99RoundTripMs: number;
  /** Success rate (0-1) */
  successRate: number;
  /** All RTT samples for percentile calculation */
  rttSamples: number[];
}

// ============================================================================
// Simulation Result
// ============================================================================

/**
 * Overall simulation result
 */
export interface SimulationResult {
  config: SimulationConfig;
  /** Actual duration in seconds */
  duration: number;
  totalRequests: number;
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
  /** Round-trip metrics per entry point (user node) */
  entryPointMetrics: Record<string, EntryPointMetrics>;
  bottlenecks: BottleneckInfo[];
  timeline: TimelineSnapshot[];
}

// ============================================================================
// Query Cost Analysis (extends LinkedQuery)
// ============================================================================

export type ScanType = 'seq_scan' | 'index_scan' | 'index_only_scan';

export type QueryWarningType =
  | 'missing_index'
  | 'partial_index_match'
  | 'seq_scan_large_table';

/**
 * Warning about a query that may have performance issues
 */
export interface QueryWarning {
  type: QueryWarningType;
  message: string;
  /** e.g., "CREATE INDEX idx_users_email ON users(email)" */
  suggestion: string;
}

/**
 * Analysis result for a database query
 */
export interface QueryAnalysis {
  queryId: string;
  scanType: ScanType;
  estimatedRowsScanned: number;
  estimatedCostMs: number;
  usedIndex?: string;
  warnings: QueryWarning[];
}

// ============================================================================
// Cache Analysis
// ============================================================================

/**
 * Analysis of cache effectiveness
 */
export interface CacheAnalysis {
  keyPattern: string;
  ttlSeconds: number;
  cardinality: number;
  requestsPerSecond: number;
  /** Estimated hit rate between 0.0 and 1.0 */
  estimatedHitRate: number;
  /** RPS that actually hits the database */
  effectiveDbRps: number;
}

// ============================================================================
// Node Behavior Models
// ============================================================================

/**
 * Latency distribution parameters
 */
export interface LatencyModel {
  /** Base latency in milliseconds */
  baseMs: number;
  /** Additional random variance in milliseconds */
  varianceMs: number;
  /** P99 latency multiplier */
  p99Multiplier: number;
}

/**
 * Behavior model for a specific node type
 */
export interface NodeBehaviorModel {
  nodeType: string;
  latency: LatencyModel;
  /** Maximum requests per second per instance */
  maxRpsPerInstance: number;
  /** CPU usage per request (0-1 scale, where 1 = 100% of one core) */
  cpuPerRequest: number;
  /** Memory usage per request in MB */
  memoryPerRequestMB: number;
}
