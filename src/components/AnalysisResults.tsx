
import React from 'react';
import { Target, TrendingUp, RotateCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ShotTable } from './ShotTable';
import { TargetVisualization } from './TargetVisualization';
import { PerformanceMetrics } from './PerformanceMetrics';

interface AnalysisResultsProps {
  data: any;
  onNewAnalysis: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data, onNewAnalysis }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Shooting Analysis Results</h2>
          <p className="text-slate-400">Professional coaching feedback and performance metrics</p>
        </div>
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          New Analysis
        </button>
      </div>

      {/* Safety Alert */}
      {data.safetyNote && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Safety Notice</h3>
            <p className="text-slate-300">{data.safetyNote}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Target Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Shot Pattern Analysis
          </h3>
          <TargetVisualization shots={data.shots} />
        </div>

        {/* Performance Metrics */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-400" />
            Session Metrics
          </h3>
          <PerformanceMetrics metrics={data.metrics} />
        </div>
      </div>

      {/* Shot Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Detailed Shot Analysis</h3>
        <ShotTable shots={data.shots} />
      </div>

      {/* Coaching Summary */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Coach's Analysis & Recommendations</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 text-green-400">Strengths</h4>
            <ul className="space-y-2">
              {data.summary.strengths.map((strength: string, index: number) => (
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
              {data.summary.improvements.map((improvement: string, index: number) => (
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
          <p className="text-slate-300 mb-4">{data.summary.performance}</p>
          
          <h4 className="font-semibold mb-2">Coaching Advice</h4>
          <p className="text-slate-300">{data.summary.advice}</p>
        </div>
      </div>
    </div>
  );
};
