import type { SystemNode, SystemNodeType } from '../types/nodes';
import type { ConnectionValidation, ConnectionType } from '../types/edges';

// Define valid connection rules between node types
// Format: sourceType -> { targetType: allowedConnectionTypes[] }
const connectionRules: Record<
  SystemNodeType,
  Record<SystemNodeType, ConnectionType[]>
> = {
  user: {
    user: [],
    loadBalancer: ['http', 'websocket'],
    cdn: ['http'], // Users connect to CDN
    apiServer: ['http', 'websocket'], // Direct connection allowed but with warning
    postgresql: [],
    s3Bucket: ['http'], // Direct CDN access
    redis: [],
    stickyNote: [],
  },
  loadBalancer: {
    user: [],
    loadBalancer: ['http'], // LB chaining
    cdn: [],
    apiServer: ['http', 'websocket'],
    postgresql: [],
    s3Bucket: [],
    redis: [],
    stickyNote: [],
  },
  cdn: {
    user: [],
    loadBalancer: ['http'], // CDN forwards to load balancer (origin)
    cdn: [],
    apiServer: ['http'], // CDN can connect to API server as origin
    postgresql: [],
    s3Bucket: ['http'], // CDN can pull from S3 origin
    redis: [],
    stickyNote: [],
  },
  apiServer: {
    user: [],
    loadBalancer: ['http'], // Response back through LB
    cdn: [],
    apiServer: ['http'], // Service-to-service (with warning if no LB)
    postgresql: ['database'],
    s3Bucket: ['http'],
    redis: ['cache'],
    stickyNote: [],
  },
  postgresql: {
    user: [],
    loadBalancer: [],
    cdn: [],
    apiServer: [],
    postgresql: ['database'], // Replication
    s3Bucket: [],
    redis: [],
    stickyNote: [],
  },
  s3Bucket: {
    user: [],
    loadBalancer: [],
    cdn: [],
    apiServer: [],
    postgresql: [],
    s3Bucket: [],
    redis: [],
    stickyNote: [],
  },
  redis: {
    user: [],
    loadBalancer: [],
    cdn: [],
    apiServer: [],
    postgresql: [],
    s3Bucket: [],
    redis: ['cache'], // Redis cluster
    stickyNote: [],
  },
  stickyNote: {
    user: [],
    loadBalancer: [],
    cdn: [],
    apiServer: [],
    postgresql: [],
    s3Bucket: [],
    redis: [],
    stickyNote: [],
  },
};

// Warnings for specific connection patterns
const connectionWarnings: Record<string, string> = {
  'user->apiServer': 'Consider routing through a load balancer for better reliability',
  'apiServer->apiServer': 'Service-to-service calls should typically go through a load balancer or service mesh',
};

export function validateConnection(
  sourceNode: SystemNode,
  targetNode: SystemNode,
  connectionType: ConnectionType
): ConnectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourceType = sourceNode.type as SystemNodeType;
  const targetType = targetNode.type as SystemNodeType;

  // Check if connection is to self
  if (sourceNode.id === targetNode.id) {
    errors.push('Cannot connect a node to itself');
    return { isValid: false, errors, warnings };
  }

  // Check if connection type is allowed
  const allowedTypes = connectionRules[sourceType]?.[targetType] || [];

  if (allowedTypes.length === 0) {
    errors.push(
      `Cannot connect ${formatNodeType(sourceType)} to ${formatNodeType(targetType)}`
    );
  } else if (!allowedTypes.includes(connectionType)) {
    errors.push(
      `${formatConnectionType(connectionType)} connection not allowed between ${formatNodeType(sourceType)} and ${formatNodeType(targetType)}. Allowed: ${allowedTypes.map(formatConnectionType).join(', ')}`
    );
  }

  // Check for warnings
  const warningKey = `${sourceType}->${targetType}`;
  if (connectionWarnings[warningKey]) {
    warnings.push(connectionWarnings[warningKey]);
  }

  // Specific validation rules
  if (sourceType === 'user' && targetType === 'postgresql') {
    errors.push('Clients should not connect directly to databases. Use an API server.');
  }

  if (sourceType === 'user' && targetType === 'redis') {
    errors.push('Clients should not connect directly to cache servers. Use an API server.');
  }

  if (sourceType === 'loadBalancer' && targetType === 'postgresql') {
    errors.push('Load balancers should not connect directly to databases.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getValidConnectionTypes(
  sourceNode: SystemNode,
  targetNode: SystemNode
): ConnectionType[] {
  const sourceType = sourceNode.type as SystemNodeType;
  const targetType = targetNode.type as SystemNodeType;

  return connectionRules[sourceType]?.[targetType] || [];
}

export function suggestConnectionType(
  sourceNode: SystemNode,
  targetNode: SystemNode
): ConnectionType {
  const validTypes = getValidConnectionTypes(sourceNode, targetNode);

  // Return the first valid type, or 'http' as default
  return validTypes[0] || 'http';
}

function formatNodeType(type: SystemNodeType): string {
  const names: Record<SystemNodeType, string> = {
    user: 'User Client',
    loadBalancer: 'Load Balancer',
    cdn: 'CDN',
    apiServer: 'API Server',
    postgresql: 'Database',
    s3Bucket: 'Blob Storage',
    redis: 'Cache',
    stickyNote: 'Sticky Note',
  };
  return names[type] || type;
}

function formatConnectionType(type: ConnectionType): string {
  const names: Record<ConnectionType, string> = {
    http: 'HTTP',
    websocket: 'WebSocket',
    database: 'Database',
    cache: 'Cache',
  };
  return names[type] || type;
}
