
import React from 'react';
import { Percent, Target, TrendingUp, Trophy } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { Skeleton } from './ui/skeleton';

interface Metrics {
  accuracy_percentage: number;
  group_size_mm: number;
  directional_trend: string;
  total_score: number;
}

interface PerformanceMetricsProps {
  metrics: Metrics | null;
  loading?: boolean;
  totalShots?: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  metrics, 
  loading = false, 
  totalShots = 10 
}) => {
  if (loading || !metrics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const maxScore = totalShots * 10;
  
  const metricItems = [
    {
      label: 'Accuracy',
      value: metrics.accuracy_percentage,
      suffix: '%',
      icon: Percent,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20'
    },
    {
      label: 'Group Size',
      value: metrics.group_size_mm,
      suffix: 'mm',
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20'
    },
    {
      label: 'Total Score',
      value: metrics.total_score,
      suffix: `/${maxScore}`,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20'
    }
  ];

  const getPerformanceGrade = () => {
    const percentage = (metrics.total_score / maxScore) * 100;
    if (percentage >= 95) return { grade: 'A+', description: 'Outstanding shooting performance!' };
    if (percentage >= 90) return { grade: 'A', description: 'Excellent shooting with great consistency.' };
    if (percentage >= 85) return { grade: 'B+', description: 'Good consistency with room for improvement.' };
    if (percentage >= 80) return { grade: 'B', description: 'Solid performance, focus on fundamentals.' };
    if (percentage >= 75) return { grade: 'C+', description: 'Improving steadily, keep practicing.' };
    return { grade: 'C', description: 'Practice basic shooting fundamentals.' };
  };

  const grade = getPerformanceGrade();

  return (
    <div className="space-y-4">
      {metricItems.map((item, index) => (
        <div key={index} className={`${item.bgColor} rounded-lg p-4 border border-slate-600/30 animate-fade-in`}
             style={{ animationDelay: `${index * 100}ms` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>
                  <AnimatedCounter 
                    end={item.value} 
                    duration={1200} 
                    suffix={item.suffix}
                    decimals={item.label === 'Group Size' ? 0 : 0}
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Directional Trend */}
      <div className="bg-orange-900/20 rounded-lg p-4 border border-slate-600/30 animate-fade-in"
           style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-900/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="font-medium">Directional Trend</p>
            <p className="text-lg font-bold text-orange-400">{metrics.directional_trend}</p>
          </div>
        </div>
      </div>
      
      {/* Performance Grade */}
      <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 animate-fade-in"
           style={{ animationDelay: '400ms' }}>
        <h4 className="font-semibold mb-2">Performance Grade</h4>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-yellow-400">{grade.grade}</div>
          <div className="text-sm text-slate-300">
            <p>{grade.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
