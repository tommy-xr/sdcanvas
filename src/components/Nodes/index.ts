import type { NodeTypes } from '@xyflow/react';
import { UserNode } from './UserNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { CDNNode } from './CDNNode';
import { APIServerNode } from './APIServerNode';
import { PostgreSQLNode } from './PostgreSQLNode';
import { S3BucketNode } from './S3BucketNode';
import { RedisNode } from './RedisNode';
import { StickyNoteNode } from './StickyNoteNode';

export const nodeTypes: NodeTypes = {
  user: UserNode,
  loadBalancer: LoadBalancerNode,
  cdn: CDNNode,
  apiServer: APIServerNode,
  postgresql: PostgreSQLNode,
  s3Bucket: S3BucketNode,
  redis: RedisNode,
  stickyNote: StickyNoteNode,
};

export {
  UserNode,
  LoadBalancerNode,
  CDNNode,
  APIServerNode,
  PostgreSQLNode,
  S3BucketNode,
  RedisNode,
  StickyNoteNode,
};
