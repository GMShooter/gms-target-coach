import React from 'react';
import { motion } from 'framer-motion';
import { Target, Pause, Play, Square, BarChart3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import CountUp from 'react-countup';

interface VideoAnalysisProgressProps {
  analysisProgress: string;
  currentFrame: string | null;
  detectedBounds: Array<any>;
  frameNumber: number;
  totalFrames: number;
  timestamp: number;
  isAnalyzing: boolean;
  totalDetectedShots: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onViewMidReport: () => void;
  isPaused: boolean;
}

export const VideoAnalysisProgress: React.FC<VideoAnalysisProgressProps> = ({
  analysisProgress,
  currentFrame,
  detectedBounds,
  frameNumber,
  totalFrames,
  timestamp,
  isAnalyzing,
  totalDetectedShots,
  onPause,
  onResume,
  onStop,
  onViewMidReport,
  isPaused
}) => {
  const progress = (frameNumber / totalFrames) * 100;

  return (
    <motion.div 
      className="max-w-6xl mx-auto space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with Controls */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative w-12 h-12"
                animate={{ rotate: isAnalyzing && !isPaused ? 360 : 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-full opacity-20 blur-lg" />
                <div className="relative w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full" />
                <Target className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-red-400" />
              </motion.div>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  RF-DETR Analysis
                </CardTitle>
                <p className="text-slate-400">{analysisProgress}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewMidReport}
                className="bg-blue-500/20 border-blue-400/50 hover:bg-blue-500/30"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Report
              </Button>
              
              {!isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPause}
                  className="bg-yellow-500/20 border-yellow-400/50 hover:bg-yellow-500/30"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResume}
                  className="bg-green-500/20 border-green-400/50 hover:bg-green-500/30"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
                className="bg-red-500/20 border-red-400/50 hover:bg-red-500/30"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Frame {frameNumber}/{totalFrames}</span>
              <span>{timestamp.toFixed(1)}s</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Main Analysis View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Frame with Detections */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Detection View
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFrame ? (
              <div className="relative">
                <img 
                  src={currentFrame} 
                  alt="Current analysis frame" 
                  className="w-full h-auto rounded-xl border border-slate-600"
                />
                {detectedBounds.length > 0 && (
                  <>
                    {detectedBounds.map((detection, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute border-2 border-red-400 bg-red-400/20 rounded"
                        style={{
                          left: `${(detection.x - detection.width/2)}px`,
                          top: `${(detection.y - detection.height/2)}px`,
                          width: `${detection.width}px`,
                          height: `${detection.height}px`
                        }}
                      >
                        <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          {(detection.confidence * 100).toFixed(1)}%
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
                
                {detectedBounds.length > 0 && (
                  <motion.div 
                    className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CountUp end={detectedBounds.length} duration={0.5} /> detections
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 bg-slate-700/50 rounded-xl flex items-center justify-center">
                <p className="text-slate-400">Waiting for frame data...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Statistics */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle>Live Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                <CountUp end={totalDetectedShots} duration={0.5} />
              </div>
              <p className="text-slate-400 text-sm">Total Shots Detected</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Processing Rate:</span>
                <span className="text-white">1 FPS</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Frame Detections:</span>
                <span className="text-white">{detectedBounds.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence Avg:</span>
                <span className="text-white">
                  {detectedBounds.length > 0 
                    ? `${(detectedBounds.reduce((sum, d) => sum + d.confidence, 0) / detectedBounds.length * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-medium ${isPaused ? 'text-yellow-400' : isAnalyzing ? 'text-green-400' : 'text-slate-400'}`}>
                  {isPaused ? 'Paused' : isAnalyzing ? 'Analyzing' : 'Stopped'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};