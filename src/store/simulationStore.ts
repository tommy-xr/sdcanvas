import { create } from 'zustand';
import type {
  SimulationConfig,
  SimulationResult,
  TimelineSnapshot,
} from '@sdcanvas/core';
import { runSimulation } from '@sdcanvas/core';
import type { SystemNode } from '../types/nodes';
import type { SystemEdge } from '../types/edges';

/**
 * A live request being animated across the canvas
 */
export interface LiveRequest {
  id: string;
  /** Current edge being traversed */
  currentEdgeId: string;
  /** Progress along the edge (0-1) */
  progress: number;
  /** Source node of current edge */
  sourceNodeId: string;
  /** Target node of current edge */
  targetNodeId: string;
  /** Request start time */
  startTime: number;
  /** How many actual requests this dot represents */
  requestMultiplier: number;
  /** Whether this is a response traveling back to origin */
  isResponse: boolean;
  /** Path of node IDs this request has traveled through */
  pathHistory: string[];
  /** The user node this request originated from */
  originNodeId: string;
}

/**
 * Live metrics for a node during simulation
 */
export interface LiveNodeMetrics {
  nodeId: string;
  rps: number;
  latencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
  errorRate: number;
  /** Status color based on thresholds */
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Round-trip metrics for user/client nodes
 */
export interface RoundTripMetrics {
  nodeId: string;
  /** Total requests sent from this user node */
  totalRequests: number;
  /** Total successful responses received */
  successfulResponses: number;
  /** Total latency sum for averaging */
  totalLatencyMs: number;
  /** Average round-trip latency */
  avgLatencyMs: number;
  /** Success rate (0-1) */
  successRate: number;
}

interface SimulationState {
  /** Whether simulation is currently running */
  isRunning: boolean;
  /** Whether simulation is paused */
  isPaused: boolean;
  /** Simulation configuration */
  config: SimulationConfig;
  /** Current simulation time in seconds */
  currentTime: number;
  /** Speed multiplier (1x, 2x, 5x, 10x) */
  speed: number;
  /** Currently animated requests */
  liveRequests: LiveRequest[];
  /** Live metrics per node */
  liveMetrics: Record<string, LiveNodeMetrics>;
  /** Round-trip metrics per user node */
  roundTripMetrics: Record<string, RoundTripMetrics>;
  /** Accumulated simulation result */
  result: SimulationResult | null;
  /** Timeline data for graphs */
  timeline: TimelineSnapshot[];
  /** Animation frame ID for cleanup */
  animationFrameId: number | null;
  /** Last frame timestamp */
  lastFrameTime: number;
  /** Request multiplier (1 dot = N requests) */
  requestMultiplier: number;

  // Actions
  setConfig: (config: Partial<SimulationConfig>) => void;
  setSpeed: (speed: number) => void;
  setRequestMultiplier: (multiplier: number) => void;
  start: (nodes: SystemNode[], edges: SystemEdge[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: (deltaMs: number, nodes: SystemNode[], edges: SystemEdge[]) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  durationSeconds: 60,
  requestsPerSecond: 100,
};

/**
 * Determine status color based on CPU utilization
 */
function getNodeStatus(cpuPercent: number, errorRate: number): 'healthy' | 'warning' | 'critical' {
  if (errorRate > 0.05 || cpuPercent > 100) return 'critical';
  if (errorRate > 0.01 || cpuPercent > 80) return 'warning';
  return 'healthy';
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  isRunning: false,
  isPaused: false,
  config: DEFAULT_CONFIG,
  currentTime: 0,
  speed: 1,
  liveRequests: [],
  liveMetrics: {},
  roundTripMetrics: {},
  result: null,
  timeline: [],
  animationFrameId: null,
  lastFrameTime: 0,
  requestMultiplier: 10,

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  setRequestMultiplier: (multiplier) => {
    set({ requestMultiplier: multiplier });
  },

  start: (nodes, edges) => {
    const state = get();
    if (state.isRunning) return;

    // Run the full simulation to get the result and timeline
    const result = runSimulation(nodes, edges, state.config);

    // Initialize live metrics from first timeline snapshot
    const liveMetrics: Record<string, LiveNodeMetrics> = {};
    if (result.timeline.length > 0) {
      const firstSnapshot = result.timeline[0];
      for (const [nodeId, metrics] of Object.entries(firstSnapshot.nodeMetrics)) {
        liveMetrics[nodeId] = {
          nodeId,
          ...metrics,
          status: getNodeStatus(metrics.cpuPercent, metrics.errorRate),
        };
      }
    }

    set({
      isRunning: true,
      isPaused: false,
      currentTime: 0,
      result,
      timeline: result.timeline,
      liveMetrics,
      roundTripMetrics: {},
      liveRequests: [],
      lastFrameTime: performance.now(),
    });
  },

  pause: () => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
    }

    set({
      isPaused: true,
      animationFrameId: null,
    });
  },

  resume: () => {
    const state = get();
    if (!state.isRunning || !state.isPaused) return;

    set({
      isPaused: false,
      lastFrameTime: performance.now(),
    });
  },

  stop: () => {
    const state = get();

    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
    }

    set({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      liveRequests: [],
      animationFrameId: null,
    });
  },

  tick: (deltaMs, nodes, edges) => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    const deltaSec = (deltaMs / 1000) * state.speed;
    const newTime = state.currentTime + deltaSec;

    // Check if simulation is complete
    if (newTime >= state.config.durationSeconds) {
      get().stop();
      return;
    }

    // Update live metrics from timeline
    const timelineIndex = Math.min(
      Math.floor(newTime),
      state.timeline.length - 1
    );
    const snapshot = state.timeline[timelineIndex];
    const newLiveMetrics: Record<string, LiveNodeMetrics> = {};

    if (snapshot) {
      for (const [nodeId, metrics] of Object.entries(snapshot.nodeMetrics)) {
        newLiveMetrics[nodeId] = {
          nodeId,
          ...metrics,
          status: getNodeStatus(metrics.cpuPercent, metrics.errorRate),
        };
      }
    }

    // Spawn new requests based on RPS and delta time
    // Find entry points (nodes with no incoming edges)
    const entryPoints = nodes.filter((node) => {
      if (node.type === 'stickyNote') return false;
      return !edges.some((e) => e.target === node.id);
    });

    // Calculate how many "visual" requests to spawn this tick
    const requestsPerVisualDot = state.requestMultiplier;
    const actualRps = state.config.requestsPerSecond;
    const visualDotsPerSecond = actualRps / requestsPerVisualDot;

    // Use probabilistic spawning for fractional rates
    // e.g., 0.1 dots/sec means 10% chance per second, scaled to this tick
    const expectedDots = visualDotsPerSecond * deltaSec;
    let dotsToSpawn = Math.floor(expectedDots);
    // Probabilistically add one more based on fractional part
    if (Math.random() < (expectedDots - dotsToSpawn)) {
      dotsToSpawn++;
    }
    // Ensure we spawn at least a few dots for visual feedback
    // Minimum ~2 dots per second for visibility
    const minDotsPerSecond = 2;
    if (visualDotsPerSecond < minDotsPerSecond && Math.random() < minDotsPerSecond * deltaSec) {
      dotsToSpawn = Math.max(dotsToSpawn, 1);
    }

    const newRequests: LiveRequest[] = [...state.liveRequests];

    // Spawn new requests from entry points
    for (let i = 0; i < dotsToSpawn; i++) {
      const entryPoint = entryPoints[Math.floor(Math.random() * entryPoints.length)];
      if (!entryPoint) continue;

      // Find outgoing edges from this entry point
      const outgoingEdges = edges.filter((e) => e.source === entryPoint.id);
      if (outgoingEdges.length === 0) continue;

      const edge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
      newRequests.push({
        id: generateRequestId(),
        currentEdgeId: edge.id,
        progress: 0,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        startTime: newTime,
        requestMultiplier: requestsPerVisualDot,
        isResponse: false,
        pathHistory: [entryPoint.id],
        originNodeId: entryPoint.id,
      });
    }

    // Update existing requests - move them along edges
    const updatedRequests: LiveRequest[] = [];
    // Track round-trip completions for metrics update
    const newRoundTripMetrics = { ...state.roundTripMetrics };

    for (const req of newRequests) {
      // Animate along edge - use consistent speed regardless of edge length
      // A request takes about 0.5-1 second to traverse an edge visually
      const edgeTraversalTime = 0.5; // seconds to cross an edge
      const progressDelta = deltaSec / edgeTraversalTime;
      const newProgress = req.progress + progressDelta;

      if (newProgress >= 1) {
        if (req.isResponse) {
          // Response traveling back to origin
          // We've arrived at targetNodeId, find its position in pathHistory
          const arrivedAtIndex = req.pathHistory.indexOf(req.targetNodeId);

          if (arrivedAtIndex <= 0) {
            // Response reached origin (index 0) or origin not in path - update round-trip metrics
            const originId = req.originNodeId;
            const roundTripLatency = (newTime - req.startTime) * 1000; // convert to ms

            if (!newRoundTripMetrics[originId]) {
              newRoundTripMetrics[originId] = {
                nodeId: originId,
                totalRequests: 0,
                successfulResponses: 0,
                totalLatencyMs: 0,
                avgLatencyMs: 0,
                successRate: 1,
              };
            }

            const metrics = newRoundTripMetrics[originId];
            metrics.successfulResponses += req.requestMultiplier;
            metrics.totalLatencyMs += roundTripLatency * req.requestMultiplier;
            metrics.avgLatencyMs = metrics.totalLatencyMs / metrics.successfulResponses;
            metrics.successRate = metrics.totalRequests > 0
              ? metrics.successfulResponses / metrics.totalRequests
              : 1;
            // Response complete, don't add to updatedRequests
          } else {
            // Continue back along path - find the node before where we arrived
            const prevNodeId = req.pathHistory[arrivedAtIndex - 1];
            // Find the edge going back (from where we arrived to the previous node in path)
            const returnEdge = edges.find(
              (e) => e.source === req.targetNodeId && e.target === prevNodeId
            ) || edges.find(
              // Try reverse edge if direct edge doesn't exist
              (e) => e.source === prevNodeId && e.target === req.targetNodeId
            );

            if (returnEdge) {
              // Determine correct direction for the edge
              const goingForward = returnEdge.source === req.targetNodeId;
              updatedRequests.push({
                ...req,
                currentEdgeId: returnEdge.id,
                progress: 0,
                sourceNodeId: goingForward ? returnEdge.source : returnEdge.target,
                targetNodeId: goingForward ? returnEdge.target : returnEdge.source,
              });
            }
            // If no return edge found, response is lost
          }
        } else {
          // Request traveling forward
          const outgoingEdges = edges.filter((e) => e.source === req.targetNodeId);

          if (outgoingEdges.length > 0) {
            // Continue to next node, add current target to path
            const nextEdge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
            updatedRequests.push({
              ...req,
              currentEdgeId: nextEdge.id,
              progress: 0,
              sourceNodeId: nextEdge.source,
              targetNodeId: nextEdge.target,
              pathHistory: [...req.pathHistory, req.targetNodeId],
            });
          } else {
            // Reached terminal node - convert to response and start returning
            // Update total requests count for this origin
            const originId = req.originNodeId;
            if (!newRoundTripMetrics[originId]) {
              newRoundTripMetrics[originId] = {
                nodeId: originId,
                totalRequests: 0,
                successfulResponses: 0,
                totalLatencyMs: 0,
                avgLatencyMs: 0,
                successRate: 1,
              };
            }
            newRoundTripMetrics[originId].totalRequests += req.requestMultiplier;

            // Add terminal node to path and start returning
            const fullPath = [...req.pathHistory, req.targetNodeId];
            const currentIndex = fullPath.length - 1;
            const prevNodeId = fullPath[currentIndex - 1];

            // Find edge to go back
            const returnEdge = edges.find(
              (e) => e.source === req.targetNodeId && e.target === prevNodeId
            ) || edges.find(
              (e) => e.source === prevNodeId && e.target === req.targetNodeId
            );

            if (returnEdge && fullPath.length > 1) {
              const goingForward = returnEdge.source === req.targetNodeId;
              updatedRequests.push({
                ...req,
                currentEdgeId: returnEdge.id,
                progress: 0,
                sourceNodeId: goingForward ? returnEdge.source : returnEdge.target,
                targetNodeId: goingForward ? returnEdge.target : returnEdge.source,
                isResponse: true,
                pathHistory: fullPath,
              });
            }
            // If path is just one node or no return edge, response is complete
          }
        }
      } else {
        updatedRequests.push({
          ...req,
          progress: newProgress,
        });
      }
    }

    // Limit max concurrent animated requests for performance
    const maxVisualRequests = 50;
    const finalRequests = updatedRequests.slice(-maxVisualRequests);

    set({
      currentTime: newTime,
      liveMetrics: newLiveMetrics,
      liveRequests: finalRequests,
      roundTripMetrics: newRoundTripMetrics,
    });
  },

  reset: () => {
    const state = get();
    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
    }

    set({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      liveRequests: [],
      liveMetrics: {},
      roundTripMetrics: {},
      result: null,
      timeline: [],
      animationFrameId: null,
    });
  },
}));
