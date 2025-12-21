import { useCallback, useEffect, useRef } from 'react';
import { Play, Pause, Square, Zap } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useCanvasStore } from '../../store/canvasStore';

export function SimulationControlPanel() {
  const {
    isRunning,
    isPaused,
    config,
    currentTime,
    speed,
    requestMultiplier,
    setConfig,
    setSpeed,
    setRequestMultiplier,
    start,
    pause,
    resume,
    stop,
    tick,
  } = useSimulationStore();

  const { nodes, edges } = useCanvasStore();
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Animation loop
  useEffect(() => {
    if (isRunning && !isPaused) {
      const animate = (timestamp: number) => {
        if (lastFrameTimeRef.current === 0) {
          lastFrameTimeRef.current = timestamp;
        }

        const deltaMs = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        tick(deltaMs, nodes, edges);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      lastFrameTimeRef.current = 0;
    }
  }, [isRunning, isPaused, nodes, edges, tick]);

  const handleStart = useCallback(() => {
    start(nodes, edges);
  }, [start, nodes, edges]);

  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      resume();
    } else if (isRunning) {
      pause();
    } else {
      handleStart();
    }
  }, [isPaused, isRunning, pause, resume, handleStart]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleBurst = useCallback(() => {
    // Temporarily spike the RPS for burst testing
    const originalRps = config.requestsPerSecond;
    setConfig({ requestsPerSecond: originalRps * 10 });

    // Reset after 2 seconds
    setTimeout(() => {
      setConfig({ requestsPerSecond: originalRps });
    }, 2000);
  }, [config.requestsPerSecond, setConfig]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = config.durationSeconds > 0
    ? (currentTime / config.durationSeconds) * 100
    : 0;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-colors
              ${isRunning && !isPaused
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}
            title={isRunning ? (isPaused ? 'Resume' : 'Pause') : 'Start Simulation'}
          >
            {isRunning && !isPaused ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-colors
              ${isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            title="Stop Simulation"
          >
            <Square className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200" />

          {/* RPS Input */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-0.5">RPS</label>
            <input
              type="number"
              value={config.requestsPerSecond}
              onChange={(e) => setConfig({ requestsPerSecond: parseInt(e.target.value) || 100 })}
              disabled={isRunning}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              min={1}
              max={100000}
            />
          </div>

          {/* Duration Input */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-0.5">Duration (s)</label>
            <input
              type="number"
              value={config.durationSeconds}
              onChange={(e) => setConfig({ durationSeconds: parseInt(e.target.value) || 60 })}
              disabled={isRunning}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              min={1}
              max={3600}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200" />

          {/* Speed Control */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-0.5">Speed</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          {/* Request Multiplier */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-0.5">1 dot =</label>
            <select
              value={requestMultiplier}
              onChange={(e) => setRequestMultiplier(parseInt(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 req</option>
              <option value={10}>10 req</option>
              <option value={100}>100 req</option>
              <option value={1000}>1K req</option>
              <option value={10000}>10K req</option>
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200" />

          {/* Burst Button */}
          <button
            onClick={handleBurst}
            disabled={!isRunning}
            className={`
              px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium
              transition-colors
              ${isRunning
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            title="Burst (10x RPS for 2s)"
          >
            <Zap className="w-4 h-4" />
            Burst
          </button>

          {/* Progress Display */}
          {isRunning && (
            <>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col min-w-[100px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(config.durationSeconds)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
