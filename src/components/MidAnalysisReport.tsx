import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Target, Clock, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CountUp from 'react-countup';

interface MidAnalysisReportProps {
  totalDetectedShots: number;
  currentTimestamp: number;
  frameNumber: number;
  totalFrames: number;
  averageConfidence: number;
  detectedBounds: Array<any>;
  onClose: () => void;
  onContinueAnalysis: () => void;
  onStopAnalysis: () => void;
}

export const MidAnalysisReport: React.FC<MidAnalysisReportProps> = ({
  totalDetectedShots,
  currentTimestamp,
  frameNumber,
  totalFrames,
  averageConfidence,
  detectedBounds,
  onClose,
  onContinueAnalysis,
  onStopAnalysis
}) => {
  const progress = (frameNumber / totalFrames) * 100;
  const estimatedTimeRemaining = ((totalFrames - frameNumber) * 1.1); // Estimate 1.1s per frame
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mid-Analysis Report</h2>
              <p className="text-slate-400">Interim results at {currentTimestamp.toFixed(1)}s</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Analysis Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {progress.toFixed(1)}%
                </div>
                <p className="text-slate-400 text-sm">Complete</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {frameNumber}/{totalFrames}
                </div>
                <p className="text-slate-400 text-sm">Frames</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {Math.ceil(estimatedTimeRemaining)}s
                </div>
                <p className="text-slate-400 text-sm">Remaining</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {(averageConfidence * 100).toFixed(1)}%
                </div>
                <p className="text-slate-400 text-sm">Avg Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shot Detection Summary */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Shot Detection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-red-400 mb-2">
                <CountUp end={totalDetectedShots} duration={1} />
              </div>
              <p className="text-slate-400">Total Shots Detected So Far</p>
            </div>

            {totalDetectedShots > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded-xl">
                    <div className="text-xl font-bold text-white mb-1">
                      {(totalDetectedShots / (currentTimestamp / 60)).toFixed(1)}
                    </div>
                    <p className="text-slate-400 text-sm">Shots per minute</p>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-700/50 rounded-xl">
                    <div className="text-xl font-bold text-white mb-1">
                      {detectedBounds.length}
                    </div>
                    <p className="text-slate-400 text-sm">Current frame detections</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h4 className="font-semibold text-blue-400 mb-2">Preliminary Analysis</h4>
                  <p className="text-slate-300 text-sm">
                    Based on {totalDetectedShots} shot{totalDetectedShots !== 1 ? 's' : ''} detected in {currentTimestamp.toFixed(1)} seconds, 
                    your shooting pace is {totalDetectedShots > 0 ? 'consistent' : 'building'}. 
                    The RF-DETR model is detecting impacts with an average confidence of {(averageConfidence * 100).toFixed(1)}%.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 font-medium mb-2">No shots detected yet</p>
                <p className="text-slate-300 text-sm">
                  The analysis is still in progress. Shots may appear in later frames, 
                  or the video may not contain visible bullet impacts yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={onStopAnalysis}
            className="bg-red-500/20 border-red-400/50 hover:bg-red-500/30"
          >
            Stop Analysis
          </Button>
          
          <Button
            onClick={onContinueAnalysis}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Analysis
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};