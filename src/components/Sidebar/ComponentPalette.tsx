import { useState, type DragEvent } from 'react';
import {
  Monitor,
  Network,
  Globe,
  Server,
  Database,
  HardDrive,
  Zap,
  MessageSquare,
  StickyNote,
  ChevronDown,
} from 'lucide-react';
import type { SystemNodeType } from '../../types/nodes';

interface ComponentDefinition {
  type: SystemNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, unknown>;
}

interface ComponentSection {
  title: string;
  components: ComponentDefinition[];
}

const sections: ComponentSection[] = [
  {
    title: 'General',
    components: [
      {
        type: 'stickyNote',
        label: 'Sticky Note',
        icon: <StickyNote size={20} />,
        color: '#eab308',
        defaultData: {
          label: 'Note',
          content: '',
          color: 'yellow',
        },
      },
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
        type: 'apiServer',
        label: 'API Server',
        icon: <Server size={20} />,
        color: '#3b82f6',
        defaultData: {
          label: 'API Server',
          endpoints: [],
        },
      },
    ],
  },
  {
    title: 'Backend',
    components: [
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
        type: 'cdn',
        label: 'CDN',
        icon: <Globe size={20} />,
        color: '#8b5cf6',
        defaultData: {
          label: 'CDN',
          provider: 'generic',
          cacheRules: [],
        },
      },
      {
        type: 'postgresql',
        label: 'Relational DB',
        icon: <Database size={20} />,
        color: '#336791',
        defaultData: {
          label: 'Database',
          tables: [],
        },
      },
      {
        type: 's3Bucket',
        label: 'Blob Storage',
        icon: <HardDrive size={20} />,
        color: '#ff9900',
        defaultData: {
          label: 'Blob Storage',
          bucketName: 'my-bucket',
          isPublic: false,
        },
      },
      {
        type: 'redis',
        label: 'Cache',
        icon: <Zap size={20} />,
        color: '#dc382d',
        defaultData: {
          label: 'Cache',
          maxMemory: '256MB',
          evictionPolicy: 'allkeys-lru',
        },
      },
      {
        type: 'messageQueue',
        label: 'Message Queue',
        icon: <MessageSquare size={20} />,
        color: '#ec4899',
        defaultData: {
          label: 'Queue',
          provider: 'generic',
          queueType: 'standard',
          topics: [],
        },
      },
    ],
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
      className="flex items-center gap-4 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200
                 cursor-grab hover:bg-gray-100 hover:border-gray-300 transition-colors
                 active:cursor-grabbing"
    >
      <div
        className="p-2.5 rounded-lg shrink-0"
        style={{ backgroundColor: `${component.color}20`, color: component.color }}
      >
        {component.icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{component.label}</span>
    </div>
  );
}

function AccordionSection({ section, defaultOpen = false }: { section: ComponentSection; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-6 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">{section.title}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[1000px] opacity-100 pb-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2 px-6">
          {section.components.map((component) => (
            <DraggableComponent key={component.type} component={component} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Components</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Drag components onto the canvas to build your system design.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto pb-5">
        {sections.map((section, index) => (
          <AccordionSection key={section.title} section={section} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}
