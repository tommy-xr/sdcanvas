import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { SystemNode } from '../types/nodes';
import type { SystemEdge, ConnectionData, ConnectionValidation } from '../types/edges';
import { validateConnection, suggestConnectionType } from '../utils/connectionValidation';

interface CanvasState {
  nodes: SystemNode[];
  edges: SystemEdge[];
  selectedNodeId: string | null;
  fileName: string;
  lastConnectionValidation: ConnectionValidation | null;

  // Actions
  setNodes: (nodes: SystemNode[]) => void;
  setEdges: (edges: SystemEdge[]) => void;
  setFileName: (name: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: SystemNode) => void;
  updateNode: (nodeId: string, data: Partial<SystemNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  clearCanvas: () => void;
  clearLastValidation: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      fileName: 'Untitled Design',
      lastConnectionValidation: null,

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setFileName: (fileName) => set({ fileName }),

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes) as SystemNode[],
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges) as SystemEdge[],
        });
      },

      onConnect: (connection) => {
        const nodes = get().nodes;
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) return;

        // Get the suggested connection type
        const connectionType = suggestConnectionType(sourceNode, targetNode);

        // Validate the connection
        const validation = validateConnection(sourceNode, targetNode, connectionType);

        // Store validation result (for showing warnings/errors)
        set({ lastConnectionValidation: validation });

        // If invalid, don't create the connection
        if (!validation.isValid) {
          return;
        }

        const newEdge: SystemEdge = {
          ...connection,
          id: `edge-${Date.now()}`,
          source: connection.source || '',
          target: connection.target || '',
          data: {
            connectionType,
            label: connectionType === 'http' ? 'HTTP' : connectionType === 'database' ? 'Query' : connectionType.toUpperCase(),
          } as ConnectionData,
        };
        set({
          edges: addEdge(newEdge, get().edges) as SystemEdge[],
        });
      },

      clearLastValidation: () => set({ lastConnectionValidation: null }),

      addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
      },

      updateNode: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        });
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          selectedNodeId:
            get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
      },

      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

      clearCanvas: () => set({ nodes: [], edges: [], selectedNodeId: null }),
    }),
    {
      name: 'system-designer-canvas',
    }
  )
);
