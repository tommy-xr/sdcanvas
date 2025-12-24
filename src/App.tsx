import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas/Canvas';
import { ComponentPalette } from './components/Sidebar/ComponentPalette';
import { PropertiesPanel } from './components/Sidebar/PropertiesPanel';
import { Header } from './components/Header/Header';
import { SchemaDesignerModal } from './components/SchemaDesigner';
import { APIDesignerModal } from './components/APIDesigner';
import { RedisKeyDesignerModal } from './components/RedisKeyDesigner';
import { BottomPanel } from './components/BottomPanel';
import { useCanvasStore } from './store/canvasStore';
import type { PostgreSQLNodeData, APIServerNodeData, RedisNodeData } from './types/nodes';

function AppContent() {
  const [schemaDesignerNodeId, setSchemaDesignerNodeId] = useState<string | null>(null);
  const [apiDesignerNodeId, setApiDesignerNodeId] = useState<string | null>(null);
  const [redisKeyDesignerNodeId, setRedisKeyDesignerNodeId] = useState<string | null>(null);
  const { nodes, updateNode } = useCanvasStore();

  // Schema Designer
  const schemaDesignerNode = schemaDesignerNodeId
    ? nodes.find((n) => n.id === schemaDesignerNodeId && n.type === 'postgresql')
    : null;

  const handleOpenSchemaDesigner = useCallback((nodeId: string) => {
    setSchemaDesignerNodeId(nodeId);
  }, []);

  const handleCloseSchemaDesigner = useCallback(() => {
    setSchemaDesignerNodeId(null);
  }, []);

  const handleUpdateSchemaDesigner = useCallback(
    (data: Partial<PostgreSQLNodeData>) => {
      if (schemaDesignerNodeId) {
        updateNode(schemaDesignerNodeId, data);
      }
    },
    [schemaDesignerNodeId, updateNode]
  );

  // API Designer
  const apiDesignerNode = apiDesignerNodeId
    ? nodes.find((n) => n.id === apiDesignerNodeId && n.type === 'apiServer')
    : null;

  const handleOpenAPIDesigner = useCallback((nodeId: string) => {
    setApiDesignerNodeId(nodeId);
  }, []);

  const handleCloseAPIDesigner = useCallback(() => {
    setApiDesignerNodeId(null);
  }, []);

  const handleUpdateAPIDesigner = useCallback(
    (data: Partial<APIServerNodeData>) => {
      if (apiDesignerNodeId) {
        updateNode(apiDesignerNodeId, data);
      }
    },
    [apiDesignerNodeId, updateNode]
  );

  // Redis Key Designer
  const redisKeyDesignerNode = redisKeyDesignerNodeId
    ? nodes.find((n) => n.id === redisKeyDesignerNodeId && n.type === 'redis')
    : null;

  const handleOpenRedisKeyDesigner = useCallback((nodeId: string) => {
    setRedisKeyDesignerNodeId(nodeId);
  }, []);

  const handleCloseRedisKeyDesigner = useCallback(() => {
    setRedisKeyDesignerNodeId(null);
  }, []);

  const handleUpdateRedisKeyDesigner = useCallback(
    (data: Partial<RedisNodeData>) => {
      if (redisKeyDesignerNodeId) {
        updateNode(redisKeyDesignerNodeId, data);
      }
    },
    [redisKeyDesignerNodeId, updateNode]
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette />
        <div className="flex-1 relative p-3">
          <Canvas
            onOpenSchemaDesigner={handleOpenSchemaDesigner}
            onOpenAPIDesigner={handleOpenAPIDesigner}
            onOpenRedisKeyDesigner={handleOpenRedisKeyDesigner}
          />
        </div>
        <PropertiesPanel
          onOpenSchemaDesigner={handleOpenSchemaDesigner}
          onOpenAPIDesigner={handleOpenAPIDesigner}
          onOpenRedisKeyDesigner={handleOpenRedisKeyDesigner}
        />
      </div>
      <BottomPanel />

      {schemaDesignerNode && (
        <SchemaDesignerModal
          isOpen={true}
          onClose={handleCloseSchemaDesigner}
          data={schemaDesignerNode.data as PostgreSQLNodeData}
          onUpdate={handleUpdateSchemaDesigner}
        />
      )}

      {apiDesignerNode && (
        <APIDesignerModal
          isOpen={true}
          onClose={handleCloseAPIDesigner}
          data={apiDesignerNode.data as APIServerNodeData}
          onUpdate={handleUpdateAPIDesigner}
          allNodes={nodes}
        />
      )}

      {redisKeyDesignerNode && (
        <RedisKeyDesignerModal
          isOpen={true}
          onClose={handleCloseRedisKeyDesigner}
          data={redisKeyDesignerNode.data as RedisNodeData}
          onUpdate={handleUpdateRedisKeyDesigner}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
