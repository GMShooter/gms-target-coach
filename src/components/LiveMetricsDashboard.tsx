import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Clock,
  Award,
  BarChart3,
  PieChart,
  Crosshair,
  Gauge,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Timer,
  Wind,
  Thermometer,
  Eye,
  MousePointer,
  RefreshCw,
  Download,
  Share2,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { type ShotData, type SessionData } from '../services/HardwareAPI';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loading } from './ui/loading';
import { GMShootLogo } from './ui/gmshoot-logo';

interface LiveMetricsDashboardProps {
  shots: ShotData[];
  session?: SessionData;
  isSessionActive?: boolean;
  onExportData?: () => void;
  onShareResults?: () => void;
  onRefresh?: () => void;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  description,
  variant = 'default',
  animated = true,
  delay = 0
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'danger':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-slate-700/50 bg-slate-800/30';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-slate-500" />;
    }
  };

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={animated ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.3, delay }}
      whileHover={animated ? { scale: 1.02 } : undefined}
      className={`relative overflow-hidden rounded-lg border ${getVariantClasses()} backdrop-blur-sm`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              variant === 'success' ? 'bg-green-500/20 text-green-400' :
              variant === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
              variant === 'danger' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-700/50 text-slate-300'
            }`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{title}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          </div>
          {trend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className="text-sm text-slate-400">{trendValue}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

interface ProgressRingProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
  animated?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  maxValue,
  size = 120,
  strokeWidth = 8,
  label,
  color = '#3B82F6',
  animated = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / maxValue) * circumference;
  const percentage = Math.round((value / maxValue) * 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : false}
          animate={animated ? { strokeDashoffset: circumference - progress } : false}
          transition={{ duration: 1, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{percentage}%</span>
        {label && <span className="text-xs text-slate-400">{label}</span>}
      </div>
    </div>
  );
};

interface ShotDistributionChartProps {
  shots: ShotData[];
  animated?: boolean;
}

const ShotDistributionChart: React.FC<ShotDistributionChartProps> = ({ shots, animated = true }) => {
  const distribution = useMemo(() => {
    const zones = { center: 0, inner: 0, middle: 0, outer: 0, miss: 0 };
    
    shots.forEach(shot => {
      const distance = Math.sqrt(
        Math.pow(shot.coordinates.x - 50, 2) + 
        Math.pow(shot.coordinates.y - 50, 2)
      );
      
      if (distance <= 10) zones.center++;
      else if (distance <= 25) zones.inner++;
      else if (distance <= 40) zones.middle++;
      else if (distance <= 50) zones.outer++;
      else zones.miss++;
    });
    
    return zones;
  }, [shots]);

  const total = shots.length || 1;
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-3">
      {Object.entries(distribution).map(([zone, count], index) => {
        const percentage = (count / total) * 100;
        const zoneColors = {
          center: 'bg-green-500',
          inner: 'bg-blue-500',
          middle: 'bg-yellow-500',
          outer: 'bg-orange-500',
          miss: 'bg-red-500'
        };
        
        const zoneLabels = {
          center: 'Center (10)',
          inner: 'Inner (8-9)',
          middle: 'Middle (5-7)',
          outer: 'Outer (1-4)',
          miss: 'Miss (0)'
        };

        return (
          <motion.div
            key={zone}
            initial={animated ? { opacity: 0, x: -20 } : false}
            animate={animated ? { opacity: 1, x: 0 } : false}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{zoneLabels[zone as keyof typeof zoneLabels]}</span>
              <span className="text-white font-medium">{count} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${zoneColors[zone as keyof typeof zoneColors]}`}
                initial={animated ? { width: 0 } : false}
                animate={animated ? { width: `${percentage}%` } : false}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export const LiveMetricsDashboard: React.FC<LiveMetricsDashboardProps> = ({
  shots,
  session,
  isSessionActive = false,
  onExportData,
  onShareResults,
  onRefresh,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (shots.length === 0) {
      return {
        totalShots: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        bullseyeCount: 0,
        accuracy: 0,
        consistency: 0,
        improvement: 0,
        sessionDuration: 0,
        shotsPerMinute: 0,
        grouping: 0,
        averageDistance: 0
      };
    }

    const scores = shots.map(s => s.score);
    const totalShots = shots.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalShots;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const bullseyeCount = shots.filter(s => s.score >= 10).length;
    const accuracy = (bullseyeCount / totalShots) * 100;
    
    // Calculate consistency (standard deviation)
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / totalShots;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (standardDeviation * 10));
    
    // Calculate improvement (trend over last 5 shots)
    const recentShots = shots.slice(-5);
    const olderShots = shots.slice(-10, -5);
    const recentAvg = recentShots.reduce((sum, s) => sum + s.score, 0) / recentShots.length;
    const olderAvg = olderShots.length > 0 ? 
      olderShots.reduce((sum, s) => sum + s.score, 0) / olderShots.length : recentAvg;
    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    // Calculate session duration
    const sessionDuration = session ? 
      (Date.now() - new Date(session.startTime).getTime()) / 1000 / 60 : 0;
    
    // Calculate shots per minute
    const shotsPerMinute = sessionDuration > 0 ? totalShots / sessionDuration : 0;
    
    // Calculate grouping (average distance from center of mass)
    const centerX = shots.reduce((sum, s) => sum + s.coordinates.x, 0) / totalShots;
    const centerY = shots.reduce((sum, s) => sum + s.coordinates.y, 0) / totalShots;
    const averageDistance = shots.reduce((sum, s) => {
      const distance = Math.sqrt(
        Math.pow(s.coordinates.x - centerX, 2) + 
        Math.pow(s.coordinates.y - centerY, 2)
      );
      return sum + distance;
    }, 0) / totalShots;
    const grouping = Math.max(0, 100 - averageDistance);

    return {
      totalShots,
      averageScore,
      bestScore,
      worstScore,
      bullseyeCount,
      accuracy,
      consistency,
      improvement,
      sessionDuration,
      shotsPerMinute,
      grouping,
      averageDistance
    };
  }, [shots, session]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Get trend for improvement
  const getImprovementTrend = (): 'up' | 'down' | 'neutral' => {
    if (metrics.improvement > 5) return 'up';
    if (metrics.improvement < -5) return 'down';
    return 'neutral';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GMShootLogo size="sm" variant="gradient" />
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Live Metrics
                </CardTitle>
                <CardDescription>
                  {isSessionActive ? 'Session in progress' : 'Session completed'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Shots"
          value={metrics.totalShots}
          icon={<Target className="h-5 w-5" />}
          description="Shots fired this session"
          delay={0}
        />
        <MetricCard
          title="Average Score"
          value={metrics.averageScore.toFixed(1)}
          icon={<Gauge className="h-5 w-5" />}
          trend={getImprovementTrend()}
          trendValue={`${Math.abs(metrics.improvement).toFixed(1)}%`}
          description="Average shot score"
          variant={metrics.averageScore >= 7 ? 'success' : metrics.averageScore >= 5 ? 'warning' : 'danger'}
          delay={0.1}
        />
        <MetricCard
          title="Best Shot"
          value={metrics.bestScore}
          icon={<Award className="h-5 w-5" />}
          description="Highest score achieved"
          variant={metrics.bestScore >= 10 ? 'success' : 'default'}
          delay={0.2}
        />
        <MetricCard
          title="Accuracy"
          value={`${metrics.accuracy.toFixed(1)}%`}
          icon={<Crosshair className="h-5 w-5" />}
          description="Bullseye hit rate"
          variant={metrics.accuracy >= 50 ? 'success' : metrics.accuracy >= 25 ? 'warning' : 'default'}
          delay={0.3}
        />
      </div>

      {/* Expanded Metrics */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Consistency"
                value={`${metrics.consistency.toFixed(1)}%`}
                icon={<Activity className="h-5 w-5" />}
                description="Shot score consistency"
                variant={metrics.consistency >= 70 ? 'success' : metrics.consistency >= 50 ? 'warning' : 'default'}
                delay={0.4}
              />
              <MetricCard
                title="Grouping"
                value={`${metrics.grouping.toFixed(1)}%`}
                icon={<PieChart className="h-5 w-5" />}
                description="Shot tightness"
                variant={metrics.grouping >= 70 ? 'success' : metrics.grouping >= 50 ? 'warning' : 'default'}
                delay={0.5}
              />
              <MetricCard
                title="Shots/Min"
                value={metrics.shotsPerMinute.toFixed(1)}
                icon={<Zap className="h-5 w-5" />}
                description="Firing rate"
                delay={0.6}
              />
              <MetricCard
                title="Duration"
                value={`${Math.round(metrics.sessionDuration)}m`}
                icon={<Clock className="h-5 w-5" />}
                description="Session length"
                delay={0.7}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shot Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Shot Distribution
                  </CardTitle>
                  <CardDescription>
                    Distribution of shots across target zones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {shots.length > 0 ? (
                    <ShotDistributionChart shots={shots} />
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No shots to analyze</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Performance Ring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Overall Performance
                  </CardTitle>
                  <CardDescription>
                    Combined performance score
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {shots.length > 0 ? (
                    <ProgressRing
                      value={metrics.averageScore * 10}
                      maxValue={100}
                      size={150}
                      strokeWidth={12}
                      label="Score"
                      color={metrics.averageScore >= 7 ? '#10B981' : metrics.averageScore >= 5 ? '#F59E0B' : '#EF4444'}
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Gauge className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={onExportData}
              disabled={shots.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button
              variant="outline"
              onClick={onShareResults}
              disabled={shots.length === 0}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Results
            </Button>
            <Button
              variant="gmshoot"
              onClick={() => setSelectedMetric('performance')}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Detailed Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Loading variant="spinner" size="lg" />
        </div>
      )}
    </div>
  );
};

export default LiveMetricsDashboard;