import type { Node } from '@xyflow/react';

export type SystemNodeType =
  | 'user'
  | 'loadBalancer'
  | 'apiServer'
  | 'postgresql'
  | 's3Bucket'
  | 'redis';

export interface BaseNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

export interface UserNodeData extends BaseNodeData {
  clientType: 'browser' | 'mobile' | 'desktop';
}

export interface LoadBalancerNodeData extends BaseNodeData {
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
}

export interface APIServerNodeData extends BaseNodeData {
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
}

export interface PostgreSQLNodeData extends BaseNodeData {
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  id: string;
  name: string;
  columns: DatabaseColumn[];
  indexes: DatabaseIndex[];
}

export interface DatabaseColumn {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: {
    tableId: string;
    columnId: string;
  };
  isNullable: boolean;
  isUnique: boolean;
}

export interface DatabaseIndex {
  id: string;
  name: string;
  columns: string[];
  isUnique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface S3BucketNodeData extends BaseNodeData {
  bucketName: string;
  isPublic: boolean;
}

export interface RedisNodeData extends BaseNodeData {
  maxMemory: string;
  evictionPolicy: 'noeviction' | 'allkeys-lru' | 'volatile-lru' | 'allkeys-random';
}

export type SystemNodeData =
  | UserNodeData
  | LoadBalancerNodeData
  | APIServerNodeData
  | PostgreSQLNodeData
  | S3BucketNodeData
  | RedisNodeData;

export type SystemNode = Node<SystemNodeData, SystemNodeType>;
