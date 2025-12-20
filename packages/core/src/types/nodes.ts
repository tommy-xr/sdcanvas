import type { BaseNode } from './base.js';

export type SystemNodeType =
  | 'user'
  | 'loadBalancer'
  | 'cdn'
  | 'apiServer'
  | 'postgresql'
  | 's3Bucket'
  | 'redis'
  | 'messageQueue'
  | 'stickyNote';

export interface BaseNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

export interface UserNodeData extends BaseNodeData {
  clientType: 'browser' | 'mobile' | 'desktop';
}

export type ScalingConfig =
  | { type: 'single' }
  | { type: 'fixed'; instances: number }
  | { type: 'auto' };

export interface LoadBalancerNodeData extends BaseNodeData {
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
  scaling?: ScalingConfig;
}

export interface CDNCacheRule {
  id: string;
  pattern: string; // e.g., "/static/*", "*.jpg", "/api/v1/public/*"
  ttl?: number; // TTL in seconds
  description?: string;
}

export interface CDNNodeData extends BaseNodeData {
  provider?: 'cloudflare' | 'cloudfront' | 'akamai' | 'fastly' | 'generic';
  cacheRules?: CDNCacheRule[];
}

export interface APIServerNodeData extends BaseNodeData {
  endpoints: APIEndpoint[];
  scaling?: ScalingConfig;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ResponseType = 'json' | 'binary';

// Common binary content types
export type BinaryContentType =
  | 'application/octet-stream'
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'video/mp4'
  | 'video/webm'
  | 'application/zip'
  | 'text/plain'
  | 'text/csv'
  | string; // Allow custom content types

export interface APIEndpoint {
  id: string;
  method: HTTPMethod;
  path: string;
  description?: string;
  requestSchema?: SchemaDefinition;
  responseType?: ResponseType; // 'json' (default) or 'binary'
  responseSchema?: SchemaDefinition; // Used when responseType is 'json'
  responseContentType?: BinaryContentType; // Used when responseType is 'binary'
  linkedQueries?: LinkedQuery[];
}

// Schema definition for request/response bodies
export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SchemaProperty>;
  items?: SchemaDefinition; // for arrays
  required?: string[];
  example?: string;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  format?: string; // e.g., 'email', 'date-time', 'uuid'
  items?: SchemaProperty; // for arrays
  properties?: Record<string, SchemaProperty>; // for nested objects
}

// Link endpoints to database queries
export interface LinkedQuery {
  id: string;
  targetNodeId: string; // ID of the database node
  targetTableId: string; // ID of the table
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  description?: string;
}

// Common PostgreSQL column types
export type ColumnType =
  // Numeric types
  | 'serial'
  | 'bigserial'
  | 'smallint'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'double precision'
  // Character types
  | 'char'
  | 'varchar'
  | 'text'
  // Date/Time types
  | 'timestamp'
  | 'timestamptz'
  | 'date'
  | 'time'
  | 'timetz'
  | 'interval'
  // Boolean
  | 'boolean'
  // UUID
  | 'uuid'
  // JSON types
  | 'json'
  | 'jsonb'
  // Binary
  | 'bytea'
  // Array (represented as base type + array flag)
  | 'integer[]'
  | 'text[]'
  | 'varchar[]'
  | 'jsonb[]';

export type IndexType = 'btree' | 'hash' | 'gin' | 'gist' | 'brin';

export interface PostgreSQLNodeData extends BaseNodeData {
  tables: DatabaseTable[];
  estimatedRowCounts?: Record<string, number>; // tableId -> estimated rows
}

export interface DatabaseTable {
  id: string;
  name: string;
  columns: DatabaseColumn[];
  indexes: DatabaseIndex[];
  estimatedRows?: number;
}

export interface DatabaseColumn {
  id: string;
  name: string;
  type: ColumnType | string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: {
    tableId: string;
    columnId: string;
  };
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  length?: number; // for varchar(n), char(n)
}

export interface DatabaseIndex {
  id: string;
  name: string;
  columns: string[]; // column ids
  isUnique: boolean;
  type: IndexType;
  includeColumns?: string[]; // for covering indexes (INCLUDE clause)
}

// JOIN types for visualization
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

export interface JoinDefinition {
  id: string;
  leftTableId: string;
  rightTableId: string;
  joinType: JoinType;
  conditions: JoinCondition[];
}

export interface JoinCondition {
  leftColumnId: string;
  rightColumnId: string;
  operator: '=' | '<' | '>' | '<=' | '>=' | '<>';
}

// Query cost estimation types
export interface QueryCostEstimate {
  estimatedRows: number;
  estimatedCost: number;
  scanType: 'seq_scan' | 'index_scan' | 'index_only_scan' | 'bitmap_scan';
  usedIndexes: string[];
  warnings: string[];
}

export interface S3BucketNodeData extends BaseNodeData {
  bucketName: string;
  isPublic: boolean;
}

export interface RedisKey {
  id: string;
  pattern: string; // e.g., "trending:puzzles", "user:{user_id}:session"
  description?: string;
  valueType: 'string' | 'counter' | 'json' | 'list' | 'set' | 'hash' | 'sortedSet';
  valueSchema?: SchemaDefinition; // JSON schema for the value (when valueType is 'json', 'list', 'hash')
  ttl?: number; // TTL in seconds
}

export interface RedisNodeData extends BaseNodeData {
  maxMemory: string;
  evictionPolicy: 'noeviction' | 'allkeys-lru' | 'volatile-lru' | 'allkeys-random';
  keys?: RedisKey[];
}

export interface MessageQueueTopic {
  id: string;
  name: string;
  description?: string;
}

export interface MessageQueueNodeData extends BaseNodeData {
  provider?: 'sqs' | 'rabbitmq' | 'kafka' | 'pubsub' | 'generic';
  queueType?: 'standard' | 'fifo';
  topics?: MessageQueueTopic[];
}

export interface StickyNoteNodeData extends BaseNodeData {
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
}

export type SystemNodeData =
  | UserNodeData
  | LoadBalancerNodeData
  | CDNNodeData
  | APIServerNodeData
  | PostgreSQLNodeData
  | S3BucketNodeData
  | RedisNodeData
  | MessageQueueNodeData
  | StickyNoteNodeData;

/**
 * A system design node - uses our base types instead of xyflow
 */
export type SystemNode = BaseNode<SystemNodeData, SystemNodeType>;
