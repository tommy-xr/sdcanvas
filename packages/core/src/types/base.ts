/**
 * Base types for sdcanvas that don't depend on any UI framework.
 * These are designed to be compatible with @xyflow/react when used in the UI,
 * but can be used headlessly in CLI tools and simulations.
 */

/**
 * 2D position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Viewport state for pan and zoom
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Base node structure compatible with xyflow
 */
export interface BaseNode<TData = unknown, TType extends string = string> {
  id: string;
  type: TType;
  position: Position;
  data: TData;
  // Optional fields that xyflow uses
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
  measured?: { width?: number; height?: number };
}

/**
 * Base edge structure compatible with xyflow
 */
export interface BaseEdge<TData = unknown> {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: TData;
  // Optional fields
  selected?: boolean;
  animated?: boolean;
  type?: string;
}
