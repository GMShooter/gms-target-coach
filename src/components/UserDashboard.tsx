import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, BarChart3, Calendar, TrendingUp, LogOut, User, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSessionData } from "@/hooks/useSessionData";
import { VideoUpload } from "@/components/VideoUpload";
import LiveSession from "@/components/LiveSession";

interface Session {
  id: string;
  created_at: string;
  total_score: number | null;
  group_size_mm: number | null;
  accuracy_percentage: number | null;
  directional_trend: string | null;
  drill_mode: boolean | null;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: sessionData } = useSessionData(selectedSessionId);

  useEffect(() => {
    const fetchUserAndSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }
        
        setUser(user);

        const { data: sessionsData, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSessions(sessionsData || []);
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSessions();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateStats = () => {
    const totalSessions = sessions.length;
    const avgScore = sessions.reduce((acc, s) => acc + (s.total_score || 0), 0) / totalSessions || 0;
    const avgAccuracy = sessions.reduce((acc, s) => acc + (s.accuracy_percentage || 0), 0) / totalSessions || 0;
    const bestSession = sessions.reduce((best, current) => 
      (current.total_score || 0) > (best?.total_score || 0) ? current : best, sessions[0]);

    return { totalSessions, avgScore, avgAccuracy, bestSession };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Shooting Analysis Dashboard</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button onClick={handleSignOut} variant="outline" className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAccuracy.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestSession?.total_score || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Live Session</TabsTrigger>
          <TabsTrigger value="sessions">Session History</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="training">Video Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <LiveSession />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions recorded yet. Start your first session to see your progress!
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSessionId(selectedSessionId === session.id ? null : session.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          {session.drill_mode && (
                            <Badge variant="secondary">Drill Mode</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{session.total_score || 0}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.accuracy_percentage?.toFixed(1) || 0}% accuracy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {sessionData && (
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Score</label>
                    <div className="text-2xl font-bold">{sessionData.session.total_score}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Group Size</label>
                    <div className="text-2xl font-bold">{sessionData.session.group_size_mm?.toFixed(1)}mm</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Accuracy</label>
                    <div className="text-2xl font-bold">{sessionData.session.accuracy_percentage?.toFixed(1)}%</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Shots</label>
                    <div className="text-2xl font-bold">{sessionData.shots.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Score Trend</h3>
                    <div className="space-y-2">
                      {sessions.slice(0, 5).map((session, index) => (
                        <div key={session.id} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-medium">{session.total_score || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Accuracy Trend</h3>
                    <div className="space-y-2">
                      {sessions.slice(0, 5).map((session, index) => (
                        <div key={session.id} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-medium">{session.accuracy_percentage?.toFixed(1) || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoUpload 
                onVideoUpload={(file) => {
                  toast({
                    title: "Video Uploaded", 
                    description: `Processing ${file.name}...`
                  });
                }}
                onAnalysisComplete={(sessionId) => {
                  toast({
                    title: "Analysis Complete",
                    description: "Video analysis finished successfully"
                  });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;