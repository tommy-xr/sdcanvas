/**
 * Simulation engine for running headless simulations of system designs.
 */

import type {
  SystemNode,
  SystemNodeType,
  APIServerNodeData,
  PostgreSQLNodeData,
  RedisNodeData,
  LoadBalancerNodeData,
} from '../types/nodes.js';
import type { SystemEdge } from '../types/edges.js';
import type {
  SimulationConfig,
  SimulationResult,
  NodeMetrics,
  EdgeMetrics,
  BottleneckInfo,
  TimelineSnapshot,
  NodeMetricsSnapshot,
  QueryAnalysis,
  CacheAnalysis,
  EntryPointMetrics,
} from '../types/simulation.js';
import {
  getNodeBehavior,
  calculateLatency,
  getInstanceCount,
} from './nodeBehaviors.js';
import { analyzeQuery } from './queryCost.js';
import { analyzeCacheKey } from './cacheModel.js';

/**
 * Simple seeded random number generator
 */
function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Runtime state for a node during simulation
 */
interface NodeState {
  nodeId: string;
  nodeType: SystemNodeType;
  instances: number;
  requestsReceived: number;
  requestsProcessed: number;
  totalLatencyMs: number;
  latencies: number[];
  peakRps: number;
  currentRps: number;
  errors: number;
  // Resource tracking per second (reset each tick)
  rpsThisSecond: number;
  // Capacity
  maxMemoryMB: number;
  maxRpsPerInstance: number;
}

/**
 * Runtime state for an edge during simulation
 */
interface EdgeState {
  edgeId: string;
  requestCount: number;
  totalBytesTransferred: number;
  totalLatencyMs: number;
}

/**
 * Runtime state for an entry point (user node) during simulation
 */
interface EntryPointState {
  nodeId: string;
  totalRequests: number;
  successfulResponses: number;
  failedRequests: number;
  totalRttMs: number;
  rttSamples: number[];
}

/**
 * Graph structure for routing
 */
interface SimulationGraph {
  nodes: Map<string, SystemNode>;
  edges: Map<string, SystemEdge>;
  outgoingEdges: Map<string, SystemEdge[]>;
  incomingEdges: Map<string, SystemEdge[]>;
}

/**
 * Build a graph structure from nodes and edges
 */
function buildGraph(
  nodes: SystemNode[],
  edges: SystemEdge[]
): SimulationGraph {
  const nodeMap = new Map<string, SystemNode>();
  const edgeMap = new Map<string, SystemEdge>();
  const outgoing = new Map<string, SystemEdge[]>();
  const incoming = new Map<string, SystemEdge[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    edgeMap.set(edge.id, edge);
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  }

  return { nodes: nodeMap, edges: edgeMap, outgoingEdges: outgoing, incomingEdges: incoming };
}

/**
 * Find entry point nodes (only 'user' nodes generate requests)
 */
function findEntryPoints(graph: SimulationGraph): SystemNode[] {
  const entryPoints: SystemNode[] = [];

  // Only User nodes are traffic sources - they represent clients making requests
  for (const node of graph.nodes.values()) {
    if (node.type === 'user') {
      entryPoints.push(node);
    }
  }

  return entryPoints;
}

/**
 * Get the number of instances for a node
 */
function getNodeInstances(node: SystemNode): number {
  const data = node.data as APIServerNodeData | LoadBalancerNodeData;
  if ('scaling' in data && data.scaling) {
    return getInstanceCount(data.scaling);
  }
  return 1;
}

/**
 * Initialize node state
 */
function initNodeState(node: SystemNode): NodeState {
  const instances = getNodeInstances(node);
  const behavior = getNodeBehavior(node.type as SystemNodeType);
  return {
    nodeId: node.id,
    nodeType: node.type as SystemNodeType,
    instances,
    requestsReceived: 0,
    requestsProcessed: 0,
    totalLatencyMs: 0,
    latencies: [],
    peakRps: 0,
    currentRps: 0,
    errors: 0,
    rpsThisSecond: 0,
    maxMemoryMB: instances * 1024, // 1GB per instance default
    maxRpsPerInstance: behavior.maxRpsPerInstance,
  };
}

/**
 * Initialize edge state
 */
function initEdgeState(edge: SystemEdge): EdgeState {
  return {
    edgeId: edge.id,
    requestCount: 0,
    totalBytesTransferred: 0,
    totalLatencyMs: 0,
  };
}

/**
 * Calculate P99 from latency samples
 */
function calculateP99FromSamples(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Detect bottlenecks in the simulation results
 */
function detectBottlenecks(
  nodeStates: Map<string, NodeState>,
  graph: SimulationGraph,
  durationSeconds: number
): BottleneckInfo[] {
  const bottlenecks: BottleneckInfo[] = [];

  for (const [nodeId, state] of nodeStates) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;
    if (state.requestsReceived === 0) continue;

    const behavior = getNodeBehavior(state.nodeType);
    const maxRps = state.maxRpsPerInstance * state.instances;

    // Calculate load factor
    const avgRps = durationSeconds > 0 ? state.requestsReceived / durationSeconds : 0;
    const loadPercent = maxRps > 0 ? (avgRps / maxRps) * 100 : 0;

    // CPU/capacity overload
    if (loadPercent > 100) {
      bottlenecks.push({
        nodeId,
        type: 'cpu_overload',
        severity: 'critical',
        message: `Load at ${loadPercent.toFixed(0)}% of capacity (${avgRps.toFixed(0)} RPS vs ${maxRps.toFixed(0)} max)`,
        suggestion: `Add more instances - current: ${state.instances}, need ~${Math.ceil(avgRps / state.maxRpsPerInstance)}`,
      });
    } else if (loadPercent > 80) {
      bottlenecks.push({
        nodeId,
        type: 'cpu_overload',
        severity: 'warning',
        message: `Load at ${loadPercent.toFixed(0)}% of capacity`,
        suggestion: 'Consider scaling before load increases',
      });
    }

    // RPS capacity vs peak
    if (state.peakRps > maxRps) {
      bottlenecks.push({
        nodeId,
        type: 'queue_buildup',
        severity: 'critical',
        message: `Peak RPS (${state.peakRps.toFixed(0)}) exceeded capacity (${maxRps.toFixed(0)})`,
        suggestion: `Add more instances - current: ${state.instances}`,
      });
    } else if (state.peakRps > maxRps * 0.8) {
      bottlenecks.push({
        nodeId,
        type: 'queue_buildup',
        severity: 'warning',
        message: `Peak RPS (${state.peakRps.toFixed(0)}) approaching capacity (${maxRps.toFixed(0)})`,
        suggestion: `Consider adding instances - current: ${state.instances}`,
      });
    }

    // High latency
    const avgLatency = state.requestsProcessed > 0
      ? state.totalLatencyMs / state.requestsProcessed
      : 0;
    const expectedLatency = behavior.latency.baseMs;
    if (avgLatency > expectedLatency * 3) {
      bottlenecks.push({
        nodeId,
        type: 'high_latency',
        severity: avgLatency > expectedLatency * 5 ? 'critical' : 'warning',
        message: `Average latency ${avgLatency.toFixed(0)}ms (expected ~${expectedLatency.toFixed(0)}ms)`,
        suggestion: 'Check for resource contention or slow dependencies',
      });
    }

    // Error rate
    const errorRate = state.requestsReceived > 0
      ? state.errors / state.requestsReceived
      : 0;
    if (errorRate > 0.01) {
      bottlenecks.push({
        nodeId,
        type: 'queue_buildup',
        severity: errorRate > 0.05 ? 'critical' : 'warning',
        message: `Error rate at ${(errorRate * 100).toFixed(1)}%`,
        suggestion: 'Node is dropping requests due to overload - add capacity',
      });
    }
  }

  return bottlenecks;
}

/**
 * Convert node state to metrics
 */
function stateToMetrics(state: NodeState, durationSeconds: number): NodeMetrics {
  const avgLatency = state.requestsProcessed > 0
    ? state.totalLatencyMs / state.requestsProcessed
    : 0;

  // Calculate CPU utilization based on average RPS vs capacity
  const avgRps = durationSeconds > 0 ? state.requestsReceived / durationSeconds : 0;
  const maxRps = state.maxRpsPerInstance * state.instances;
  const cpuUtilization = maxRps > 0 ? Math.min(100, (avgRps / maxRps) * 100) : 0;

  // Estimate memory usage based on concurrent requests (using Little's Law)
  // Concurrent requests ≈ RPS × avg latency (in seconds)
  const avgLatencySec = avgLatency / 1000;
  const concurrentRequests = avgRps * avgLatencySec;
  const behavior = getNodeBehavior(state.nodeType);
  const memoryUsedMB = concurrentRequests * behavior.memoryPerRequestMB;

  return {
    nodeId: state.nodeId,
    requestsReceived: state.requestsReceived,
    requestsProcessed: state.requestsProcessed,
    requestsQueued: state.requestsReceived - state.requestsProcessed,
    avgLatencyMs: avgLatency,
    p99LatencyMs: calculateP99FromSamples(state.latencies),
    peakRPS: state.peakRps,
    resources: {
      cpu: { cores: state.instances * 2, utilizationPercent: cpuUtilization },
      memory: { totalMB: state.maxMemoryMB, usedMB: memoryUsedMB },
      network: { bandwidthMbps: 1000, usedMbps: 0 },
    },
    errors: state.errors,
  };
}

/**
 * Convert edge state to metrics
 */
function edgeStateToMetrics(state: EdgeState): EdgeMetrics {
  return {
    edgeId: state.edgeId,
    requestCount: state.requestCount,
    totalBytesTransferred: state.totalBytesTransferred,
    avgLatencyMs: state.requestCount > 0
      ? state.totalLatencyMs / state.requestCount
      : 0,
  };
}

/**
 * Result of simulating a request path
 */
interface RequestPathResult {
  /** Total round-trip latency in milliseconds */
  totalLatencyMs: number;
  /** Whether the request completed successfully */
  success: boolean;
}

/**
 * Simulate request flow through a path
 */
function simulateRequestPath(
  startNode: SystemNode,
  graph: SimulationGraph,
  nodeStates: Map<string, NodeState>,
  edgeStates: Map<string, EdgeState>,
  random: () => number,
  queryAnalyses: Map<string, QueryAnalysis>,
  cacheAnalyses: Map<string, CacheAnalysis>
): RequestPathResult {
  let totalLatency = 0;
  let success = true;
  const visited = new Set<string>();
  const queue: SystemNode[] = [startNode];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const state = nodeStates.get(node.id);
    if (!state) continue;

    // Process request at this node
    state.requestsReceived++;
    const behavior = getNodeBehavior(state.nodeType);
    let latency = calculateLatency(behavior.latency, random);

    // Apply query cost for database nodes
    if (node.type === 'postgresql') {
      const pgData = node.data as PostgreSQLNodeData;
      // Add query latencies from analysis
      for (const table of pgData.tables || []) {
        const analysis = queryAnalyses.get(`${node.id}:${table.id}`);
        if (analysis) {
          latency += analysis.estimatedCostMs;
        }
      }
    }

    // Apply cache effects for Redis nodes
    if (node.type === 'redis') {
      const redisData = node.data as RedisNodeData;
      for (const key of redisData.keys || []) {
        const analysis = cacheAnalyses.get(`${node.id}:${key.id}`);
        if (analysis && analysis.estimatedHitRate > 0) {
          // Cache hit - reduced latency
          if (random() < analysis.estimatedHitRate) {
            // Skip downstream DB call (simulated by not adding to queue)
          }
        }
      }
    }

    // Track RPS for this node
    state.rpsThisSecond++;

    // Calculate resource pressure based on current RPS vs capacity
    const maxRps = state.maxRpsPerInstance * state.instances;
    const loadFactor = maxRps > 0 ? state.rpsThisSecond / maxRps : 0;

    // Apply latency penalties when overloaded
    if (loadFactor > 1.0) {
      // Overloaded: exponential latency increase
      const overloadFactor = loadFactor - 1.0;
      latency *= (1 + overloadFactor * 10); // 10x latency per 100% overload

      // Start dropping requests when severely overloaded
      if (loadFactor > 1.5 && random() < (loadFactor - 1.5)) {
        state.errors++;
        // Don't process further - request failed
        return { totalLatencyMs: totalLatency, success: false };
      }
    } else if (loadFactor > 0.8) {
      // Approaching capacity: gradual latency increase
      const pressureFactor = (loadFactor - 0.8) / 0.2; // 0-1 as we go 80-100%
      latency *= (1 + pressureFactor * 0.5); // Up to 50% latency increase
    }

    state.latencies.push(latency);
    state.totalLatencyMs += latency;
    state.requestsProcessed++;
    totalLatency += latency;

    // Follow outgoing edges
    const outgoing = graph.outgoingEdges.get(node.id) || [];
    for (const edge of outgoing) {
      const edgeState = edgeStates.get(edge.id);
      if (edgeState) {
        edgeState.requestCount++;
        edgeState.totalBytesTransferred += 1024; // Assume 1KB per request
        edgeState.totalLatencyMs += latency;
      }

      // Handle load balancer fan-out
      if (node.type === 'loadBalancer') {
        // Only send to one target (round-robin simulation)
        const targetNode = graph.nodes.get(edge.target);
        if (targetNode && !visited.has(targetNode.id)) {
          queue.push(targetNode);
          break; // Only one target per request
        }
      } else {
        const targetNode = graph.nodes.get(edge.target);
        if (targetNode && !visited.has(targetNode.id)) {
          queue.push(targetNode);
        }
      }
    }
  }

  return { totalLatencyMs: totalLatency, success };
}

/**
 * Create a timeline snapshot from current state
 */
function createSnapshot(
  timestamp: number,
  nodeStates: Map<string, NodeState>
): TimelineSnapshot {
  const nodeMetrics: Record<string, NodeMetricsSnapshot> = {};

  for (const [nodeId, state] of nodeStates) {
    // Calculate CPU as percentage of capacity used this second
    const maxRps = state.maxRpsPerInstance * state.instances;
    const cpuPercent = maxRps > 0 ? Math.min(100, (state.rpsThisSecond / maxRps) * 100) : 0;

    // Estimate memory based on concurrent requests
    const avgLatencyMs = state.requestsProcessed > 0
      ? state.totalLatencyMs / state.requestsProcessed
      : 0;
    const concurrentRequests = state.rpsThisSecond * (avgLatencyMs / 1000);
    const behavior = getNodeBehavior(state.nodeType);
    const memoryUsedMB = concurrentRequests * behavior.memoryPerRequestMB;
    const memoryPercent = state.maxMemoryMB > 0 ? (memoryUsedMB / state.maxMemoryMB) * 100 : 0;

    nodeMetrics[nodeId] = {
      rps: state.currentRps,
      latencyMs: avgLatencyMs,
      cpuPercent,
      memoryPercent,
      errorRate: state.requestsReceived > 0
        ? state.errors / state.requestsReceived
        : 0,
    };
  }

  return { timestamp, nodeMetrics };
}

/**
 * Pre-analyze queries and cache patterns
 */
function preAnalyze(
  graph: SimulationGraph,
  rps: number
): {
  queryAnalyses: Map<string, QueryAnalysis>;
  cacheAnalyses: Map<string, CacheAnalysis>;
} {
  const queryAnalyses = new Map<string, QueryAnalysis>();
  const cacheAnalyses = new Map<string, CacheAnalysis>();

  for (const node of graph.nodes.values()) {
    // Analyze PostgreSQL queries
    if (node.type === 'postgresql') {
      const pgData = node.data as PostgreSQLNodeData;
      for (const table of pgData.tables || []) {
        // Find linked queries to this table
        for (const otherNode of graph.nodes.values()) {
          if (otherNode.type === 'apiServer') {
            const apiData = otherNode.data as APIServerNodeData;
            for (const endpoint of apiData.endpoints || []) {
              for (const query of endpoint.linkedQueries || []) {
                if (query.targetNodeId === node.id && query.targetTableId === table.id) {
                  const analysis = analyzeQuery(query, table);
                  queryAnalyses.set(`${node.id}:${table.id}`, analysis);
                }
              }
            }
          }
        }
      }
    }

    // Analyze Redis cache patterns
    if (node.type === 'redis') {
      const redisData = node.data as RedisNodeData;
      for (const key of redisData.keys || []) {
        const analysis = analyzeCacheKey(key, rps);
        cacheAnalyses.set(`${node.id}:${key.id}`, analysis);
      }
    }
  }

  return { queryAnalyses, cacheAnalyses };
}

/**
 * Calculate P99 from RTT samples
 */
function calculateP99Rtt(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Run a simulation on the given nodes and edges
 */
export function runSimulation(
  nodes: SystemNode[],
  edges: SystemEdge[],
  config: SimulationConfig
): SimulationResult {
  const random = config.seed !== undefined ? createRng(config.seed) : Math.random;
  const graph = buildGraph(nodes, edges);
  const entryPoints = findEntryPoints(graph);

  // Initialize state
  const nodeStates = new Map<string, NodeState>();
  const edgeStates = new Map<string, EdgeState>();
  const entryPointStates = new Map<string, EntryPointState>();

  for (const node of nodes) {
    if (node.type !== 'stickyNote') {
      nodeStates.set(node.id, initNodeState(node));
    }
  }

  for (const edge of edges) {
    edgeStates.set(edge.id, initEdgeState(edge));
  }

  // Initialize entry point states
  for (const entryPoint of entryPoints) {
    entryPointStates.set(entryPoint.id, {
      nodeId: entryPoint.id,
      totalRequests: 0,
      successfulResponses: 0,
      failedRequests: 0,
      totalRttMs: 0,
      rttSamples: [],
    });
  }

  // Pre-analyze queries and cache patterns
  const { queryAnalyses, cacheAnalyses } = preAnalyze(graph, config.requestsPerSecond);

  // Simulation loop
  const timeline: TimelineSnapshot[] = [];
  const snapshotInterval = 1; // 1 second
  let totalRequests = 0;

  for (let second = 0; second < config.durationSeconds; second++) {
    // Reset per-second counters for all nodes
    for (const state of nodeStates.values()) {
      state.rpsThisSecond = 0;
    }

    // Generate requests for this second
    const requestsThisSecond = config.requestsPerSecond;

    // Distribute requests across entry points
    const requestsPerEntry = Math.ceil(requestsThisSecond / Math.max(1, entryPoints.length));

    for (const entryPoint of entryPoints) {
      const entryState = entryPointStates.get(entryPoint.id);

      for (let i = 0; i < requestsPerEntry; i++) {
        const result = simulateRequestPath(
          entryPoint,
          graph,
          nodeStates,
          edgeStates,
          random,
          queryAnalyses,
          cacheAnalyses
        );
        totalRequests++;

        // Track RTT for this entry point
        if (entryState) {
          entryState.totalRequests++;
          if (result.success) {
            entryState.successfulResponses++;
            entryState.totalRttMs += result.totalLatencyMs;
            entryState.rttSamples.push(result.totalLatencyMs);
          } else {
            entryState.failedRequests++;
          }
        }
      }
    }

    // Update peak RPS and currentRps for all nodes based on this second's traffic
    for (const state of nodeStates.values()) {
      state.currentRps = state.rpsThisSecond;
      state.peakRps = Math.max(state.peakRps, state.rpsThisSecond);
    }

    // Take snapshot every interval
    if (second % snapshotInterval === 0) {
      timeline.push(createSnapshot(second, nodeStates));
    }
  }

  // Build final results
  const nodeMetrics: Record<string, NodeMetrics> = {};
  for (const [nodeId, state] of nodeStates) {
    nodeMetrics[nodeId] = stateToMetrics(state, config.durationSeconds);
  }

  const edgeMetrics: Record<string, EdgeMetrics> = {};
  for (const [edgeId, state] of edgeStates) {
    edgeMetrics[edgeId] = edgeStateToMetrics(state);
  }

  // Build entry point metrics
  const entryPointMetrics: Record<string, EntryPointMetrics> = {};
  for (const [nodeId, state] of entryPointStates) {
    const avgRtt = state.successfulResponses > 0
      ? state.totalRttMs / state.successfulResponses
      : 0;
    const successRate = state.totalRequests > 0
      ? state.successfulResponses / state.totalRequests
      : 1;

    entryPointMetrics[nodeId] = {
      nodeId: state.nodeId,
      totalRequests: state.totalRequests,
      successfulResponses: state.successfulResponses,
      failedRequests: state.failedRequests,
      avgRoundTripMs: avgRtt,
      p99RoundTripMs: calculateP99Rtt(state.rttSamples),
      successRate,
      rttSamples: state.rttSamples,
    };
  }

  const bottlenecks = detectBottlenecks(nodeStates, graph, config.durationSeconds);

  return {
    config,
    duration: config.durationSeconds,
    totalRequests,
    nodeMetrics,
    edgeMetrics,
    entryPointMetrics,
    bottlenecks,
    timeline,
  };
}
