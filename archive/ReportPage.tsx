import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Target, TrendingUp, Clock, Crosshair } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge-2';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabase';
import { MagicCard } from '../components/ui/magic-card';
import TargetVisualization from '../components/TargetVisualization';

interface ShotData {
  id: string;
  shot_number: number;
  x_coordinate: number;
  y_coordinate: number;
  score: number;
  scoring_zone: string;
  confidence_score: number;
  timestamp: string;
  shot_data: any;
  geometric_scoring_data: any;
  sequential_detection_data: any;
}

interface SessionData {
  id: string;
  title: string;
  status: string;
  session_type: string;
  created_at: string;
  completed_at: string;
  performance_summary?: string;
  strengths?: string;
  areas_for_improvement?: string;
  coaching_advice?: string;
  target_image_url?: string;
}

interface SessionStatistics {
  total_shots: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  accuracy_percentage: number;
  session_duration_seconds: number;
  shots_per_minute: number;
}

const ReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [shots, setShots] = useState<ShotData[]>([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // const supabase = createClient(); // Using imported supabase instance instead

  useEffect(() => {
    if (sessionId && user) {
      fetchSessionData();
    }
  }, [sessionId, user]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Session not found');

      setSession(sessionData);

      // Fetch session shots using the optimized function
      const { data: shotsData, error: shotsError } = await supabase
        .rpc('get_session_shots_with_scoring', { p_session_id: sessionId });

      if (shotsError) throw shotsError;
      setShots(shotsData || []);

      // Fetch session statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_session_statistics', { p_session_id: sessionId });

      if (statsError) throw statsError;
      setStatistics(statsData?.[0] || null);

    } catch (err: any) {
      console.error('Error fetching session data:', err);
      setError(err.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    if (score >= 5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoringZoneColor = (zone: string) => {
    const zoneColors: { [key: string]: string } = {
      'bullseye': 'bg-red-500',
      'inner': 'bg-orange-500',
      'middle': 'bg-yellow-500',
      'outer': 'bg-blue-500',
      'edge': 'bg-gray-500'
    };
    return zoneColors[zone] || 'bg-gray-400';
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export to PDF not yet implemented');
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Share functionality not yet implemented');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => navigate('/history')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Session not found</p>
              <Button onClick={() => navigate('/history')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/history')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{session.title || 'Session Report'}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(session.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={session.status === 'completed' ? 'primary' : 'secondary'}>
                {session.status}
              </Badge>
              <Badge variant="outline">{session.session_type}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target Visualization */}
            <MagicCard className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Shot Distribution
                </CardTitle>
                <CardDescription>
                  Visual representation of all shots on the target
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shots.length > 0 && statistics ? (
                  <TargetVisualization
                    shots={shots}
                    statistics={statistics}
                    className="mb-6"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No shots recorded for this session
                  </div>
                )}
              </CardContent>
            </MagicCard>

            {/* Shot Details Table */}
            <MagicCard className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crosshair className="h-5 w-5 mr-2" />
                  Shot Details
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of each shot in the session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Score</th>
                          <th className="text-left p-2">Zone</th>
                          <th className="text-left p-2">Confidence</th>
                          <th className="text-left p-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shots.map((shot) => (
                          <tr key={shot.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{shot.shot_number}</td>
                            <td className={`p-2 font-bold ${getScoreColor(shot.score)}`}>
                              {shot.score}
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className="capitalize">
                                {shot.scoring_zone || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {Math.round(shot.confidence_score * 100)}%
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {new Date(shot.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No shots recorded for this session
                  </div>
                )}
              </CardContent>
            </MagicCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            {statistics && (
              <MagicCard className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Session Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {statistics.total_shots}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Shots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {statistics.average_score?.toFixed(1) || '0.0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.highest_score || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Highest</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {statistics.lowest_score || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Lowest</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <span className="text-sm font-medium">
                        {formatDuration(statistics.session_duration_seconds || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Shots/Min:</span>
                      <span className="text-sm font-medium">
                        {statistics.shots_per_minute?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Accuracy:</span>
                      <span className="text-sm font-medium">
                        {statistics.accuracy_percentage?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </MagicCard>
            )}

            {/* Actions */}
            <MagicCard className="p-6">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleExportPDF} 
                  className="w-full" 
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button 
                  onClick={handleShare} 
                  className="w-full" 
                  variant="outline"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Report
                </Button>
              </CardContent>
            </MagicCard>

            {/* Coaching Advice */}
            {(session.strengths || session.areas_for_improvement || session.coaching_advice) && (
              <MagicCard className="p-6">
                <CardHeader>
                  <CardTitle>Coaching Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.strengths && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                      <p className="text-sm text-muted-foreground">{session.strengths}</p>
                    </div>
                  )}
                  {session.areas_for_improvement && (
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">Areas to Improve</h4>
                      <p className="text-sm text-muted-foreground">{session.areas_for_improvement}</p>
                    </div>
                  )}
                  {session.coaching_advice && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">Coaching Advice</h4>
                      <p className="text-sm text-muted-foreground">{session.coaching_advice}</p>
                    </div>
                  )}
                </CardContent>
              </MagicCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;