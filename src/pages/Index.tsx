import React, { useState } from 'react';
import { VideoUpload } from '../components/VideoUpload';
import { CameraCapture } from '../components/CameraCapture';
import { AnalysisResults } from '../components/AnalysisResults';
import { Target, Camera, TrendingUp, Video, VideoIcon } from 'lucide-react';

const Index = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');

  const handleVideoUpload = async (file: File) => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate realistic mock analysis data
    const mockData = generateMockAnalysis();
    setAnalysisData(mockData);
    setIsAnalyzing(false);
  };

  const handleCameraAnalysis = async (shotData: any) => {
    // Real-time shot detection from camera
    setAnalysisData(shotData);
  };

  const generateMockAnalysis = () => {
    const shots = [
      { id: 1, score: 9, ring: '9', direction: 'Too left', comment: 'Trigger jerk detected', x: -15, y: 5, timestamp: Date.now() - 8000 },
      { id: 2, score: 10, ring: '10', direction: 'Centered', comment: 'Excellent shot', x: 2, y: -1, timestamp: Date.now() - 7000 },
      { id: 3, score: 8, ring: '8', direction: 'Too low', comment: 'Possible flinch', x: 3, y: -25, timestamp: Date.now() - 6000 },
      { id: 4, score: 9, ring: '9', direction: 'Too left', comment: 'Consistent left pattern', x: -12, y: 8, timestamp: Date.now() - 5000 },
      { id: 5, score: 10, ring: '10', direction: 'Centered', comment: 'Good control', x: 1, y: 3, timestamp: Date.now() - 4000 },
      { id: 6, score: 7, ring: '7', direction: 'Too left', comment: 'Grip pressure issue', x: -28, y: -5, timestamp: Date.now() - 3000 },
      { id: 7, score: 9, ring: '9', direction: 'Too left', comment: 'Trigger control needed', x: -18, y: 2, timestamp: Date.now() - 2000 },
      { id: 8, score: 10, ring: '10', direction: 'Centered', comment: 'Perfect execution', x: 0, y: -2, timestamp: Date.now() - 1000 },
      { id: 9, score: 8, ring: '8', direction: 'Too right', comment: 'Overcorrection', x: 22, y: 8, timestamp: Date.now() - 500 },
      { id: 10, score: 9, ring: '9', direction: 'Centered', comment: 'Good recovery', x: 3, y: -4, timestamp: Date.now() },
    ];

    // Keep only last 10 shots
    const last10Shots = shots.slice(-10);

    const totalScore = last10Shots.reduce((sum, shot) => sum + shot.score, 0);
    const maxScore = last10Shots.length * 10;
    const accuracy = (last10Shots.filter(shot => shot.score >= 9).length / last10Shots.length * 100).toFixed(0);
    const groupSize = calculateGroupSize(last10Shots);
    const leftShots = last10Shots.filter(shot => shot.direction.includes('left')).length;
    const directionalTrend = Math.round((leftShots / last10Shots.length) * 100);

    return {
      shots: last10Shots,
      metrics: {
        accuracy: `${accuracy}% in 9/10 ring`,
        groupSize: `${groupSize}mm`,
        directionalTrend: `${directionalTrend}% left of center`,
        totalScore: `${totalScore}/${maxScore}`
      },
      summary: {
        performance: "Your last 10 shots show good consistency with tight grouping, but there's a leftward bias in some shots.",
        advice: "Focus on smooth, straight-back trigger pull. Consider dry-fire practice to eliminate trigger jerk. Your group size indicates good fundamentals.",
        strengths: ["Consistent grouping", "Good trigger discipline", "Steady shooting position"],
        improvements: ["Trigger control", "Grip consistency", "Follow-through"]
      },
      safetyNote: null
    };
  };

  const calculateGroupSize = (shots) => {
    if (shots.length < 2) return 0;
    
    let maxDistance = 0;
    for (let i = 0; i < shots.length; i++) {
      for (let j = i + 1; j < shots.length; j++) {
        const distance = Math.sqrt(
          Math.pow(shots[i].x - shots[j].x, 2) + 
          Math.pow(shots[i].y - shots[j].y, 2)
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    }
    return Math.round(maxDistance);
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
              <h1 className="text-2xl font-bold">GMShooter</h1>
              <p className="text-slate-400">Virtual Shooting Coach & Performance Analyzer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!analysisData && !isAnalyzing ? (
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
                  <span>Shot Detection</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  <span>Performance Metrics</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Professional Shooting Analysis
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
                Real-time camera analysis or video upload with AI-powered shot detection, 
                performance metrics, and expert coaching feedback.
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
                <h3 className="text-lg font-semibold mb-2">Shot Detection</h3>
                <p className="text-slate-400">Real-time detection and scoring of bullet impacts with precise position analysis.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <TrendingUp className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Last 10 Shots</h3>
                <p className="text-slate-400">Visualize your most recent 10 shots on an accurate target representation.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <Camera className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Expert Coaching</h3>
                <p className="text-slate-400">Receive personalized feedback and actionable advice based on your shooting patterns.</p>
              </div>
            </div>

            {/* Dynamic Content Based on Mode */}
            {mode === 'upload' ? (
              <VideoUpload onVideoUpload={handleVideoUpload} />
            ) : (
              <CameraCapture onShotDetected={handleCameraAnalysis} />
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12">
              <div className="animate-spin w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Analyzing Your Shooting Performance</h3>
              <div className="space-y-2 text-slate-400">
                <p>🎯 Detecting bullet impacts...</p>
                <p>📊 Calculating performance metrics...</p>
                <p>🎓 Generating coaching feedback...</p>
              </div>
            </div>
          </div>
        ) : (
          <AnalysisResults data={analysisData} onNewAnalysis={() => setAnalysisData(null)} />
        )}
      </main>
    </div>
  );
};

export default Index;
