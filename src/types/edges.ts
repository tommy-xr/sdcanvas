import type { Edge } from '@xyflow/react';

export type ConnectionType = 'http' | 'websocket' | 'database' | 'cache';

export interface ConnectionData {
  label?: string;
  connectionType: ConnectionType;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  [key: string]: unknown;
}

export type SystemEdge = Edge<ConnectionData>;
