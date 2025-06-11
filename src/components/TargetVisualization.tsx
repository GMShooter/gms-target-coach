
import React from 'react';

interface Shot {
  id: number;
  x: number;
  y: number;
  score: number;
  timestamp?: number;
}

interface TargetVisualizationProps {
  shots: Shot[];
}

export const TargetVisualization: React.FC<TargetVisualizationProps> = ({ shots }) => {
  const targetSize = 350;
  const center = targetSize / 2;
  const scale = 3.5; // Scale factor for shot positions
  
  // Sort shots by timestamp (most recent last) and take only last 10
  const last10Shots = shots
    .sort((a, b) => (a.timestamp || a.id) - (b.timestamp || b.id))
    .slice(-10);

  const getScoreColor = (score: number) => {
    if (score >= 10) return '#22c55e';
    if (score >= 9) return '#eab308';
    if (score >= 7) return '#f97316';
    return '#ef4444';
  };

  const getShotOpacity = (index: number, total: number) => {
    // Most recent shots are more opaque
    return 0.4 + (index / total) * 0.6;
  };

  const getRingScore = (distance: number) => {
    // Calculate ring based on distance from center (in target units)
    if (distance <= 12.5) return 10;
    if (distance <= 25) return 9;
    if (distance <= 37.5) return 8;
    if (distance <= 50) return 7;
    if (distance <= 62.5) return 6;
    return 5;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={targetSize} height={targetSize} className="border border-slate-600 rounded-lg bg-slate-900">
          {/* Target Rings - Standard 10-ring target */}
          {[1, 2, 3, 4, 5].map((ring) => (
            <circle
              key={ring}
              cx={center}
              cy={center}
              r={ring * 25}
              fill="none"
              stroke="#475569"
              strokeWidth="1.5"
              opacity={0.6}
            />
          ))}
          
          {/* Inner scoring rings */}
          {[1, 2, 3, 4].map((ring) => (
            <circle
              key={`inner-${ring}`}
              cx={center}
              cy={center}
              r={ring * 12.5}
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
              opacity={0.4}
            />
          ))}
          
          {/* Ring Numbers */}
          {[6, 7, 8, 9, 10].map((score, index) => (
            <text
              key={score}
              x={center + (5 - index) * 25 - 8}
              y={center + 4}
              fontSize="14"
              fontWeight="bold"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {score}
            </text>
          ))}
          
          {/* X-ring (inner 10) */}
          <circle
            cx={center}
            cy={center}
            r={6.25}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1"
            opacity={0.8}
          />
          
          {/* Center Cross */}
          <line 
            x1={center - 15} y1={center} 
            x2={center + 15} y2={center} 
            stroke="#ef4444" 
            strokeWidth="2" 
            opacity={0.8}
          />
          <line 
            x1={center} y1={center - 15} 
            x2={center} y2={center + 15} 
            stroke="#ef4444" 
            strokeWidth="2" 
            opacity={0.8}
          />
          
          {/* Shot Holes - Last 10 shots */}
          {last10Shots.map((shot, index) => {
            const shotX = center + shot.x * scale;
            const shotY = center + shot.y * scale;
            const opacity = getShotOpacity(index, last10Shots.length);
            const isLatest = index === last10Shots.length - 1;
            
            return (
              <g key={shot.id}>
                {/* Shot hole */}
                <circle
                  cx={shotX}
                  cy={shotY}
                  r={isLatest ? "6" : "5"}
                  fill={getScoreColor(shot.score)}
                  stroke={isLatest ? "#fff" : "#000"}
                  strokeWidth={isLatest ? "2" : "1"}
                  opacity={opacity}
                />
                
                {/* Shot number */}
                <text
                  x={shotX}
                  y={shotY + 1}
                  fontSize={isLatest ? "12" : "10"}
                  fontWeight="bold"
                  fill={isLatest ? "#fff" : "#000"}
                  textAnchor="middle"
                  opacity={opacity}
                >
                  {shot.id}
                </text>
                
                {/* Highlight latest shot */}
                {isLatest && (
                  <circle
                    cx={shotX}
                    cy={shotY}
                    r="10"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="r"
                      values="10;15;10"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.2;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Shot sequence indicator */}
        <div className="absolute -bottom-8 left-0 right-0 text-center">
          <div className="text-xs text-slate-400">
            Showing last {last10Shots.length} shots
            {last10Shots.length > 0 && (
              <span className="ml-2 text-red-400">
                • Latest: #{last10Shots[last10Shots.length - 1]?.id}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 text-sm text-slate-400">
        <div className="flex items-center gap-6 justify-center flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            <span>10-ring (X-ring)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
            <span>9-ring</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
            <span>7-8 ring</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-400 rounded-full"></div>
            <span>6 or lower</span>
          </div>
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-slate-500">
            Standard 10-ring target • Shots fade with age • Latest shot pulses red
          </p>
        </div>
      </div>
    </div>
  );
};
