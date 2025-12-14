import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas/Canvas';
import { ComponentPalette } from './components/Sidebar/ComponentPalette';
import { PropertiesPanel } from './components/Sidebar/PropertiesPanel';

function App() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen bg-slate-900">
        <ComponentPalette />
        <Canvas />
        <PropertiesPanel />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
