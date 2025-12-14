import type { NodeTypes } from '@xyflow/react';
import { UserNode } from './UserNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { APIServerNode } from './APIServerNode';
import { PostgreSQLNode } from './PostgreSQLNode';
import { S3BucketNode } from './S3BucketNode';
import { RedisNode } from './RedisNode';

export const nodeTypes: NodeTypes = {
  user: UserNode,
  loadBalancer: LoadBalancerNode,
  apiServer: APIServerNode,
  postgresql: PostgreSQLNode,
  s3Bucket: S3BucketNode,
  redis: RedisNode,
};

export {
  UserNode,
  LoadBalancerNode,
  APIServerNode,
  PostgreSQLNode,
  S3BucketNode,
  RedisNode,
};
