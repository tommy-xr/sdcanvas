import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas/Canvas';
import { ComponentPalette } from './components/Sidebar/ComponentPalette';
import { PropertiesPanel } from './components/Sidebar/PropertiesPanel';
import { Header } from './components/Header/Header';

function App() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-900">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <ComponentPalette />
          <Canvas />
          <PropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
