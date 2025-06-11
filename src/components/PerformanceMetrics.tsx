
import React from 'react';
import { Percent, Target, TrendingUp, Trophy } from 'lucide-react';

interface Metrics {
  accuracy: string;
  groupSize: string;
  directionalTrend: string;
  totalScore: string;
}

interface PerformanceMetricsProps {
  metrics: Metrics;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  const metricItems = [
    {
      label: 'Accuracy',
      value: metrics.accuracy,
      icon: Percent,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20'
    },
    {
      label: 'Group Size',
      value: metrics.groupSize,
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20'
    },
    {
      label: 'Directional Trend',
      value: metrics.directionalTrend,
      icon: TrendingUp,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20'
    },
    {
      label: 'Total Score',
      value: metrics.totalScore,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20'
    }
  ];

  return (
    <div className="space-y-4">
      {metricItems.map((item, index) => (
        <div key={index} className={`${item.bgColor} rounded-lg p-4 border border-slate-600/30`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Performance Grade */}
      <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
        <h4 className="font-semibold mb-2">Performance Grade</h4>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-yellow-400">B+</div>
          <div className="text-sm text-slate-300">
            <p>Good consistency with room for accuracy improvement.</p>
            <p>Continue working on trigger control and sight alignment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
