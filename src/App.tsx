import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas/Canvas';
import { ComponentPalette } from './components/Sidebar/ComponentPalette';
import { PropertiesPanel } from './components/Sidebar/PropertiesPanel';
import { Header } from './components/Header/Header';
import { SchemaDesignerModal } from './components/SchemaDesigner';
import { useCanvasStore } from './store/canvasStore';
import type { PostgreSQLNodeData } from './types/nodes';

function AppContent() {
  const [schemaDesignerNodeId, setSchemaDesignerNodeId] = useState<string | null>(null);
  const { nodes, updateNode } = useCanvasStore();

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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette />
        <Canvas onOpenSchemaDesigner={handleOpenSchemaDesigner} />
        <PropertiesPanel onOpenSchemaDesigner={handleOpenSchemaDesigner} />
      </div>

      {schemaDesignerNode && (
        <SchemaDesignerModal
          isOpen={true}
          onClose={handleCloseSchemaDesigner}
          data={schemaDesignerNode.data as PostgreSQLNodeData}
          onUpdate={handleUpdateSchemaDesigner}
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
