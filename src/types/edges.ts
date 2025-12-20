import type { Edge } from '@xyflow/react';

// Re-export all data types from @sdcanvas/core
export type {
  ConnectionType,
  DatabaseQueryType,
  ConnectionData,
  ConnectionValidation,
} from '@sdcanvas/core';

import type { ConnectionData } from '@sdcanvas/core';

// Use xyflow's Edge type for UI compatibility
export type SystemEdge = Edge<ConnectionData>;
