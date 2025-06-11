
import React from 'react';

interface Shot {
  id: number;
  x: number;
  y: number;
  score: number;
}

interface TargetVisualizationProps {
  shots: Shot[];
}

export const TargetVisualization: React.FC<TargetVisualizationProps> = ({ shots }) => {
  const targetSize = 300;
  const center = targetSize / 2;
  const scale = 3; // Scale factor for shot positions

  const getScoreColor = (score: number) => {
    if (score >= 10) return '#22c55e';
    if (score >= 9) return '#eab308';
    if (score >= 7) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="flex justify-center">
      <div className="relative">
        <svg width={targetSize} height={targetSize} className="border border-slate-600 rounded-lg bg-slate-900">
          {/* Target Rings */}
          {[1, 2, 3, 4, 5].map((ring) => (
            <circle
              key={ring}
              cx={center}
              cy={center}
              r={ring * 25}
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              opacity={0.5}
            />
          ))}
          
          {/* Ring Numbers */}
          {[6, 7, 8, 9, 10].map((score, index) => (
            <text
              key={score}
              x={center + (5 - index) * 25 - 8}
              y={center + 4}
              fontSize="12"
              fill="#64748b"
              textAnchor="middle"
            >
              {score}
            </text>
          ))}
          
          {/* Center Cross */}
          <line x1={center - 10} y1={center} x2={center + 10} y2={center} stroke="#ef4444" strokeWidth="1" />
          <line x1={center} y1={center - 10} x2={center} y2={center + 10} stroke="#ef4444" strokeWidth="1" />
          
          {/* Shot Holes */}
          {shots.map((shot) => (
            <g key={shot.id}>
              <circle
                cx={center + shot.x * scale}
                cy={center + shot.y * scale}
                r="4"
                fill={getScoreColor(shot.score)}
                stroke="#000"
                strokeWidth="1"
              />
              <text
                x={center + shot.x * scale}
                y={center + shot.y * scale + 1}
                fontSize="10"
                fill="#000"
                textAnchor="middle"
                fontWeight="bold"
              >
                {shot.id}
              </text>
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="mt-4 text-sm text-slate-400">
          <div className="flex items-center gap-4 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>10-ring</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span>9-ring</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
              <span>7-8 ring</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span>6 or lower</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
