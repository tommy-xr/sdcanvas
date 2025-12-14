import type { DragEvent } from 'react';
import {
  Monitor,
  Network,
  Server,
  Database,
  HardDrive,
  Zap,
} from 'lucide-react';
import type { SystemNodeType } from '../../types/nodes';

interface ComponentDefinition {
  type: SystemNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, unknown>;
}

const components: ComponentDefinition[] = [
  {
    type: 'user',
    label: 'User Client',
    icon: <Monitor size={20} />,
    color: '#22c55e',
    defaultData: {
      label: 'Client',
      clientType: 'browser',
    },
  },
  {
    type: 'loadBalancer',
    label: 'Load Balancer',
    icon: <Network size={20} />,
    color: '#f59e0b',
    defaultData: {
      label: 'Load Balancer',
      algorithm: 'round-robin',
    },
  },
  {
    type: 'apiServer',
    label: 'API Server',
    icon: <Server size={20} />,
    color: '#3b82f6',
    defaultData: {
      label: 'API Server',
      endpoints: [],
    },
  },
  {
    type: 'postgresql',
    label: 'PostgreSQL',
    icon: <Database size={20} />,
    color: '#336791',
    defaultData: {
      label: 'PostgreSQL',
      tables: [],
    },
  },
  {
    type: 's3Bucket',
    label: 'S3 Bucket',
    icon: <HardDrive size={20} />,
    color: '#ff9900',
    defaultData: {
      label: 'S3 Bucket',
      bucketName: 'my-bucket',
      isPublic: false,
    },
  },
  {
    type: 'redis',
    label: 'Redis Cache',
    icon: <Zap size={20} />,
    color: '#dc382d',
    defaultData: {
      label: 'Redis',
      maxMemory: '256MB',
      evictionPolicy: 'allkeys-lru',
    },
  },
];

function DraggableComponent({ component }: { component: ComponentDefinition }) {
  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('application/reactflow', component.type);
    event.dataTransfer.setData(
      'application/nodedata',
      JSON.stringify(component.defaultData)
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-4 px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600
                 cursor-grab hover:bg-slate-700 hover:border-slate-500 transition-colors
                 active:cursor-grabbing"
    >
      <div
        className="p-2.5 rounded-lg shrink-0"
        style={{ backgroundColor: `${component.color}20`, color: component.color }}
      >
        {component.icon}
      </div>
      <span className="text-sm font-medium text-slate-200">{component.label}</span>
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div className="w-72 bg-slate-800 border-r border-slate-700 p-5 flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-2">Components</h2>
      <p className="text-xs text-slate-400 mb-5">
        Drag components onto the canvas to build your system design.
      </p>
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {components.map((component) => (
          <DraggableComponent key={component.type} component={component} />
        ))}
      </div>
    </div>
  );
}
