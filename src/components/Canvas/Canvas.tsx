import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { nodeTypes } from '../Nodes';
import { edgeTypes } from '../Edges';
import type { SystemNode, SystemNodeType } from '../../types/nodes';

interface CanvasProps {
  onOpenSchemaDesigner: (nodeId: string) => void;
  onOpenAPIDesigner: (nodeId: string) => void;
  onOpenRedisKeyDesigner: (nodeId: string) => void;
}

export function Canvas({ onOpenSchemaDesigner, onOpenAPIDesigner, onOpenRedisKeyDesigner }: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
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

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type === 'postgresql') {
        onOpenSchemaDesigner(node.id);
      } else if (node.type === 'apiServer') {
        onOpenAPIDesigner(node.id);
      } else if (node.type === 'redis') {
        onOpenRedisKeyDesigner(node.id);
      }
    },
    [onOpenSchemaDesigner, onOpenAPIDesigner, onOpenRedisKeyDesigner]
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

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: SystemNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      useCanvasStore.getState().addNode(newNode);
      setSelectedNodeId(newNode.id);
    },
    [screenToFlowPosition, setSelectedNodeId]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
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
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
        <Controls className="!bg-white !border-gray-200 !rounded-lg" />
      </ReactFlow>
    </div>
  );
}
