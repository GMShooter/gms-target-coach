import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Eye,
  ArrowRight,
  RefreshCw,
  Filter,
  Download,
  Trash2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge-2';
import { Alert, AlertDescription } from '../components/ui/alert';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

interface SessionData {
  id: string;
  user_id: string;
  session_type: string;
  status: 'active' | 'completed' | 'paused' | 'emergency_stopped';
  created_at: string;
  updated_at: string;
  start_time?: string;
  end_time?: string;
  shot_count?: number;
  average_score?: number;
  settings?: {
    targetDistance?: number;
    targetSize?: number;
    detectionSensitivity?: number;
  };
}

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load session history from Supabase
  const loadSessionHistory = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('analysis_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply time range filter
      if (selectedTimeRange !== 'all') {
        const now = new Date();
        let cutoffDate: Date;

        switch (selectedTimeRange) {
          case 'week':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffDate = new Date(0);
        }

        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error loading session history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load sessions on component mount and when time range changes
  useEffect(() => {
    loadSessionHistory();
  }, [user, selectedTimeRange]);

  // Handle session selection
  const handleSessionSelect = (session: SessionData) => {
    navigate(`/report/${session.id}`);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSessionHistory();
  };

  // Format duration
  const formatDuration = (start: string, end?: string): string => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'secondary' | 'success' | 'warning' | 'destructive' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'secondary';
      case 'paused':
        return 'warning';
      case 'emergency_stopped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get status text
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
      case 'emergency_stopped':
        return 'Emergency Stopped';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session History
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isRefreshing ? 'secondary' : 'success'}>
                  {isRefreshing ? 'Refreshing...' : 'Live'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              View and analyze your past shooting sessions
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Time Range Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Time Range:</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedTimeRange === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('week')}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={selectedTimeRange === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('month')}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={selectedTimeRange === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('all')}
                >
                  All Time
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-slate-300">Loading session history...</div>
              </div>
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Sessions Found</h3>
                <p className="text-slate-400 mb-6">
                  {selectedTimeRange === 'all' 
                    ? "You haven't completed any shooting sessions yet."
                    : `No sessions found in the selected time range.`
                  }
                </p>
                <Button onClick={() => navigate('/connect')} size="lg">
                  <Target className="h-5 w-5 mr-2" />
                  Start Your First Session
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Sessions List */
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card 
                key={session.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handleSessionSelect(session)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-white">
                        {session.session_type || 'Shooting Session'}
                      </h3>
                      <Badge variant={getStatusVariant(session.status)}>
                        {getStatusText(session.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <span className="text-sm">{formatDate(session.created_at)}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Duration</div>
                      <div className="font-medium text-white">
                        {formatDuration(session.start_time || session.created_at, session.end_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Shots</div>
                      <div className="font-medium text-white">
                        {session.shot_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Avg Score</div>
                      <div className="font-medium text-white">
                        {session.average_score ? Math.round(session.average_score * 10) / 10 : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Type</div>
                      <div className="font-medium text-white capitalize">
                        {session.session_type || 'Standard'}
                      </div>
                    </div>
                  </div>

                  {/* Session Performance Indicators */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center space-x-4 text-sm">
                      {session.shot_count && session.shot_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <Target className="h-4 w-4 text-green-500" />
                          <span className="text-slate-300">{session.shot_count} shots</span>
                        </div>
                      )}
                      {session.average_score && session.average_score > 7 && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span className="text-slate-300">Good performance</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSessionSelect(session);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!isLoading && sessions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Summary Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{sessions.length}</div>
                  <div className="text-xs text-slate-400">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {sessions.reduce((sum, session) => sum + (session.shot_count || 0), 0)}
                  </div>
                  <div className="text-xs text-slate-400">Total Shots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {sessions.length > 0 
                      ? Math.round(
                          (sessions.reduce((sum, session) => sum + (session.average_score || 0), 0) / sessions.length) * 10
                        ) / 10
                      : 0
                    }
                  </div>
                  <div className="text-xs text-slate-400">Average Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {sessions.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-xs text-slate-400">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;