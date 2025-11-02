import React, { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';

export function LiveDemoPage() {
  const { user, signOut } = useAuth();
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);
  
  const {
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
    currentFrame,
    shots,
    metrics,
    isAnalyzing,
    error
  } = useLiveAnalysis();

  const handleStartAnalysis = () => {
    setIsAnalysisActive(true);
    startAnalysis();
  };

  const handleStopAnalysis = () => {
    setIsAnalysisActive(false);
    stopAnalysis();
  };

  const handleReset = () => {
    setIsAnalysisActive(false);
    resetAnalysis();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/GMShoot_logo.png" alt="GMShoot" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-white">Live Demo</h1>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Target View (70%) */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Target View</h2>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isAnalyzing ? 'text-green-400' : 'text-slate-400'}`}>
                    {isAnalyzing ? '● Analyzing' : '● Idle'}
                  </span>
                </div>
              </div>

              {/* Target Display */}
              <div className="relative bg-slate-900/50 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                {currentFrame ? (
                  <img
                    src={currentFrame}
                    alt="Target"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-2 border-slate-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                      </div>
                      <p className="text-slate-400">No frame available</p>
                    </div>
                  </div>
                )}

                {/* Shot Overlays */}
                {shots.map((shot, index) => (
                  <div
                    key={index}
                    className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                    style={{
                      left: `${shot.x}%`,
                      top: `${shot.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))}
              </div>

              {/* Analysis Controls */}
              <div className="flex items-center gap-4 mt-6">
                {!isAnalysisActive ? (
                  <button
                    onClick={handleStartAnalysis}
                    disabled={isAnalyzing}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? 'Starting...' : 'Start Analysis'}
                  </button>
                ) : (
                  <button
                    onClick={handleStopAnalysis}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Stop Analysis
                  </button>
                )}
                
                <button
                  onClick={handleReset}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Metrics (30%) */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Metrics Card */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Live Metrics</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Shots</span>
                    <span className="text-2xl font-bold text-white">{metrics.totalShots}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Group Size</span>
                    <span className="text-2xl font-bold text-white">{metrics.groupSize.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">MPI</span>
                    <span className="text-2xl font-bold text-white">
                      {metrics.mpi.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Last Score</span>
                    <span className="text-2xl font-bold text-white">
                      {shots.length > 0 ? shots[shots.length - 1].score : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Shots */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Shots</h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {shots.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No shots detected yet</p>
                  ) : (
                    shots.slice(-5).reverse().map((shot, index) => (
                      <div key={shots.length - 1 - index} className="flex justify-between items-center py-2 border-b border-slate-700/50">
                        <span className="text-slate-300">Shot #{shots.length - index}</span>
                        <span className="text-white font-medium">Score: {shot.score}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status</span>
                    <span className={`text-sm font-medium ${isAnalysisActive ? 'text-green-400' : 'text-slate-400'}`}>
                      {isAnalysisActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Frame</span>
                    <span className="text-white font-medium">
                      {shots.length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">FPS</span>
                    <span className="text-white font-medium">30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}