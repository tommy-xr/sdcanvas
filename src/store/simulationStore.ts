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

    // Debug logging
    if (dotsToSpawn > 0) {
      console.log('Spawning dots:', { dotsToSpawn, entryPoints: entryPoints.map(n => n.id), edgeCount: edges.length });
    }

    // Spawn new requests from entry points
    for (let i = 0; i < dotsToSpawn; i++) {
      const entryPoint = entryPoints[Math.floor(Math.random() * entryPoints.length)];
      if (!entryPoint) {
        console.log('No entry point found');
        continue;
      }

      // Find outgoing edges from this entry point
      const outgoingEdges = edges.filter((e) => e.source === entryPoint.id);
      if (outgoingEdges.length === 0) {
        console.log('No outgoing edges from entry point:', entryPoint.id);
        continue;
      }

      const edge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
      newRequests.push({
        id: generateRequestId(),
        currentEdgeId: edge.id,
        progress: 0,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        startTime: newTime,
        requestMultiplier: requestsPerVisualDot,
      });
    }

    // Update existing requests - move them along edges
    const updatedRequests: LiveRequest[] = [];

    for (const req of newRequests) {
      // Animate along edge - use consistent speed regardless of edge length
      // A request takes about 0.5-1 second to traverse an edge visually
      const edgeTraversalTime = 0.5; // seconds to cross an edge
      const progressDelta = deltaSec / edgeTraversalTime;
      const newProgress = req.progress + progressDelta;

      if (newProgress >= 1) {
        // Request reached target node, find next edge
        const outgoingEdges = edges.filter((e) => e.source === req.targetNodeId);

        if (outgoingEdges.length > 0) {
          // Continue to next node
          const nextEdge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
          updatedRequests.push({
            ...req,
            currentEdgeId: nextEdge.id,
            progress: 0,
            sourceNodeId: nextEdge.source,
            targetNodeId: nextEdge.target,
          });
        }
        // Otherwise request is complete, remove it
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
      result: null,
      timeline: [],
      animationFrameId: null,
    });
  },
}));
