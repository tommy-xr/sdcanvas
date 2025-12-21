import { useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useSimulationStore, type LiveNodeMetrics } from '../../store/simulationStore';

interface MetricsBadgeProps {
  nodePosition: { x: number; y: number; width: number; height: number };
  metrics: LiveNodeMetrics;
}

function MetricsBadge({ nodePosition, metrics }: MetricsBadgeProps) {
  const statusColors = {
    healthy: {
      bg: 'bg-green-500',
      border: 'border-green-600',
      glow: 'shadow-green-500/30',
    },
    warning: {
      bg: 'bg-yellow-500',
      border: 'border-yellow-600',
      glow: 'shadow-yellow-500/30',
    },
    critical: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      glow: 'shadow-red-500/30',
    },
  };

  const colors = statusColors[metrics.status];

  // Format RPS display
  const formatRps = (rps: number) => {
    if (rps >= 1000) {
      return `${(rps / 1000).toFixed(1)}K`;
    }
    return Math.round(rps).toString();
  };

  // Format latency display
  const formatLatency = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  return (
    <>
      {/* RPS Badge - top right corner of node */}
      <div
        className={`
          absolute pointer-events-none
          px-2 py-0.5 rounded-full text-xs font-bold text-white
          ${colors.bg} ${colors.border} border
          shadow-lg ${colors.glow}
        `}
        style={{
          left: nodePosition.x + nodePosition.width - 20,
          top: nodePosition.y - 12,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatRps(metrics.rps)} RPS
      </div>

      {/* Metrics panel - below node */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: nodePosition.x,
          top: nodePosition.y + nodePosition.height + 4,
          width: nodePosition.width,
        }}
      >
        <div className="bg-gray-900/90 rounded-lg px-2 py-1.5 text-xs">
          {/* CPU Bar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400 w-12">CPU</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  metrics.cpuPercent > 100
                    ? 'bg-red-500'
                    : metrics.cpuPercent > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, metrics.cpuPercent)}%` }}
              />
            </div>
            <span className="text-gray-300 w-10 text-right">
              {Math.round(metrics.cpuPercent)}%
            </span>
          </div>

          {/* Memory Bar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400 w-12">Mem</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  metrics.memoryPercent > 90
                    ? 'bg-red-500'
                    : metrics.memoryPercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, metrics.memoryPercent)}%` }}
              />
            </div>
            <span className="text-gray-300 w-10 text-right">
              {Math.round(metrics.memoryPercent)}%
            </span>
          </div>

          {/* Latency */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-12">Lat</span>
            <span className={`text-sm font-medium ${
              metrics.latencyMs > 500
                ? 'text-red-400'
                : metrics.latencyMs > 100
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {formatLatency(metrics.latencyMs)}
            </span>
            {metrics.errorRate > 0 && (
              <span className="ml-auto text-red-400">
                {(metrics.errorRate * 100).toFixed(1)}% err
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status glow around node */}
      <div
        className={`
          absolute pointer-events-none rounded-xl
          border-2 ${colors.border}
          ${colors.glow} shadow-lg
        `}
        style={{
          left: nodePosition.x - 4,
          top: nodePosition.y - 4,
          width: nodePosition.width + 8,
          height: nodePosition.height + 8,
          opacity: 0.6,
        }}
      />
    </>
  );
}

export function LiveMetricsOverlay() {
  const { isRunning } = useSimulationStore();
  const liveMetrics = useSimulationStore((state) => state.liveMetrics);
  const { getNodes } = useReactFlow();
  const viewport = useViewport();

  const nodePositions = useMemo(() => {
    const nodes = getNodes();
    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

    for (const node of nodes) {
      // Skip sticky notes
      if (node.type === 'stickyNote') continue;

      positions.set(node.id, {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width || 150,
        height: node.measured?.height || 80,
      });
    }

    return positions;
  }, [getNodes]);

  if (!isRunning) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 4 }}
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
        {Object.entries(liveMetrics).map(([nodeId, metrics]) => {
          const nodePosition = nodePositions.get(nodeId);
          if (!nodePosition) return null;

          return (
            <MetricsBadge
              key={nodeId}
              nodePosition={nodePosition}
              metrics={metrics}
            />
          );
        })}
      </div>
    </div>
  );
}
