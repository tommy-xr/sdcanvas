import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { SystemNode } from '../types/nodes';
import type { SystemEdge, ConnectionData } from '../types/edges';

interface CanvasState {
  nodes: SystemNode[];
  edges: SystemEdge[];
  selectedNodeId: string | null;
  fileName: string;

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
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      fileName: 'Untitled Design',

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
        const newEdge: SystemEdge = {
          ...connection,
          id: `edge-${Date.now()}`,
          source: connection.source || '',
          target: connection.target || '',
          data: {
            connectionType: 'http',
            label: 'HTTP',
          } as ConnectionData,
        };
        set({
          edges: addEdge(newEdge, get().edges) as SystemEdge[],
        });
      },

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
