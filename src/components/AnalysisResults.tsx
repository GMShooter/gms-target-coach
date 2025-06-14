
import React from 'react';
import { Target, TrendingUp, RotateCcw, AlertTriangle, CheckCircle, XCircle, Timer } from 'lucide-react';
import { ShotTable } from './ShotTable';
import { TargetVisualization } from './TargetVisualization';
import { PerformanceMetrics } from './PerformanceMetrics';
import { useSessionData } from '@/hooks/useSessionData';

interface AnalysisResultsProps {
  sessionId: string;
  onNewAnalysis: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ sessionId, onNewAnalysis }) => {
  const { data, loading, error } = useSessionData(sessionId);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Error Loading Results</h3>
            <p className="text-slate-300">{error}</p>
            <button
              onClick={onNewAnalysis}
              className="mt-3 flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const generateCoachingFeedback = () => {
    if (!data?.shots) return null;

    const shots = data.shots;
    const avgScore = shots.reduce((sum, shot) => sum + shot.score, 0) / shots.length;
    
    // Analyze patterns
    const leftShots = shots.filter(shot => shot.direction.includes('left')).length;
    const rightShots = shots.filter(shot => shot.direction.includes('right')).length;
    const highShots = shots.filter(shot => shot.direction.includes('high')).length;
    const lowShots = shots.filter(shot => shot.direction.includes('low')).length;
    
    const strengths = [];
    const improvements = [];
    
    if (avgScore >= 9) strengths.push("Excellent accuracy and precision");
    if (data.session.group_size_mm <= 30) strengths.push("Tight shot grouping");
    if (shots.filter(shot => shot.score >= 9).length >= shots.length * 0.7) {
      strengths.push("Consistent high scores");
    }
    
    // Add timing-specific feedback for drill mode
    if (data.session.drill_mode && data.session.time_to_first_shot) {
      if (data.session.time_to_first_shot <= 1.5) {
        strengths.push("Excellent draw speed and reaction time");
      } else if (data.session.time_to_first_shot <= 2.0) {
        strengths.push("Good reaction time");
      }
      
      if (data.session.average_split_time && data.session.average_split_time <= 1.2) {
        strengths.push("Fast shot-to-shot timing");
      }
    }
    
    if (leftShots > shots.length * 0.4) improvements.push("Trigger control (leftward bias)");
    if (rightShots > shots.length * 0.4) improvements.push("Grip consistency (rightward bias)");
    if (lowShots > shots.length * 0.3) improvements.push("Follow-through technique");
    if (data.session.group_size_mm > 50) improvements.push("Shot consistency and fundamentals");
    
    // Add timing-specific improvements for drill mode
    if (data.session.drill_mode && data.session.time_to_first_shot) {
      if (data.session.time_to_first_shot > 2.5) {
        improvements.push("Draw speed and reaction time");
      }
      
      if (data.session.average_split_time && data.session.average_split_time > 2.0) {
        improvements.push("Shot-to-shot transition speed");
      }
    }
    
    if (strengths.length === 0) strengths.push("Room for improvement in all areas");
    if (improvements.length === 0) improvements.push("Maintain current excellent form");

    return {
      performance: `Your session shows ${avgScore >= 8.5 ? 'strong' : 'developing'} shooting fundamentals with ${data.session.group_size_mm <= 40 ? 'good' : 'improving'} shot grouping.`,
      advice: leftShots > rightShots ? 
        "Focus on smooth, straight-back trigger pull to reduce leftward bias. Consider dry-fire practice." :
        "Continue working on sight alignment and breathing technique for improved consistency.",
      strengths,
      improvements
    };
  };

  const coaching = generateCoachingFeedback();
  const isDrillMode = data?.session?.drill_mode || false;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            Shooting Analysis Results
            {isDrillMode && (
              <span className="text-lg bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full border border-purple-700/50 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Drill Mode
              </span>
            )}
          </h2>
          <p className="text-slate-400">
            {isDrillMode 
              ? "Professional timing analysis with precision shot tracking"
              : "Professional coaching feedback and performance metrics"
            }
          </p>
        </div>
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          New Analysis
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Target Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Shot Pattern Analysis
          </h3>
          <TargetVisualization shots={data?.shots || []} loading={loading} />
        </div>

        {/* Performance Metrics */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-400" />
            Session Metrics
          </h3>
          <PerformanceMetrics 
            metrics={data?.session || null} 
            loading={loading} 
            totalShots={data?.shots?.length || 10}
          />
        </div>
      </div>

      {/* Shot Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">
          {isDrillMode ? "Shot-by-Shot Timing Analysis" : "Detailed Shot Analysis"}
        </h3>
        <ShotTable 
          shots={data?.shots || []} 
          loading={loading} 
          drillMode={isDrillMode}
        />
      </div>

      {/* Coaching Summary */}
      {coaching && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 animate-fade-in"
             style={{ animationDelay: '500ms' }}>
          <h3 className="text-xl font-semibold mb-4">Coach's Analysis & Recommendations</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-400">Strengths</h4>
              <ul className="space-y-2">
                {coaching.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-yellow-400">Areas for Improvement</h4>
              <ul className="space-y-2">
                {coaching.improvements.map((improvement: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-slate-300">
                    <XCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
            <h4 className="font-semibold mb-2">Performance Summary</h4>
            <p className="text-slate-300 mb-4">{coaching.performance}</p>
            
            <h4 className="font-semibold mb-2">Coaching Advice</h4>
            <p className="text-slate-300">{coaching.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
};
