
import React, { useState } from 'react';
import { VideoUpload } from '../components/VideoUpload';
import { AnalysisResults } from '../components/AnalysisResults';
import { Target, Camera, TrendingUp } from 'lucide-react';

const Index = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleVideoUpload = async (file: File) => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate realistic mock analysis data
    const mockData = generateMockAnalysis();
    setAnalysisData(mockData);
    setIsAnalyzing(false);
  };

  const generateMockAnalysis = () => {
    const shots = [
      { id: 1, score: 9, ring: '9', direction: 'Too left', comment: 'Trigger jerk detected', x: -15, y: 5 },
      { id: 2, score: 10, ring: '10', direction: 'Centered', comment: 'Excellent shot', x: 2, y: -1 },
      { id: 3, score: 8, ring: '8', direction: 'Too low', comment: 'Possible flinch', x: 3, y: -25 },
      { id: 4, score: 9, ring: '9', direction: 'Too left', comment: 'Consistent left pattern', x: -12, y: 8 },
      { id: 5, score: 10, ring: '10', direction: 'Centered', comment: 'Good control', x: 1, y: 3 },
      { id: 6, score: 7, ring: '7', direction: 'Too left', comment: 'Grip pressure issue', x: -28, y: -5 },
      { id: 7, score: 9, ring: '9', direction: 'Too left', comment: 'Trigger control needed', x: -18, y: 2 },
      { id: 8, score: 10, ring: '10', direction: 'Centered', comment: 'Perfect execution', x: 0, y: -2 },
    ];

    const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0);
    const maxScore = shots.length * 10;
    const accuracy = (shots.filter(shot => shot.score >= 9).length / shots.length * 100).toFixed(0);
    const groupSize = calculateGroupSize(shots);
    const leftShots = shots.filter(shot => shot.direction.includes('left')).length;
    const directionalTrend = Math.round((leftShots / shots.length) * 100);

    return {
      shots,
      metrics: {
        accuracy: `${accuracy}% in 9/10 ring`,
        groupSize: `${groupSize}mm`,
        directionalTrend: `${directionalTrend}% left of center`,
        totalScore: `${totalScore}/${maxScore}`
      },
      summary: {
        performance: "Your shooting shows good consistency with tight grouping, but there's a clear leftward bias in 62% of your shots.",
        advice: "Focus on smooth, straight-back trigger pull. Consider dry-fire practice to eliminate trigger jerk. Your group size indicates good fundamentals - now work on centering.",
        strengths: ["Consistent grouping", "Good trigger discipline on centered shots", "Steady shooting position"],
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
                  <span>Video Analysis</span>
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
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                Upload video from your target-mounted camera and receive expert coaching feedback 
                with detailed shot analysis, performance metrics, and actionable improvement tips.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <Target className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Shot Detection</h3>
                <p className="text-slate-400">Automatically detect and score each bullet impact with precise position analysis.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <TrendingUp className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
                <p className="text-slate-400">Get accuracy percentages, group sizes, and directional trends like a pro coach.</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <Camera className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Expert Coaching</h3>
                <p className="text-slate-400">Receive personalized feedback and actionable advice based on your shooting patterns.</p>
              </div>
            </div>

            <VideoUpload onVideoUpload={handleVideoUpload} />
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
