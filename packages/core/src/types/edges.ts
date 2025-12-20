import type { BaseEdge } from './base.js';

export type ConnectionType = 'http' | 'websocket' | 'database' | 'cache';

export type DatabaseQueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface ConnectionData {
  label?: string;
  connectionType: ConnectionType;
  // HTTP specific
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  // Database specific
  queryType?: DatabaseQueryType;
  tableName?: string;
  // WebSocket specific
  eventName?: string;
  // General
  description?: string;
  [key: string]: unknown;
}

// Connection validation rules
export interface ConnectionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * A system design edge/connection - uses our base types instead of xyflow
 */
export type SystemEdge = BaseEdge<ConnectionData>;
