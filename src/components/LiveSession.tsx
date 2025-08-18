import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Target, Clock, TrendingUp } from "lucide-react";
import { useRealTimeSession } from "@/hooks/useRealTimeSession";
import { useToast } from "@/components/ui/use-toast";

const LiveSession = () => {
  const { toast } = useToast();
  const {
    sessionData,
    isAnalyzing,
    analysisResult,
    error,
    startSession,
    endSession
  } = useRealTimeSession();

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const handleStartSession = async () => {
    try {
      const sessionId = await startSession();
      if (sessionId) {
        setSessionStartTime(Date.now());
        toast({
          title: "Session Started",
          description: "Real-time analysis is now active",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Start Session",
        description: error.message || "Unable to connect to camera",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      setSessionStartTime(null);
      toast({
        title: "Session Ended",
        description: "Analysis complete. Check your results below.",
      });
    } catch (error: any) {
      toast({
        title: "Error Ending Session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSessionDuration = () => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  };

  const getShotRate = () => {
    if (!sessionStartTime || sessionData.totalShots === 0) return 0;
    const durationMinutes = (Date.now() - sessionStartTime) / 1000 / 60;
    return (sessionData.totalShots / durationMinutes).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Training Session</h2>
          <p className="text-muted-foreground">Real-time shot detection and analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {sessionData.isActive ? (
            <Badge variant="destructive" className="gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              Recording
            </Badge>
          ) : (
            <Badge variant="secondary">Ready</Badge>
          )}
        </div>
      </div>

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Session Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {!sessionData.isActive ? (
              <Button onClick={handleStartSession} disabled={isAnalyzing} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Session
              </Button>
            ) : (
              <Button onClick={handleEndSession} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                End Session
              </Button>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" role="alert">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Statistics */}
      {sessionData.isActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getSessionDuration()}s</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shots Detected</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessionData.totalShots}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getShotRate()}/min</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Session Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Score</label>
                <div className="text-2xl font-bold">{analysisResult.sessionMetrics.totalScore}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Accuracy</label>
                <div className="text-2xl font-bold">{analysisResult.sessionMetrics.accuracy}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Group Size</label>
                <div className="text-2xl font-bold">{analysisResult.sessionMetrics.groupSize}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Grade</label>
                <div className="text-2xl font-bold">{analysisResult.sessionMetrics.performanceGrade}</div>
              </div>
            </div>

            {analysisResult.coachingAnalysis && (
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Coaching Analysis</h4>
                  <p className="text-sm text-muted-foreground">{analysisResult.coachingAnalysis.performanceSummary}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-green-600 dark:text-green-400 mb-2">Strengths</h5>
                    <ul className="text-sm space-y-1">
                      {analysisResult.coachingAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="text-muted-foreground">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Areas for Improvement</h5>
                    <ul className="text-sm space-y-1">
                      {analysisResult.coachingAnalysis.areasForImprovement.map((area, index) => (
                        <li key={index} className="text-muted-foreground">• {area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveSession;