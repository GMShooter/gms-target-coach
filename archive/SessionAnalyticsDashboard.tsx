import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Crosshair,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

import { SessionData, ShotData } from '../services/HardwareAPI';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge-2';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SessionAnalyticsDashboardProps {
  sessions: SessionData[];
  shots: ShotData[];
  currentSession?: SessionData | null;
  liveData?: {
    currentAccuracy?: number;
    currentGrouping?: number;
    recentShots?: ShotData[];
    sessionDuration?: number;
  };
  refreshInterval?: number;
}

interface AnalyticsData {
  totalSessions: number;
  totalShots: number;
  averageAccuracy: number;
  bestSession: SessionData | null;
  worstSession: SessionData | null;
  improvementTrend: 'improving' | 'declining' | 'stable';
  accuracyBySession: Array<{ sessionId: string; accuracy: number; date: Date }>;
  shotDistribution: Array<{ zone: string; count: number; percentage: number }>;
  performanceMetrics: {
    consistency: number;
    precision: number;
    averageScore: number;
    bestStreak: number;
    currentStreak: number;
  };
  recentActivity: Array<{
    date: Date;
    sessions: number;
    shots: number;
    accuracy: number;
  }>;
}

export const SessionAnalyticsDashboard: React.FC<SessionAnalyticsDashboardProps> = ({
  sessions,
  shots,
  currentSession,
  liveData,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Helper function to filter sessions by time range
  const filterSessionsByTimeRange = (sessions: SessionData[], range: string): SessionData[] => {
    const now = new Date();
    let cutoffDate: Date;

    switch (range) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return sessions;
    }

    return sessions.filter(session => session.startTime >= cutoffDate);
  };

  // Calculate trend from sessions
  const calculateTrend = (sessions: SessionData[]): 'improving' | 'declining' | 'stable' => {
    if (sessions.length < 3) return 'stable';

    const accuracies = sessions.map(session => {
      const sessionShots = shots.filter(shot => shot.sessionId === session.sessionId);
      return sessionShots.length > 0
        ? sessionShots.reduce((sum, shot) => sum + shot.score, 0) / sessionShots.length
        : 0;
    });

    const firstHalf = accuracies.slice(0, Math.floor(accuracies.length / 2));
    const secondHalf = accuracies.slice(Math.floor(accuracies.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, acc) => sum + acc, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, acc) => sum + acc, 0) / secondHalf.length;

    if (secondHalfAvg > firstHalfAvg + 2) return 'improving';
    if (secondHalfAvg < firstHalfAvg - 2) return 'declining';
    return 'stable';
  };

  // Calculate performance metrics from shots
  const calculatePerformanceMetrics = (shots: ShotData[]) => {
    if (shots.length === 0) {
      return {
        consistency: 0,
        precision: 0,
        averageScore: 0,
        bestStreak: 0,
        currentStreak: 0
      };
    }

    const scores = shots.map(shot => shot.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Consistency: standard deviation of scores
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance));

    // Precision: percentage of shots in scoring zones
    const scoringShots = shots.filter(shot => shot.score > 0).length;
    const precision = (scoringShots / shots.length) * 100;

    // Streaks
    let bestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    scores.forEach(score => {
      if (score >= 8) { // Good shots
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    });
    bestStreak = Math.max(bestStreak, tempStreak);

    return {
      consistency: Math.round(consistency),
      precision: Math.round(precision),
      averageScore: Math.round(averageScore * 10) / 10,
      bestStreak,
      currentStreak
    };
  };

  // Calculate recent activity from sessions
  const calculateRecentActivity = (sessions: SessionData[]) => {
    const activity: Array<{
      date: Date;
      sessions: number;
      shots: number;
      accuracy: number;
    }> = [];

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    last7Days.forEach(date => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySessions = sessions.filter(session =>
        session.startTime >= date && session.startTime < nextDate
      );

      const dayShots = shots.filter(shot => {
        const session = sessions.find(s => s.sessionId === shot.sessionId);
        return session && session.startTime >= date && session.startTime < nextDate;
      });

      const dayAccuracy = dayShots.length > 0
        ? dayShots.reduce((sum, shot) => sum + shot.score, 0) / dayShots.length
        : 0;

      activity.push({
        date,
        sessions: daySessions.length,
        shots: dayShots.length,
        accuracy: dayAccuracy
      });
    });

    return activity.reverse();
  };

  // Calculate analytics data
  const analyticsData = useMemo((): AnalyticsData => {
    const filteredSessions = filterSessionsByTimeRange(sessions, selectedTimeRange);
    const filteredShots = shots.filter(shot => 
      filteredSessions.some(session => session.sessionId === shot.sessionId)
    );

    // Basic metrics
    const totalSessions = filteredSessions.length;
    const totalShots = filteredShots.length;
    const averageAccuracy = totalShots > 0 
      ? filteredShots.reduce((sum, shot) => sum + shot.score, 0) / totalShots 
      : 0;

    // Best and worst sessions
    const sessionAccuracies = filteredSessions.map(session => {
      const sessionShots = filteredShots.filter(shot => shot.sessionId === session.sessionId);
      const sessionAccuracy = sessionShots.length > 0
        ? sessionShots.reduce((sum, shot) => sum + shot.score, 0) / sessionShots.length
        : 0;
      return { session, accuracy: sessionAccuracy };
    });

    const bestSession = sessionAccuracies.length > 0 
      ? sessionAccuracies.reduce((best, current) => current.accuracy > best.accuracy ? current : best).session
      : null;
    
    const worstSession = sessionAccuracies.length > 0
      ? sessionAccuracies.reduce((worst, current) => current.accuracy < worst.accuracy ? current : worst).session
      : null;

    // Improvement trend
    const recentSessions = filteredSessions.slice(-10);
    const improvementTrend = calculateTrend(recentSessions);

    // Accuracy by session
    const accuracyBySession = filteredSessions.map(session => {
      const sessionShots = filteredShots.filter(shot => shot.sessionId === session.sessionId);
      const accuracy = sessionShots.length > 0
        ? sessionShots.reduce((sum, shot) => sum + shot.score, 0) / sessionShots.length
        : 0;
      return {
        sessionId: session.sessionId,
        accuracy,
        date: session.startTime
      };
    });

    // Shot distribution by scoring zones
    const zoneCounts = filteredShots.reduce((acc, shot) => {
      acc[shot.scoringZone] = (acc[shot.scoringZone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalZoneShots = Object.values(zoneCounts).reduce((sum, count) => sum + count, 0);
    const shotDistribution = Object.entries(zoneCounts).map(([zone, count]) => ({
      zone,
      count,
      percentage: totalZoneShots > 0 ? (count / totalZoneShots) * 100 : 0
    }));

    // Performance metrics
    const performanceMetrics = calculatePerformanceMetrics(filteredShots);

    // Recent activity
    const recentActivity = calculateRecentActivity(filteredSessions);

    return {
      totalSessions,
      totalShots,
      averageAccuracy,
      bestSession,
      worstSession,
      improvementTrend,
      accuracyBySession,
      shotDistribution,
      performanceMetrics,
      recentActivity
    };
  }, [sessions, shots, selectedTimeRange]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      setLastRefreshTime(new Date());
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-500';
    if (score >= 7) return 'text-yellow-500';
    if (score >= 5) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Session Analytics
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRefreshing ? 'secondary' : 'success'}>
                {isRefreshing ? 'Refreshing...' : 'Live'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLastRefreshTime(new Date())}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Comprehensive shooting performance analytics and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Last updated: {lastRefreshTime.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>

      {/* Time Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Time Range:</span>
            </div>
            <Tabs value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <TabsList>
                <TabsTrigger value="week">Last 7 Days</TabsTrigger>
                <TabsTrigger value="month">Last 30 Days</TabsTrigger>
                <TabsTrigger value="all">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{analyticsData.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{analyticsData.totalShots}</div>
              <div className="text-xs text-muted-foreground">Total Shots</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round(analyticsData.averageAccuracy * 10) / 10}
              </div>
              <div className="text-xs text-muted-foreground">Average Score</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                {getTrendIcon(analyticsData.improvementTrend)}
                <span className="text-lg font-bold capitalize">
                  {analyticsData.improvementTrend}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Performance Trend</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Detailed shooting performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {analyticsData.performanceMetrics.consistency}%
              </div>
              <div className="text-xs text-muted-foreground">Consistency</div>
              <Progress value={analyticsData.performanceMetrics.consistency} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {analyticsData.performanceMetrics.precision}%
              </div>
              <div className="text-xs text-muted-foreground">Precision</div>
              <Progress value={analyticsData.performanceMetrics.precision} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {analyticsData.performanceMetrics.averageScore}
              </div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
              <Progress value={(analyticsData.performanceMetrics.averageScore / 10) * 100} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {analyticsData.performanceMetrics.bestStreak}
              </div>
              <div className="text-xs text-muted-foreground">Best Streak</div>
              <div className="text-xs text-muted-foreground mt-1">
                Current: {analyticsData.performanceMetrics.currentStreak}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Session Data */}
      {currentSession && liveData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live Session Data
            </CardTitle>
            <CardDescription>
              Real-time metrics for current session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {liveData.currentAccuracy ? Math.round(liveData.currentAccuracy * 10) / 10 : 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Accuracy</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {liveData.currentGrouping ? Math.round(liveData.currentGrouping * 10) / 10 : 0}
                </div>
                <div className="text-xs text-muted-foreground">Grouping (cm)</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {liveData.recentShots ? liveData.recentShots.length : 0}
                </div>
                <div className="text-xs text-muted-foreground">Recent Shots</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {liveData.sessionDuration ? Math.round(liveData.sessionDuration / 60) : 0}
                </div>
                <div className="text-xs text-muted-foreground">Duration (min)</div>
              </div>
            </div>

            {/* Recent Shots */}
            {liveData.recentShots && liveData.recentShots.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recent Shots</h4>
                <div className="space-y-1">
                  {liveData.recentShots.slice(-5).map((shot, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>Shot {shot.shotId}</span>
                      <span className={getScoreColor(shot.score)}>
                        Score: {shot.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shot Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Shot Distribution
          </CardTitle>
          <CardDescription>
            Distribution of shots by scoring zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.shotDistribution.map((zone, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{zone.zone}</span>
                  <span>{zone.count} shots ({Math.round(zone.percentage)}%)</span>
                </div>
                <Progress value={zone.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Award className="h-5 w-5" />
              Best Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.bestSession ? (
              <div className="space-y-2">
                <div className="font-medium">{analyticsData.bestSession.sessionId}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(analyticsData.bestSession.startTime)}
                </div>
                <div className="text-sm">
                  Shots: {analyticsData.bestSession.shotCount}
                </div>
                <div className="text-sm">
                  Duration: {Math.round(
                    (analyticsData.bestSession.endTime?.getTime() || Date.now() - 
                     analyticsData.bestSession.startTime.getTime()) / 60000
                  )} min
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No sessions available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Worst Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.worstSession ? (
              <div className="space-y-2">
                <div className="font-medium">{analyticsData.worstSession.sessionId}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(analyticsData.worstSession.startTime)}
                </div>
                <div className="text-sm">
                  Shots: {analyticsData.worstSession.shotCount}
                </div>
                <div className="text-sm">
                  Duration: {Math.round(
                    (analyticsData.worstSession.endTime?.getTime() || Date.now() - 
                     analyticsData.worstSession.startTime.getTime()) / 60000
                  )} min
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No sessions available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Daily shooting activity for the last week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.recentActivity.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-16">
                    {formatDate(day.date)}
                  </span>
                  {day.sessions > 0 && (
                    <Badge variant="secondary">
                      {day.sessions} session{day.sessions !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{day.shots} shots</span>
                  <span>Avg: {Math.round(day.accuracy * 10) / 10}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionAnalyticsDashboard;