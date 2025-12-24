import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Zap, Activity, Play, Pause, Square } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useCanvasStore } from '../../store/canvasStore';

type TabId = 'simulation';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'simulation', label: 'Simulation', icon: <Activity size={14} /> },
  // Future tabs: { id: 'practice', label: 'Practice Problems', icon: <BookOpen size={14} /> },
];

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
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

  // Check if there's a User Client node available
  const hasUserClient = nodes.some((node) => node.type === 'user');

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

  const handleBurst = useCallback(() => {
    const originalRps = config.requestsPerSecond;
    setConfig({ requestsPerSecond: originalRps * 10 });
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

  const isExpanded = activeTab !== null;

  const handleTabClick = (tabId: TabId) => {
    if (activeTab === tabId) {
      setActiveTab(null); // Collapse if clicking active tab
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 flex flex-col">
      {/* Expanded Content */}
      {isExpanded && activeTab === 'simulation' && (
        <div className="p-4 border-b border-gray-200">
          {/* Main Settings Row */}
          <div className="flex items-center justify-center gap-6">
            {/* Play/Pause/Stop Controls */}
            <div className="flex items-center gap-2">
              {/* Play/Pause Button */}
              <div className="relative group">
                <button
                  onClick={handlePlayPause}
                  disabled={!hasUserClient && !isRunning}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-colors
                    ${!hasUserClient && !isRunning
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : isRunning && !isPaused
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
                {/* Tooltip when disabled */}
                {!hasUserClient && !isRunning && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Add a User Client to run simulation
                  </div>
                )}
              </div>

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
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-200" />

            {/* RPS Input */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Requests per Second</label>
              <input
                type="number"
                value={config.requestsPerSecond}
                onChange={(e) => setConfig({ requestsPerSecond: parseInt(e.target.value) || 100 })}
                disabled={isRunning}
                className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                min={1}
                max={100000}
              />
            </div>

            {/* Duration Input */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={config.durationSeconds}
                onChange={(e) => setConfig({ durationSeconds: parseInt(e.target.value) || 60 })}
                disabled={isRunning}
                className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                min={1}
                max={3600}
              />
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-200" />

            {/* Speed Control */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Playback Speed</label>
              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-xs text-gray-500 mb-1">Visual Scale (1 dot =)</label>
              <select
                value={requestMultiplier}
                onChange={(e) => setRequestMultiplier(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 request</option>
                <option value={10}>10 requests</option>
                <option value={100}>100 requests</option>
                <option value={1000}>1K requests</option>
                <option value={10000}>10K requests</option>
              </select>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-200" />

            {/* Burst Button */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Load Test</label>
              <button
                onClick={handleBurst}
                disabled={!isRunning}
                className={`
                  px-4 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium
                  transition-colors
                  ${isRunning
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                title="Burst: 10x RPS for 2 seconds"
              >
                <Zap size={14} />
                Burst
              </button>
            </div>
          </div>

          {/* Progress Bar (only when running) */}
          {isRunning && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600 w-12">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-12 text-right">
                {formatTime(config.durationSeconds)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab Bar */}
      <div className="h-8 flex items-center px-2 bg-gray-50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded
              transition-colors
              ${activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'simulation' && isRunning && (
              <span className="ml-1 text-gray-400">
                {formatTime(currentTime)}
              </span>
            )}
            {activeTab === tab.id ? (
              <ChevronDown size={12} className="ml-1" />
            ) : (
              <ChevronUp size={12} className="ml-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
