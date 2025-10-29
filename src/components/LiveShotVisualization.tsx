import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Target, Zap } from 'lucide-react';

interface Shot {
  id: string;
  x: number;
  y: number;
  score: number;
  timestamp: Date;
  confidence: number;
  isBullseye?: boolean;
  angleFromCenter?: number;
}

interface LiveShotVisualizationProps {
  shots: Shot[];
  currentFrame?: string | null;
  isAnalyzing: boolean;
  width?: number;
  height?: number;
}

export const LiveShotVisualization: React.FC<LiveShotVisualizationProps> = ({
  shots,
  currentFrame,
  isAnalyzing,
  width = 640,
  height = 480
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredShot] = useState<Shot | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Define drawing functions before useEffect to avoid dependency issues
  const drawTargetRings = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;

    // Draw scoring rings
    const rings = [
      { radius: maxRadius * 0.1, color: 'rgba(255, 215, 0, 0.3)', score: 10 }, // Bullseye
      { radius: maxRadius * 0.2, color: 'rgba(255, 165, 0, 0.2)', score: 9 },
      { radius: maxRadius * 0.3, color: 'rgba(255, 255, 0, 0.15)', score: 8 },
      { radius: maxRadius * 0.4, color: 'rgba(0, 255, 0, 0.1)', score: 7 },
      { radius: maxRadius * 0.5, color: 'rgba(0, 255, 0, 0.05)', score: 6 },
      { radius: maxRadius * 0.6, color: 'rgba(0, 255, 0, 0.03)', score: 5 },
    ];

    rings.forEach(ring => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  const drawShot = useCallback((
    ctx: CanvasRenderingContext2D,
    shot: Shot,
    width: number,
    height: number,
    isLatest: boolean,
    animationFrame: number
  ) => {
    const x = (shot.x / 100) * width;
    const y = (shot.y / 100) * height;

    // Draw shot ripple effect for latest shot
    if (isLatest) {
      const rippleRadius = 20 + Math.sin(animationFrame * 0.1) * 5;
      ctx.beginPath();
      ctx.arc(x, y, rippleRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 - Math.sin(animationFrame * 0.1) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw shot marker
    ctx.beginPath();
    ctx.arc(x, y, isLatest ? 8 : 6, 0, 2 * Math.PI);
    
    // Color based on score
    let color = '#ef4444'; // Default red
    if (shot.score >= 9) color = '#22c55e'; // Green
    else if (shot.score >= 7) color = '#eab308'; // Yellow
    else if (shot.score >= 5) color = '#f97316'; // Orange
    
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw shot border
    ctx.beginPath();
    ctx.arc(x, y, isLatest ? 8 : 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw bullseye indicator
    if (shot.isBullseye) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw shot number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${shots.indexOf(shot) + 1}`, x, y);

    // Draw score
    ctx.fillStyle = color;
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`${shot.score}/10`, x, y - 20);

    // Draw confidence indicator
    if (shot.confidence) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Arial';
      ctx.fillText(`${Math.round(shot.confidence * 100)}%`, x + 15, y);
    }

    // Draw angle indicator
    if (shot.angleFromCenter !== undefined) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((shot.angleFromCenter * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, 0);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }, [shots]);

  const drawGrouping = (ctx: CanvasRenderingContext2D, shots: Shot[], width: number, height: number) => {
    if (shots.length < 2) return;

    // Calculate center of shot group
    const centerX = shots.reduce((sum, shot) => sum + shot.x, 0) / shots.length;
    const centerY = shots.reduce((sum, shot) => sum + shot.y, 0) / shots.length;
    
    const centerCanvasX = (centerX / 100) * width;
    const centerCanvasY = (centerY / 100) * height;

    // Draw grouping circle
    ctx.beginPath();
    ctx.arc(centerCanvasX, centerCanvasY, 30, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw center point
    ctx.beginPath();
    ctx.arc(centerCanvasX, centerCanvasY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Draw lines from center to each shot
    shots.forEach(shot => {
      const shotX = (shot.x / 100) * width;
      const shotY = (shot.y / 100) * height;
      
      ctx.beginPath();
      ctx.moveTo(centerCanvasX, centerCanvasY);
      ctx.lineTo(shotX, shotY);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  const drawCrosshair = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    // Draw crosshair lines
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
  };

  // Animate shot appearances
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Draw shots and effects on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw target rings
    drawTargetRings(ctx, width, height);

    // Draw shots with effects
    shots.forEach((shot, index) => {
      drawShot(ctx, shot, width, height, index === shots.length - 1, animationFrame);
    });

    // Draw grouping visualization
    if (shots.length > 1) {
      drawGrouping(ctx, shots, width, height);
    }

    // Draw center crosshair
    drawCrosshair(ctx, width, height);

  }, [shots, width, height, animationFrame, drawShot]); // Include drawShot in dependencies since it's used in the effect

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
      {/* Video/Image Background */}
      {currentFrame ? (
        <img
          src={currentFrame}
          alt="Target view"
          className="absolute inset-0 w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            // Frame loaded successfully
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
          <div className="text-center">
            <Target className="h-16 w-16 mx-auto mb-6 opacity-50 animate-pulse" />
            <p className="text-slate-400 text-lg mb-2">Waiting for video feed...</p>
            <p className="text-slate-500 text-sm">Start analysis to begin</p>
          </div>
        </div>
      )}

      {/* Canvas for shot overlays */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Analysis Status Overlay */}
      {isAnalyzing && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Real-time Analysis Active</span>
          </div>
        </div>
      )}

      {/* Shot Details Tooltip */}
      {hoveredShot && (
        <div className="absolute bottom-4 right-4 bg-slate-800 text-white p-3 rounded-lg border border-slate-600 max-w-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Shot:</span>
              <span className="font-medium">#{shots.indexOf(hoveredShot) + 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Score:</span>
              <span className="font-medium">{hoveredShot.score}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Confidence:</span>
              <span className="font-medium">{Math.round(hoveredShot.confidence * 100)}%</span>
            </div>
            {hoveredShot.isBullseye && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Zap className="h-3 w-3" />
                <span className="text-sm font-medium">Bullseye!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-white text-xs bg-slate-800 bg-opacity-70 px-2 py-1 rounded">
        Hover over shots for details
      </div>
    </div>
  );
};

export default LiveShotVisualization;