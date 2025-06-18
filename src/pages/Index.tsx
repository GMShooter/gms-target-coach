
import React, { useState } from 'react';
import { VideoUpload } from '../components/VideoUpload';
import { CameraCapture } from '../components/CameraCapture';
import { AnalysisResults } from '../components/AnalysisResults';
import { Target, Camera, TrendingUp, Video, VideoIcon } from 'lucide-react';

const Index = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [firstFrameBase64, setFirstFrameBase64] = useState<string | undefined>(undefined);
  const [lastFrameBase64, setLastFrameBase64] = useState<string | undefined>(undefined);

  const handleVideoUpload = async (file: File) => {
    console.log('Video uploaded:', file.name);
  };

  const handleAnalysisComplete = (newSessionId: string, firstFrame?: string, lastFrame?: string) => {
    setSessionId(newSessionId);
    setFirstFrameBase64(firstFrame);
    setLastFrameBase64(lastFrame);
  };

  const handleCameraAnalysis = async (shotData: any) => {
    // Real-time shot detection from camera
    console.log('Camera shot detected:', shotData);
    if (shotData.sessionId) {
      setSessionId(shotData.sessionId);
    }
  };

  const handleNewAnalysis = () => {
    setSessionId(null);
    setFirstFrameBase64(undefined);
    setLastFrameBase64(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-red-600 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GMShooter SOTA</h1>
              <p className="text-slate-400">State-of-the-Art Shooting Analysis & Real-Time Coach</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!sessionId ? (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="flex justify-center gap-8 mb-8">
                <div className="flex items-center gap-2 text-slate-300">
                  <Camera className="w-5 h-5 text-red-400" />
                  <span>Real-time Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Target className="w-5 h-5 text-red-400" />
                  <span>SOTA Detection</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  <span>AI Coaching</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                State-of-the-Art Shooting Analysis
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
                Real-time Roboflow detection with frame-by-frame comparison logic, 
                generalized shot detection, and comprehensive Gemini AI coaching.
              </p>

              {/* Mode Selection */}
              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={() => setMode('camera')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    mode === 'camera' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  Live Camera
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    mode === 'upload' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <VideoIcon className="w-5 h-5" />
                  Upload Video
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <Target className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">SOTA Detection</h3>
                <p className="text-slate-400">Real Roboflow API with frame-by-frame comparison logic for precise new shot identification.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <TrendingUp className="w-8 h-8 text-red-400 mb-4" />
                <p className="text-slate-400">Generalized analysis engine with no hardcoded assumptions about shot count or patterns.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <Camera className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Coaching</h3>
                <p className="text-slate-400">Comprehensive Gemini analysis with full frame context and professional ballistics feedback.</p>
              </div>
            </div>

            {/* Dynamic Content Based on Mode */}
            {mode === 'upload' ? (
              <VideoUpload 
                onVideoUpload={handleVideoUpload} 
                onAnalysisComplete={handleAnalysisComplete}
              />
            ) : (
              <CameraCapture onShotDetected={handleCameraAnalysis} />
            )}
          </div>
        ) : (
          <AnalysisResults 
            sessionId={sessionId} 
            onNewAnalysis={handleNewAnalysis}
            firstFrameBase64={firstFrameBase64}
            lastFrameBase64={lastFrameBase64}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
