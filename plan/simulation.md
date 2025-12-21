# Simulation Plan

## Overview

The simulation layer models request lifecycles across the system design, tracking metrics like RPS, bandwidth, CPU/memory usage per node. It sits **on top** of the designer UI as a composable, independent layer.

**Key principle**: Since simulating large loads (100M+ requests) is impractical, each visualized "live" request represents a configurable multiple (e.g., 1 animated request = 10,000 actual requests).

---

## Progress

### Phase 1: COMPLETE

**Implemented** (2024-12-21):

| Component | Status | Files |
|-----------|--------|-------|
| 1.1 Simulation Data Model | Done | `packages/core/src/types/simulation.ts` |
| 1.2 Node Behavior Models | Done | `packages/core/src/simulation/nodeBehaviors.ts` |
| 1.3 Query Cost Analysis | Done | `packages/core/src/simulation/queryCost.ts` |
| 1.4 Cache Behavior Modeling | Done | `packages/core/src/simulation/cacheModel.ts` |
| 1.5 Request Routing Logic | Done | `packages/core/src/simulation/engine.ts` |
| 1.6 CLI `simulate` Command | Done | `packages/cli/src/index.ts` |

**Example files created:**
- `examples/sim-simple.json` - User -> API
- `examples/sim-with-db.json` - User -> API -> PostgreSQL (with query cost analysis)
- `examples/sim-with-cache.json` - User -> API -> Redis -> PostgreSQL

**Usage:**
```bash
npm run cli -- simulate examples/sim-with-cache.json --rps 1000 --duration 60
npm run cli -- simulate examples/sim-with-cache.json --rps 1000 --json > results.json
npm run cli -- simulate examples/sim-with-cache.json --rps 1000 --seed 12345  # reproducible
```

**Resource modeling approach:**
- **CPU**: Calculated as `(actual_RPS / max_RPS) × 100` - reflects load vs capacity
- **Memory**: Uses Little's Law: `concurrent_requests × memory_per_request` where `concurrent = RPS × latency_seconds`
- **Overload**: When load > 100%, latency increases exponentially; requests fail when > 150%
- **Bottleneck detection**: Warns at 80% capacity, critical at 100%+

---

## Phase 1: Core Simulation Engine (CLI)

**Goal**: Build a headless simulation engine that can process a canvas file and output metrics.

### 1.1 Simulation Data Model

Add simulation-specific types to `@sdcanvas/core`:

```typescript
// Simulation configuration
interface SimulationConfig {
  durationSeconds: number;      // How long to simulate
  requestsPerSecond: number;    // Incoming RPS at entry points
  seed?: number;                // For reproducible randomization
}

// Per-node resource model
interface NodeResources {
  cpu: { cores: number; utilizationPercent: number };
  memory: { totalMB: number; usedMB: number };
  network: { bandwidthMbps: number; usedMbps: number };
}

// Per-node metrics during simulation
interface NodeMetrics {
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

// Edge/connection metrics
interface EdgeMetrics {
  edgeId: string;
  requestCount: number;
  totalBytesTransferred: number;
  avgLatencyMs: number;
}

// Overall simulation result
interface SimulationResult {
  config: SimulationConfig;
  duration: number;
  totalRequests: number;
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
  bottlenecks: BottleneckInfo[];
  timeline: TimelineSnapshot[];  // For replay/graphing
}
```

**Testable deliverable**:
- Unit tests for simulation types (type-checking, serialization)
- `npm run test:sim-types` passes

### 1.2 Node Behavior Models

Each node type needs a processing model:

| Node Type | Latency Model | Resource Impact | Scaling Behavior |
|-----------|--------------|-----------------|------------------|
| User | N/A (source) | Generates requests | N/A |
| Load Balancer | ~1-5ms | Low CPU | Distributes to targets |
| CDN | ~10-50ms (miss), ~1-5ms (hit) | Cache memory | Hit rate based on rules |
| API Server | ~10-100ms | CPU per request | Horizontal scaling |
| PostgreSQL | ~5-500ms (query dependent) | CPU + I/O | Connection pooling |
| Redis | ~1-5ms | Memory | Very high throughput |
| S3 | ~50-200ms | Network bandwidth | Unlimited |
| Message Queue | ~5-20ms | Memory for queue | Async decoupling |

**Testable deliverable**:
- Unit tests for each node behavior model
- Test: "API Server with 2 instances handles 2x traffic of single instance"
- Test: "CDN returns cache hit latency for matching rules"
- `npm run test:node-models` passes

### 1.3 Query Cost Analysis

Analyze database queries to detect missing indexes and estimate query costs.

**Enhancement to LinkedQuery**:
```typescript
interface LinkedQuery {
  id: string;
  targetNodeId: string;
  targetTableId: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  // New fields for simulation:
  whereColumns?: string[];     // Columns used in WHERE clause
  orderByColumns?: string[];   // Columns used in ORDER BY
  selectColumns?: string[];    // Columns being selected (for covering index check)
}
```

**Query cost estimation logic**:
```typescript
interface QueryAnalysis {
  queryId: string;
  scanType: 'seq_scan' | 'index_scan' | 'index_only_scan';
  estimatedRowsScanned: number;
  estimatedCostMs: number;
  usedIndex?: string;
  warnings: QueryWarning[];
}

interface QueryWarning {
  type: 'missing_index' | 'partial_index_match' | 'seq_scan_large_table';
  message: string;
  suggestion: string;  // e.g., "CREATE INDEX idx_users_email ON users(email)"
}
```

**Cost model**:
| Scan Type | Cost per 1K rows | Notes |
|-----------|------------------|-------|
| seq_scan | ~10ms | Grows linearly with table size |
| index_scan | ~0.1ms + log(N) | B-tree lookup + row fetch |
| index_only_scan | ~0.05ms + log(N) | B-tree only, no heap access |

**Detection logic**:
1. For each `LinkedQuery`, extract `whereColumns`
2. Check if table has an index covering those columns
3. If no index: `seq_scan` - estimate cost based on `estimatedRows`
4. If index exists: `index_scan` - much faster
5. If index covers all `selectColumns`: `index_only_scan` - fastest

**Testable deliverable**:
- Unit test: Query on indexed column returns `index_scan`
- Unit test: Query on non-indexed column returns `seq_scan` with warning
- Unit test: Cost estimate scales with `estimatedRows`
- Test: Large table (1M rows) with seq_scan shows significant latency
- `npm run test:query-analysis` passes

### 1.4 Cache Behavior Modeling

Model cache-through patterns where API endpoints check Redis before hitting the database.

**Enhancement to RedisKey**:
```typescript
interface RedisKey {
  id: string;
  pattern: string;
  valueType: 'string' | 'counter' | 'json' | 'list' | 'set' | 'hash' | 'sortedSet';
  ttl?: number;
  // New fields for simulation:
  estimatedCardinality?: number;  // How many unique keys (e.g., 100K users)
  sourceNodeId?: string;          // Which DB node this caches (e.g., 'postgresql-1')
  sourceTableId?: string;         // Which table this caches
}
```

**Cache hit rate estimation**:

When an endpoint connects to both Redis and PostgreSQL for the same data:

```typescript
interface CacheAnalysis {
  keyPattern: string;
  ttlSeconds: number;
  cardinality: number;
  requestsPerSecond: number;
  estimatedHitRate: number;      // 0.0 - 1.0
  effectiveDbRps: number;        // RPS that actually hits DB
}

function estimateCacheHitRate(
  ttlSeconds: number,
  cardinality: number,
  rps: number
): number {
  // Average time between requests for same key
  const avgTimeBetweenRequests = cardinality / rps;

  if (avgTimeBetweenRequests >= ttlSeconds) {
    // Key expires before next request → always miss
    return 0;
  }

  // Probability that cache is still warm
  // First request always misses, subsequent requests hit until TTL
  const requestsPerKeyPerTtl = ttlSeconds / avgTimeBetweenRequests;
  const hitRate = (requestsPerKeyPerTtl - 1) / requestsPerKeyPerTtl;

  return Math.max(0, Math.min(1, hitRate));
}
```

**Example calculations**:

| Scenario | TTL | Cardinality | RPS | Avg Gap | Hit Rate | DB RPS |
|----------|-----|-------------|-----|---------|----------|--------|
| Hot cache | 3600s | 10K | 1000 | 10s | ~99% | ~10 |
| Warm cache | 300s | 100K | 500 | 200s | ~33% | ~335 |
| Cold cache | 60s | 1M | 100 | 10000s | ~0% | ~100 |

**Graph inference**:
- Detect when endpoint → Redis AND endpoint → PostgreSQL
- Match RedisKey.sourceNodeId/sourceTableId to LinkedQuery target
- Apply cache-through logic: Redis latency + (miss_rate × DB latency)

**Testable deliverable**:
- Unit test: Hit rate calculation with known inputs
- Unit test: 100% hit rate when TTL >> avg request gap
- Unit test: ~0% hit rate when TTL << avg request gap
- Integration test: Cache-through reduces effective DB load
- `npm run test:cache-model` passes

### 1.5 Request Routing Logic

Implement request flow through the graph:

1. Start at `user` nodes
2. Follow edges based on connection type
3. For cache-through patterns: check Redis first, conditionally hit DB
4. Apply latency/processing at each node (using query cost analysis for DB nodes)
5. Track cumulative metrics
6. Handle fan-out (load balancer -> multiple API servers)
7. Handle async paths (message queue decouples)

**Testable deliverable**:
- Integration test: User -> API Server (single hop)
- Integration test: User -> Load Balancer -> API Server (fan-out)
- Integration test: User -> API Server -> PostgreSQL (DB query)
- Integration test: User -> API Server -> Redis -> PostgreSQL (cache-through)
- `npm run test:routing` passes

### 1.6 CLI `simulate` Command

Add to `@sdcanvas/cli`:

```bash
# Basic simulation
sdcanvas simulate canvas.json --rps 1000 --duration 60

# Output options
sdcanvas simulate canvas.json --rps 1000 --json > results.json

# Burst mode (spike test)
sdcanvas simulate canvas.json --burst 10000
```

Output example:
```
Simulation Complete (60s, 60000 requests)

Node Metrics:
  api-server-1:
    Peak RPS: 500 | Avg Latency: 45ms | P99: 120ms
    CPU: 75% | Memory: 512MB/1024MB

  postgresql-1:
    Peak RPS: 250 | Avg Latency: 15ms | P99: 80ms
    CPU: 40% | Connections: 50/100

Bottlenecks Detected:
  - api-server-1: CPU > 70% - consider scaling

Edge Traffic:
  user -> lb: 1000 RPS, 2.5 MB/s
  lb -> api: 1000 RPS, 2.5 MB/s
  api -> db: 500 RPS, 0.5 MB/s
```

**Testable deliverable**:
- `npm run cli -- simulate examples/sample-workflow.json --rps 100 --duration 10` runs successfully
- JSON output validates against schema
- Add example canvas files for each test scenario in `examples/`:
  - `examples/sim-simple.json` (User -> API)
  - `examples/sim-with-db.json` (User -> API -> PostgreSQL)
  - `examples/sim-with-cache.json` (User -> API -> Redis -> PostgreSQL)
- `npm run validate` passes with new examples
- Add `npm run test:simulate` that runs simulation on test canvases and validates output

---

## Phase 2: Live Simulation UI

**Goal**: Overlay animated requests on the 2D canvas during simulation.

### 2.1 Simulation State Management

Add Zustand store for simulation state:

```typescript
interface SimulationStore {
  isRunning: boolean;
  config: SimulationConfig;
  currentTime: number;
  liveRequests: LiveRequest[];  // Currently animated
  metrics: SimulationResult;    // Accumulated

  // Actions
  start: (config: SimulationConfig) => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (multiplier: number) => void;
}

interface LiveRequest {
  id: string;
  currentEdgeId: string;
  progress: number;  // 0-1 along edge
  sourceNodeId: string;
  targetNodeId: string;
}
```

**Testable deliverable**:
- Store initializes correctly
- `start()` begins simulation loop
- `pause()`/`stop()` work correctly
- Manual test: UI shows simulation controls

### 2.2 Request Animation

Animate dots/packets moving along edges:

- Use React Spring or CSS animations
- Dots spawn at source, travel along edge path, arrive at target
- Each dot represents N requests (configurable scale)
- Color-code by request type or status

**Testable deliverable**:
- Manual test: Dots animate smoothly along edges
- Manual test: Animation speed responds to speed control
- Manual test: Multiple simultaneous requests render without performance issues

### 2.3 Live Metrics Overlay

Show real-time metrics on nodes:

- RPS badge on each node
- CPU/memory utilization bar
- Queue depth indicator
- Color coding (green/yellow/red) based on thresholds

**Testable deliverable**:
- Manual test: Metrics update in real-time during simulation
- Manual test: Color thresholds work correctly
- Manual test: Metrics hide when simulation stops

### 2.4 Simulation Control Panel

UI controls:

- Play/Pause/Stop buttons
- Speed slider (0.5x, 1x, 2x, 5x, 10x)
- RPS input
- Duration input
- "Burst" button for spike testing

**Testable deliverable**:
- Manual test: All controls functional
- Manual test: Settings persist during pause
- Manual test: Can restart simulation with new config

---

## Phase 3: Monitoring Graphs

**Goal**: Display time-series graphs like APM tools (New Relic, Datadog style).

### 3.1 Timeline Data Collection

During simulation, capture snapshots:

```typescript
interface TimelineSnapshot {
  timestamp: number;
  nodeMetrics: Record<string, {
    rps: number;
    latencyMs: number;
    cpuPercent: number;
    memoryPercent: number;
    errorRate: number;
  }>;
}
```

Capture at configurable interval (default: 1 second).

**Testable deliverable**:
- Simulation captures timeline data
- Data export includes timeline: `sdcanvas simulate --json` includes `timeline` array
- `npm run test:timeline` validates timeline structure

### 3.2 Graph Components

Build reusable chart components:

- Line chart for RPS over time
- Line chart for latency (avg, p50, p99)
- Area chart for CPU/memory utilization
- Stacked chart for request distribution

Use a lightweight charting library (e.g., recharts, visx, or custom SVG).

**Testable deliverable**:
- Graph components render with mock data
- Manual test: Graphs update during live simulation
- Manual test: Hover shows values
- Manual test: Can select different nodes/metrics

### 3.3 Lower Pane Integration

Add collapsible bottom panel:

- Tab: "Metrics" - live graphs
- Tab: "Errors" - error log
- Tab: "Timeline" - scrub through simulation history
- Resizable height

**Testable deliverable**:
- Manual test: Panel expands/collapses
- Manual test: Tabs switch correctly
- Manual test: Panel doesn't interfere with canvas interaction

### 3.4 Historical Replay

Allow scrubbing through completed simulation:

- Timeline scrubber control
- Canvas shows state at selected time
- Graphs highlight current time position

**Testable deliverable**:
- Manual test: Scrubbing updates canvas state
- Manual test: Can replay simulation after completion
- Manual test: Export simulation for later replay

---

## Phase 4: 3D Visualization

**Goal**: Optional 3D view with "pylons" (vertical bars) representing metrics.

### 4.1 3D View Toggle

Add view mode toggle:

- 2D (default) - current canvas
- 3D - isometric/perspective view with height dimension

**Testable deliverable**:
- Manual test: Toggle switches views
- Manual test: Node positions preserved between views
- Manual test: Can edit in 2D, view in 3D

### 4.2 Pylon Rendering

Render vertical bars on each node:

- Height = metric value (RPS, latency, CPU, etc.)
- Color = status (green/yellow/red)
- Optional: multiple pylons per node for different metrics
- Animate height changes smoothly

Technology options: Three.js, react-three-fiber, or CSS 3D transforms.

**Testable deliverable**:
- Manual test: Pylons render at correct positions
- Manual test: Height reflects metrics
- Manual test: Colors match thresholds
- Manual test: Smooth animation during simulation

### 4.3 3D Navigation

Add camera controls:

- Rotate around scene
- Zoom in/out
- Reset to default view
- Optional: preset angles (top, front, isometric)

**Testable deliverable**:
- Manual test: Camera controls responsive
- Manual test: Can view from multiple angles
- Manual test: Reset returns to default

---

## Test Scenarios

Each phase should support these core test scenarios:

1. **Simple**: User -> API Server
   - Expected: Linear latency, RPS = input RPS

2. **With Database**: User -> API Server -> PostgreSQL
   - Expected: DB becomes bottleneck at high RPS

3. **With Cache (Hot)**: User -> API Server -> Redis -> PostgreSQL
   - Setup: TTL=3600s, cardinality=10K, RPS=1000
   - Expected: ~99% cache hit rate, DB sees only ~10 RPS
   - Expected: Avg latency ~5ms (Redis) vs ~50ms (DB)

3b. **With Cache (Cold)**: User -> API Server -> Redis -> PostgreSQL
   - Setup: TTL=60s, cardinality=1M, RPS=100
   - Expected: ~0% cache hit rate, DB sees full load
   - Expected: Warning about ineffective cache configuration

4. **Horizontal Scaling**: User -> Load Balancer -> 3x API Server -> PostgreSQL
   - Expected: 3x throughput before DB bottleneck

5. **Async Processing**: User -> API Server -> Message Queue -> Worker -> PostgreSQL
   - Expected: Queue absorbs bursts, worker processes async

6. **CDN Offload**: User -> CDN -> API Server -> S3
   - Expected: High cache hit rate reduces origin traffic

7. **Missing Index**: User -> API Server -> PostgreSQL (query on non-indexed column)
   - Setup: Table with 1M rows, query WHERE on non-indexed `email` column
   - Expected: High latency (~10s per query), seq_scan detected
   - Expected: Warning with suggestion: "CREATE INDEX idx_users_email ON users(email)"
   - Compare: Add index, re-run simulation, latency drops to ~1ms

8. **Index Optimization**: User -> API Server -> PostgreSQL (compare indexed vs non-indexed)
   - Setup: Same table, same query, but with proper index
   - Expected: index_scan detected, latency ~1-5ms
   - Expected: No warnings

---

## Architecture Notes

- Simulation engine lives in `@sdcanvas/core` (headless, testable)
- CLI wraps engine for command-line use
- UI components in `src/components/Simulation/`
- Simulation state separate from canvas state (overlay, not modify)
- All simulation can run without UI (core + CLI)

---

## Future Enhancements

### Explicit Endpoint Operation Sequences

Currently, cache-through behavior is inferred from graph structure (endpoint → Redis AND → PostgreSQL). For more complex patterns, add explicit operation sequences:

```typescript
interface APIEndpoint {
  // ... existing fields
  operations?: EndpointOperation[];
}

type EndpointOperation =
  | {
      type: 'cache-read';
      targetNodeId: string;
      keyPattern: string;
      onMiss: 'continue' | 'stop';  // What to do on cache miss
    }
  | {
      type: 'cache-write';
      targetNodeId: string;
      keyPattern: string;
      condition: 'always' | 'on-miss';  // When to write
    }
  | {
      type: 'db-query';
      query: LinkedQuery;
      condition?: 'always' | 'on-cache-miss';
    }
  | {
      type: 'external-call';
      targetNodeId: string;
    };
```

**Example: Read-through cache**:
```typescript
operations: [
  { type: 'cache-read', targetNodeId: 'redis-1', keyPattern: 'user:{id}', onMiss: 'continue' },
  { type: 'db-query', query: {...}, condition: 'on-cache-miss' },
  { type: 'cache-write', targetNodeId: 'redis-1', keyPattern: 'user:{id}', condition: 'on-miss' }
]
```

**Example: Write-through cache**:
```typescript
operations: [
  { type: 'db-query', query: {...} },  // Always write to DB first
  { type: 'cache-write', targetNodeId: 'redis-1', keyPattern: 'user:{id}', condition: 'always' }
]
```

**Example: Cache-aside with background refresh**:
```typescript
operations: [
  { type: 'cache-read', targetNodeId: 'redis-1', keyPattern: 'user:{id}', onMiss: 'continue' },
  { type: 'db-query', query: {...}, condition: 'on-cache-miss' },
  { type: 'cache-write', targetNodeId: 'redis-1', keyPattern: 'user:{id}', condition: 'on-miss' },
  { type: 'queue-message', targetNodeId: 'queue-1', condition: 'on-cache-miss' }  // Trigger background refresh
]
```

**UI considerations**:
- Simple drag-and-drop sequence builder in API Designer modal
- Visual flow diagram showing operation order
- Condition dropdowns for each step
- Could auto-generate from current graph structure as starting point

**When to implement**: After Phase 1 validates the derived-inference approach. If users need more control over complex caching patterns, add this as a Phase 1.5 or Phase 2 enhancement.

---

## Success Criteria

- [x] Phase 1: `npm run cli -- simulate` works on example files
- [x] Phase 1: Can identify bottlenecks via CLI output
- [x] Phase 1: Missing index detection works with actionable suggestions
- [x] Phase 1: Query cost estimates reflect table size and index usage
- [x] Phase 1: Cache hit rate estimation based on TTL + cardinality
- [x] Phase 1: Cache-through pattern reduces simulated DB load
- [ ] Phase 2: Live animation runs smoothly at 60fps
- [ ] Phase 2: Can pause/resume simulation
- [ ] Phase 3: Graphs show meaningful data during simulation
- [ ] Phase 3: Can replay past simulations
- [ ] Phase 4: 3D view provides additional insight
- [x] All phases: Example canvases demonstrate each scenario
