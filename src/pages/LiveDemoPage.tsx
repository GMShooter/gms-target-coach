import React, { useState, useEffect } from 'react';
import { Play, Square, Target } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';
import { useSoundEffects } from '../hooks/useSoundEffects';
import LiveTargetView from '../components/LiveTargetView';
import LiveMetricsDashboard from '../components/LiveMetricsDashboard';
import LiveShotVisualization from '../components/LiveShotVisualization';
import { ParticleEffects } from '../components/ParticleEffects';
import { PerformanceChart } from '../components/PerformanceChart';

const LiveDemoPage: React.FC = () => {
  const { user } = useAuth();
  const [particleTrigger, setParticleTrigger] = useState<'shot' | 'bullseye' | 'analysis' | null>(null);
  
  // Use our real-time analysis hook
  const liveAnalysis = useLiveAnalysis(`demo-session-${user?.id || 'anonymous'}`);
  
  // Sound effects
  const { playShotSound, playHitSound, playBullseyeSound, playAnalysisCompleteSound } = useSoundEffects();

  // Sound effects for new shots
  useEffect(() => {
    if (liveAnalysis.shots.length > 0) {
      const latestShot = liveAnalysis.shots[liveAnalysis.shots.length - 1];
      playShotSound();
      playHitSound(latestShot.score);
      
      if (latestShot.score >= 10) {
        playBullseyeSound();
        setParticleTrigger('bullseye');
        setTimeout(() => setParticleTrigger(null), 100);
      } else {
        setParticleTrigger('shot');
        setTimeout(() => setParticleTrigger(null), 100);
      }
    }
  }, [liveAnalysis.shots, liveAnalysis.shots.length, playShotSound, playHitSound, playBullseyeSound]);

  // Sound effect for analysis completion (when analysis stops)
  useEffect(() => {
    if (!liveAnalysis.isAnalyzing && liveAnalysis.shots.length > 0) {
      playAnalysisCompleteSound();
      setParticleTrigger('analysis');
      setTimeout(() => setParticleTrigger(null), 100);
    }
  }, [liveAnalysis.isAnalyzing, liveAnalysis.shots.length, playAnalysisCompleteSound]);

  // Generate performance data for chart
  const performanceData = liveAnalysis.shots.map((shot, index) => ({
    timestamp: index,
    score: shot.score,
    accuracy: liveAnalysis.metrics.accuracy,
    grouping: liveAnalysis.metrics.groupSize
  }));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access demo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 pt-20">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">GMShoot Live Demo</h1>
          <p className="text-slate-300 text-base sm:text-lg">Real-time shooting analysis demonstration</p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Live Shot Visualization */}
          <div className="relative order-1 xl:order-1">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Live Shot Visualization
              </h2>
              <LiveShotVisualization
                shots={liveAnalysis.shots}
                currentFrame={liveAnalysis.currentFrame}
                isAnalyzing={liveAnalysis.isAnalyzing}
                width={800}
                height={600}
              />
              <ParticleEffects
                trigger={particleTrigger}
                x={400}
                y={300}
                score={liveAnalysis.shots[liveAnalysis.shots.length - 1]?.score}
              />
            </div>
          </div>
          
          {/* Live Metrics Dashboard */}
          <div className="order-2 xl:order-2">
            <LiveMetricsDashboard
              metrics={liveAnalysis.metrics}
              isAnalyzing={liveAnalysis.isAnalyzing}
              shots={liveAnalysis.shots}
            />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mt-8 order-3">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <PerformanceChart
              data={performanceData}
              title="Performance Trends"
              height={300}
            />
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 order-4">
          <button
            onClick={liveAnalysis.startAnalysis}
            disabled={liveAnalysis.isAnalyzing}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-green-700 transition-colors min-w-[140px] flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            {liveAnalysis.isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
          </button>
          
          <button
            onClick={liveAnalysis.stopAnalysis}
            disabled={!liveAnalysis.isAnalyzing}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-red-700 transition-colors min-w-[140px] flex items-center justify-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Analysis
          </button>
          
          <button
            onClick={liveAnalysis.resetAnalysis}
            className="px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors min-w-[140px] flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
        
        {/* Error Display */}
        {liveAnalysis.error && (
          <div className="mt-8 bg-red-900/90 border border-red-700 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm order-5">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Error: {liveAnalysis.error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveDemoPage;