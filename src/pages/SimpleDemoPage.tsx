import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';

export function SimpleDemoPage() {
  const { user, signOut } = useAuth();
  
  // Generate or retrieve session ID for demo
  const [sessionId] = useState(() => {
    // Check if there's an existing session in localStorage
    const existingSession = localStorage.getItem('demo-session-id');
    if (existingSession) {
      console.log('🎯 Using existing demo session:', existingSession);
      return existingSession;
    }
    
    // Generate new session ID
    const newSessionId = `demo-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('demo-session-id', newSessionId);
    console.log('🎯 Created new demo session:', newSessionId);
    return newSessionId;
  });
  
  const {
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
    currentFrame,
    shots,
    metrics,
    error
  } = useLiveAnalysis(sessionId); // ✅ Pass sessionId to hook!

  const handleStartAnalysis = () => {
    startAnalysis();
  };

  const handleStopAnalysis = () => {
    stopAnalysis();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/GMShoot_logo.png" alt="GMShoot" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-white">GMShoot Live Demo</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-white/80 text-sm">{user?.email}</span>
              <button
                onClick={signOut}
                className="text-white/80 hover:text-white text-sm"
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
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Live Target View</h2>
                <div className="flex gap-3">
                  {!isAnalyzing ? (
                    <button
                      onClick={handleStartAnalysis}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Start Analysis
                    </button>
                  ) : (
                    <button
                      onClick={handleStopAnalysis}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Stop Analysis
                    </button>
                  )}
                </div>
              </div>

              {/* Target Display */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {currentFrame ? (
                  <img
                    src={currentFrame}
                    alt="Target"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white/50">No active feed</p>
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

              {/* Status */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-white/80 text-sm">
                  Status: {isAnalyzing ? 'Analyzing' : 'Stopped'}
                </span>
                <span className="text-white/80 text-sm">
                  Shots: {shots.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel - Metrics (30%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Metrics Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Live Metrics</h3>
              
              <div className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Last Shot Score</p>
                  <p className="text-2xl font-bold text-white">
                    {shots.length > 0 ? shots[shots.length - 1].score : '-'}
                  </p>
                </div>

                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Group Size</p>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.groupSize || '-'}
                  </p>
                </div>

                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Mean Point of Impact</p>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.mpi || '-'}
                  </p>
                </div>

                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-white/60 text-sm mb-1">Total Shots</p>
                  <p className="text-2xl font-bold text-white">
                    {shots.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Shots */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Shots</h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shots.slice(-5).reverse().map((shot, index) => (
                  <div key={index} className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-white/80 text-sm">Shot #{shots.length - index}</span>
                    <span className="text-white font-medium">Score: {shot.score}</span>
                  </div>
                ))}
                
                {shots.length === 0 && (
                  <p className="text-white/50 text-center py-4">No shots yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}