import { useViewport, useNodes } from '@xyflow/react';
import { useSimulationStore } from '../../store/simulationStore';

/**
 * Calculate a point along a bezier curve
 */
function getBezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/**
 * Calculate control points for a bezier curve between two points
 */
function getBezierControlPoints(
  source: { x: number; y: number },
  target: { x: number; y: number }
): {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
} {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point offset - creates a nice curve
  const offset = Math.min(distance * 0.25, 50);

  return {
    p1: { x: source.x + offset, y: source.y },
    p2: { x: target.x - offset, y: target.y },
  };
}

interface AnimatedDotProps {
  sourceNode: { x: number; y: number; width: number; height: number };
  targetNode: { x: number; y: number; width: number; height: number };
  progress: number;
  multiplier: number;
  isResponse: boolean;
}

function AnimatedDot({ sourceNode, targetNode, progress, multiplier, isResponse }: AnimatedDotProps) {
  // Calculate edge endpoints at node borders, not centers
  const sourceCenter = {
    x: sourceNode.x + (sourceNode.width || 150) / 2,
    y: sourceNode.y + (sourceNode.height || 80) / 2,
  };
  const targetCenter = {
    x: targetNode.x + (targetNode.width || 150) / 2,
    y: targetNode.y + (targetNode.height || 80) / 2,
  };

  // Calculate direction from source to target
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const angle = Math.atan2(dy, dx);

  // Offset from center to edge of node (approximate as ellipse)
  const sourceHalfWidth = (sourceNode.width || 150) / 2;
  const sourceHalfHeight = (sourceNode.height || 80) / 2;
  const targetHalfWidth = (targetNode.width || 150) / 2;
  const targetHalfHeight = (targetNode.height || 80) / 2;

  // Start point: edge of source node facing target
  const source = {
    x: sourceCenter.x + Math.cos(angle) * sourceHalfWidth * 0.9,
    y: sourceCenter.y + Math.sin(angle) * sourceHalfHeight * 0.9,
  };

  // End point: edge of target node facing source
  const target = {
    x: targetCenter.x - Math.cos(angle) * targetHalfWidth * 0.9,
    y: targetCenter.y - Math.sin(angle) * targetHalfHeight * 0.9,
  };

  const { p1, p2 } = getBezierControlPoints(source, target);
  const pos = getBezierPoint(progress, source, p1, p2, target);

  // Size based on multiplier (larger dots = more requests)
  const baseSize = 8;
  const sizeMultiplier = Math.log10(multiplier + 1) / 3 + 0.5;
  const size = baseSize * sizeMultiplier;

  // Color based on request vs response
  // Requests: green (hue 120-140)
  // Responses: blue (hue 200-220)
  const hue = isResponse
    ? 200 + progress * 20  // Blue: 200 to 220
    : 120 + progress * 20; // Green: 120 to 140

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: `hsl(${hue}, 80%, 55%)`,
        boxShadow: `0 0 ${size * 2}px hsl(${hue}, 80%, 55%)`,
        opacity: 0.9,
      }}
    />
  );
}

export function RequestAnimation() {
  const { isRunning } = useSimulationStore();
  const liveRequests = useSimulationStore((state) => state.liveRequests);
  const nodes = useNodes();
  const viewport = useViewport();

  // Build node positions map - useNodes already triggers re-render on changes
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const node of nodes) {
    nodePositions.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width || 150,
      height: node.measured?.height || 80,
    });
  }

  if (!isRunning || liveRequests.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {/* Apply viewport transform to match ReactFlow canvas */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {liveRequests.map((request) => {
          const sourceNode = nodePositions.get(request.sourceNodeId);
          const targetNode = nodePositions.get(request.targetNodeId);

          if (!sourceNode || !targetNode) return null;

          return (
            <AnimatedDot
              key={request.id}
              sourceNode={sourceNode}
              targetNode={targetNode}
              progress={request.progress}
              multiplier={request.requestMultiplier}
              isResponse={request.isResponse}
            />
          );
        })}
      </div>
    </div>
  );
}
