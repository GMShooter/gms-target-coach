import React, { useEffect, useState, useRef } from 'react';
import { useCameraAnalysis } from '../hooks/useCameraAnalysis';
import { supabase } from '../utils/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';

const CameraAnalysis: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { isAnalyzing, error, startAnalysis, stopAnalysis, latestFrame } = useCameraAnalysis(userId);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user:", error);
      else if (data.user) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (latestFrame && imageRef.current) {
      const frameUrl = `data:image/jpeg;base64,${latestFrame}`;
      imageRef.current.src = frameUrl;
    }
  }, [latestFrame]);

  const handleToggleAnalysis = () => {
    if (isAnalyzing) {
      stopAnalysis();
    } else if (userId) {
      startAnalysis();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Camera Analysis</h1>
        <p className="text-slate-300">Connect to the remote camera to analyze your shooting technique in real-time</p>
      </div>

      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Live Camera Analysis</CardTitle>
          <CardDescription className="text-slate-300">
            Connect to the remote camera to analyze the video stream.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-md overflow-hidden aspect-video flex items-center justify-center">
            <img 
              ref={imageRef} 
              alt="Live camera feed" 
              className="w-full h-full object-contain" 
            />
            {isAnalyzing && (
              <div className="absolute top-2 left-2 flex items-center bg-red-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                REC
              </div>
            )}
            {!isAnalyzing && !latestFrame && (
              <p className='text-gray-400'>Camera feed will appear here</p>
            )}
          </div>

          <Button
            onClick={handleToggleAnalysis}
            disabled={!userId && !isAnalyzing}
            variant={isAnalyzing ? 'destructive' : 'default'}
            className="w-full"
          >
            {isAnalyzing ? (
              'Stop Analysis'
            ) : (
              <>
                {!userId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Live Analysis
              </>
            )}
          </Button>

          {error && (
            <Alert className="bg-red-900/20 border-red-800 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraAnalysis;