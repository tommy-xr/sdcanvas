import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import type { NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { nodeTypes } from '../Nodes';
import { edgeTypes } from '../Edges';
import type { SystemNode, SystemNodeType } from '../../types/nodes';

export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
  } = useCanvasStore();

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as SystemNodeType;
      if (!type) return;

      const nodeData = JSON.parse(
        event.dataTransfer.getData('application/nodedata')
      );

      const position = {
        x: event.clientX - 280,
        y: event.clientY - 50,
      };

      const newNode: SystemNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      useCanvasStore.getState().addNode(newNode);
    },
    []
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'labeled',
        }}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls className="!bg-slate-800 !border-slate-600 !rounded-lg" />
        <MiniMap
          className="!bg-slate-800 !border-slate-600 !rounded-lg"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              user: '#22c55e',
              loadBalancer: '#f59e0b',
              apiServer: '#3b82f6',
              postgresql: '#336791',
              s3Bucket: '#ff9900',
              redis: '#dc382d',
            };
            return colors[node.type || ''] || '#64748b';
          }}
        />
      </ReactFlow>
    </div>
  );
}
