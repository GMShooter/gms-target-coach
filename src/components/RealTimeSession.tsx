import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Play, Square, Loader2, TrendingUp, Award } from 'lucide-react';
import { useRealTimeSession } from '@/hooks/useRealTimeSession';
import { useToast } from '@/components/ui/use-toast';

export const RealTimeSession = () => {
  const [distance, setDistance] = useState("15");
  const { sessionData, startSession, endSession, isAnalyzing, analysisResult, error, clearError } = useRealTimeSession();
  const { toast } = useToast();

  const handleStartSession = async () => {
    try {
      await startSession(distance);
      toast({
        title: "Session Started",
        description: "Live shot detection is now active",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      });
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      toast({
        title: "Session Completed",
        description: "Analysis results are ready",
      });
    } catch (err) {
      toast({
        title: "Error", 
        description: "Failed to end session",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Session Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={clearError} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analysisResult) {
    return <AnalysisResults analysis={analysisResult} />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Shooting Analysis</h1>
        <p className="text-xl text-muted-foreground">Real-time shot detection and coaching</p>
      </div>

      {!sessionData.isActive ? (
        <SessionSetup 
          distance={distance}
          setDistance={setDistance}
          onStart={handleStartSession}
        />
      ) : (
        <ActiveSession 
          sessionData={sessionData}
          onEnd={handleEndSession}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
};

const SessionSetup = ({ distance, setDistance, onStart }: {
  distance: string;
  setDistance: (d: string) => void;
  onStart: () => void;
}) => (
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Target className="h-5 w-5" />
        Session Setup
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <label className="text-sm font-medium">Distance (meters)</label>
        <select 
          value={distance} 
          onChange={(e) => setDistance(e.target.value)}
          className="w-full mt-1 p-2 border rounded-md"
        >
          <option value="5">5m</option>
          <option value="10">10m</option>
          <option value="15">15m</option>
          <option value="25">25m</option>
        </select>
      </div>
      <Button onClick={onStart} className="w-full" size="lg">
        <Play className="h-4 w-4 mr-2" />
        Start Session
      </Button>
    </CardContent>
  </Card>
);

const ActiveSession = ({ sessionData, onEnd, isAnalyzing }: {
  sessionData: any;
  onEnd: () => void;
  isAnalyzing: boolean;
}) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            Live Session Active
          </span>
          <Badge variant="secondary">{sessionData.totalShots} shots</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Shot Detection</h3>
            <div className="text-2xl font-bold text-primary">
              {sessionData.totalShots} shots detected
            </div>
            {sessionData.lastShots.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Latest shots:</p>
                {sessionData.lastShots.map((shot, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Shot at ({shot.x.toFixed(0)}, {shot.y.toFixed(0)})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Target View</h3>
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
              <Target className="h-24 w-24 text-muted-foreground" />
              {sessionData.lastShots.map((shot, idx) => (
                <div
                  key={idx}
                  className="absolute w-3 h-3 bg-red-500 rounded-full animate-pulse"
                  style={{
                    left: `${(shot.x / 1640) * 100}%`,
                    top: `${(shot.y / 840) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="text-center">
      <Button 
        onClick={onEnd} 
        size="lg" 
        variant="destructive"
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing Results...
          </>
        ) : (
          <>
            <Square className="h-4 w-4 mr-2" />
            End Session
          </>
        )}
      </Button>
    </div>
  </div>
);

const AnalysisResults = ({ analysis }: { analysis: any }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold">Session Complete</h1>
      <p className="text-muted-foreground">Your shooting analysis is ready</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Accuracy" 
        value={analysis.sessionMetrics.accuracy}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard 
        title="Total Score" 
        value={analysis.sessionMetrics.totalScore}
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard 
        title="Group Size" 
        value={analysis.sessionMetrics.groupSize}
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard 
        title="Grade" 
        value={analysis.sessionMetrics.performanceGrade}
        icon={<Award className="h-4 w-4" />}
      />
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Coaching Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
          <ul className="list-disc list-inside space-y-1">
            {analysis.coachingAnalysis.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="text-sm">{strength}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-orange-600 mb-2">Areas for Improvement</h4>
          <ul className="list-disc list-inside space-y-1">
            {analysis.coachingAnalysis.areasForImprovement.map((area: string, idx: number) => (
              <li key={idx} className="text-sm">{area}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Coaching Advice</h4>
          <p className="text-sm text-muted-foreground">{analysis.coachingAnalysis.coachingAdvice}</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

const MetricCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </div>
    </CardContent>
  </Card>
);