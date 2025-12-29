# Error Animation & Validation Plan

## Overview

Add visual feedback for dropped/failed requests ("evaporating red dot") and create a test canvas + CLI validation for error scenarios.

## Part 1: Create Overload Test Canvas

**File:** `examples/sim-overload.json`

Create a simple canvas designed to trigger request drops:
- User node → API Server (single instance, low capacity)
- API Server configured with `maxRps: 100` so that at 1000 RPS it becomes severely overloaded (10x capacity = loadFactor of 10.0)
- This will trigger the drop condition: `loadFactor > 1.5`

**Expected behavior at 1000 RPS:**
- API server at 1000% capacity (loadFactor = 10.0)
- Drop probability: `random() < (10.0 - 1.5)` = ~100% drop rate
- `entryPointMetrics.successRate` should be very low (~0%)

## Part 2: Extend CLI Test Validation

**File:** `package.json`

Enhance `test:simulate` to validate simulation outcomes:

1. Add a companion metadata file pattern: `examples/sim-*.expected.json` containing expected thresholds:
   ```json
   {
     "successRate": { "max": 0.1 },
     "failedRequests": { "min": 1 }
   }
   ```

2. Or simpler approach: Add a new script `test:simulate:validate` that:
   - Runs simulations with `--json` output
   - Parses results and checks `entryPointMetrics`
   - For `sim-overload.json`: assert `successRate < 0.5` and `failedRequests > 0`
   - For existing files: assert `successRate > 0.9` (they should succeed)

**Recommended:** Create a simple Node.js validation script at `scripts/validate-simulations.js` that:
- Runs each sim-*.json with `--json` flag
- Checks success rate thresholds based on filename pattern (e.g., `sim-overload-*` expects failures)
- Reports pass/fail with details

## Part 3: Error Animation in UI

### 3.1 Add Error State to LiveRequest

**File:** `src/store/simulationStore.ts`

Extend `LiveRequest` interface:
```typescript
export interface LiveRequest {
  // ... existing fields
  status: 'active' | 'failed' | 'completing';  // NEW
  failedAt?: number;  // timestamp when marked failed (for fade animation)
}
```

### 3.2 Determine Which Requests Fail

**File:** `src/store/simulationStore.ts` (in `tick` function)

When a request reaches a node, check if it should fail based on node's error rate:
- Get `liveNodeMetrics[targetNodeId].errorRate`
- If `Math.random() < errorRate`, mark request as `status: 'failed'`
- Set `failedAt = currentTime`

Failed requests don't reverse as responses - they evaporate at the node.

### 3.3 Evaporating Animation

**File:** `src/components/Simulation/RequestAnimation.tsx`

For requests with `status: 'failed'`:
1. Calculate time since `failedAt` (e.g., 0.5 second fade duration)
2. Apply CSS transition:
   - Color: shift to red (hue ~0)
   - Opacity: fade from 1.0 to 0.0
   - Scale: shrink from 1.0 to 0.5
3. Remove request from store after fade completes

```typescript
// Color for failed requests
if (status === 'failed') {
  const fadeProgress = (currentTime - failedAt) / 0.5; // 0.5s fade
  const opacity = 1 - fadeProgress;
  const scale = 1 - fadeProgress * 0.5;
  return {
    color: `hsla(0, 80%, 55%, ${opacity})`,  // Red, fading
    transform: `scale(${scale})`,
  };
}
```

### 3.4 Cleanup Failed Requests

**File:** `src/store/simulationStore.ts`

In the `tick` function, filter out requests where:
- `status === 'failed'` AND `currentTime - failedAt > 0.5`

## Files to Modify

| File | Changes |
|------|---------|
| `examples/sim-overload.json` | New file - overload test scenario |
| `scripts/validate-simulations.js` | New file - validation script |
| `package.json` | Update test:simulate script |
| `src/store/simulationStore.ts` | Add status field, failure detection, cleanup |
| `src/components/Simulation/RequestAnimation.tsx` | Red evaporating animation |

## Implementation Order

1. **Create test canvas** (`sim-overload.json`) - can immediately test via CLI
2. **Add CLI validation script** - verify errors are detected in data model
3. **Add error state to store** - track failed requests
4. **Add evaporating animation** - visual feedback
5. **Test end-to-end** - run simulation in UI, observe red dots

## Validation Criteria

- [x] `npm run test:simulate` passes with new overload scenario
- [x] `sim-overload.json` at 5000 RPS produces `successRate < 0.5` (actual: 39.9%)
- [x] Existing `sim-*.json` files continue to pass (successRate > 0.9)
- [x] UI shows red evaporating dots when running overload scenario
