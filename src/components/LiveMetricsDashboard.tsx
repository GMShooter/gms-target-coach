import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Zap, Activity } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge-2";

interface LiveMetricsDashboardProps {
  metrics: {
    totalShots: number;
    averageScore: number;
    highestScore: number;
    accuracy: number;
    groupSize: number;
    mpi: number;
  };
  isAnalyzing: boolean;
  shots: any[];
}

export const LiveMetricsDashboard: React.FC<LiveMetricsDashboardProps> = ({
  metrics,
  isAnalyzing,
  shots
}) => {
  const [animatedValues, setAnimatedValues] = useState({
    totalShots: 0,
    averageScore: 0,
    accuracy: 0,
    mpi: 0
  });

  // Animate metric changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        totalShots: metrics.totalShots,
        averageScore: metrics.averageScore,
        accuracy: metrics.accuracy,
        mpi: metrics.mpi
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [metrics]);

  // Get trend indicator
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // Get performance color
  const getPerformanceColor = (score: number) => {
    if (score >= 9) return 'text-green-500';
    if (score >= 7) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get accuracy level
  const getAccuracyLevel = (accuracy: number) => {
    if (accuracy >= 90) return { text: 'Excellent', color: 'bg-green-500' };
    if (accuracy >= 75) return { text: 'Good', color: 'bg-blue-500' };
    if (accuracy >= 60) return { text: 'Fair', color: 'bg-yellow-500' };
    return { text: 'Poor', color: 'bg-red-500' };
  };

  const accuracyLevel = getAccuracyLevel(animatedValues.accuracy);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Live SOTA Metrics</h2>
        <div className="flex items-center justify-center gap-2">
          <Badge variant={isAnalyzing ? "secondary" : "success"} className="animate-pulse">
            {isAnalyzing ? (
              <>
                <Activity className="h-3 w-3 mr-1" />
                Analyzing
              </>
            ) : (
              <>
                <Target className="h-3 w-3 mr-1" />
                Live
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shots */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Total Shots</h3>
            <Target className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tabular-nums">
              {animatedValues.totalShots}
            </span>
            <span className="text-slate-400 text-sm">shots</span>
          </div>
          {isAnalyzing && (
            <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>

        {/* Average Score */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Average Score</h3>
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tabular-nums ${getPerformanceColor(animatedValues.averageScore)}`}>
              {animatedValues.averageScore.toFixed(1)}
            </span>
            <span className="text-slate-400 text-sm">/10.0</span>
          </div>
          <div className="mt-2">
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                style={{ width: `${(animatedValues.averageScore / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Accuracy</h3>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${accuracyLevel.color}`} />
              <span className="text-slate-400 text-sm">{accuracyLevel.text}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tabular-nums ${getPerformanceColor(animatedValues.accuracy / 10)}`}>
              {animatedValues.accuracy.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className={`h-full ${accuracyLevel.color} transition-all duration-500`}
                style={{ width: `${animatedValues.accuracy}%` }}
              />
            </div>
          </div>
        </div>

        {/* MPI (Mean Point Impact) */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">MPI</h3>
            <div className="text-xs text-slate-500">Mean Point Impact</div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold tabular-nums ${getPerformanceColor(animatedValues.mpi * 10)}`}>
              {animatedValues.mpi.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                style={{ width: `${animatedValues.mpi * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Highest Score */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Highest Score
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-500 tabular-nums">
              {metrics.highestScore}/10
            </div>
            {shots.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                Shot #{shots.findIndex(s => s.score === metrics.highestScore) + 1}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Size */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              Group Size
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-500 tabular-nums">
              {metrics.groupSize}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {metrics.groupSize === 1 ? 'No grouping' : 
               metrics.groupSize >= 3 ? 'Tight grouping' : 'Loose grouping'}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Trend</span>
                {getTrendIcon(animatedValues.averageScore, animatedValues.averageScore - 0.1)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Consistency</span>
                <span className={`text-sm font-medium ${
                  animatedValues.accuracy >= 80 ? 'text-green-500' : 
                  animatedValues.accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {animatedValues.accuracy >= 80 ? 'High' : 
                   animatedValues.accuracy >= 60 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Analysis Indicator */}
      {isAnalyzing && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-50 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-400 text-sm font-medium">Real-time Analysis Active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMetricsDashboard;