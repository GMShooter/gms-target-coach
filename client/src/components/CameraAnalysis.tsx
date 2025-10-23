import React, { useEffect, useRef, useState } from 'react';
import { useCameraAnalysis } from '../hooks/useCameraAnalysis';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Camera, CameraOff } from 'lucide-react';
import { Badge } from './ui/badge-2';

const CameraAnalysis: React.FC = () => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { isAnalyzing, error, startAnalysis, stopAnalysis, latestFrame } = useCameraAnalysis(userId);

  useEffect(() => {
    if (latestFrame) {
      // The frame is now an SVG in base64 format
      const frameUrl = `data:image/svg+xml;base64,${latestFrame}`;
      setImageSrc(frameUrl);
    } else {
      setImageSrc("");
    }
  }, [latestFrame]);

  // Ensure the src attribute is always a string
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.setAttribute('src', imageSrc || "");
    }
  }, [imageSrc]);

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleToggleAnalysis = async () => {
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
        <p className="text-slate-300">Use your camera to analyze your shooting technique in real-time</p>
      </div>

      <Card className="border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-slate-100">Live Camera Analysis</h2>
          <CardDescription className="text-slate-300">
            Connect to your camera to analyze the video stream in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-slate-900 rounded-md overflow-hidden aspect-video flex items-center justify-center">
            {/* Remote camera feed */}
            <img
              ref={imageRef}
              alt="Live camera feed"
              className="w-full h-full object-contain"
            />
            
            {isAnalyzing && (
              <div className="absolute top-2 left-2">
                <Badge variant="destructive" size="sm" className="bg-red-600 text-white px-2 py-1">
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  REC
                </Badge>
              </div>
            )}
            
            {!isAnalyzing && !latestFrame && (
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                <p className='text-slate-400'>Camera feed will appear here</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleToggleAnalysis}
              disabled={!userId && !isAnalyzing}
              variant={isAnalyzing ? 'destructive' : 'default'}
              className={`flex-1 text-white ${!isAnalyzing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isAnalyzing ? (
                <>
                  <CameraOff className="mr-2 h-4 w-4 text-white" />
                  Stop Analysis
                </>
              ) : (
                <>
                  {!userId && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                  <Camera className="mr-2 h-4 w-4 text-white" />
                  {userId ? 'Start Live Analysis' : 'Authentication Required'}
                </>
              )}
            </Button>
          </div>

          {!userId && (
            <Alert className="bg-amber-900/20 border-amber-800 text-amber-200">
              <AlertDescription>
                You need to be authenticated to start camera analysis. Please sign in to access this feature.
              </AlertDescription>
            </Alert>
          )}

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