import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from './components/ui/button';
import MagicLandingPage from './components/ui/magic-landing-page';
import MagicLogin from './components/ui/magic-login';
import { MagicDock, defaultDockItems } from './components/ui/magicui';
import { AuthProvider, useAuth } from './hooks/useAuth';
import VideoAnalysis from './components/VideoAnalysis';
import CameraAnalysis from './components/CameraAnalysis';
import ReportList from './components/ReportList';
import Report from './components/Report';
import './App.css';

// Dashboard component for logged-in users
const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to GMShoot</h1>
          <p className="text-slate-300 text-lg">Your shooting analysis dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Video Analysis</h2>
            </div>
            <p className="text-slate-400 mb-4">Upload and analyze your shooting videos for detailed performance metrics</p>
            <a href="/analysis" className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium">
              Get Started
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M9 10l4.553-2.276A1 1 0 0114 8.618v6.764a1 1 0 01-1.447.894L9 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Camera Analysis</h2>
            </div>
            <p className="text-slate-400 mb-4">Use your camera for real-time shooting analysis and feedback</p>
            <a href="/camera" className="inline-flex items-center text-green-400 hover:text-green-300 font-medium">
              Start Camera
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Reports</h2>
            </div>
            <p className="text-slate-400 mb-4">View detailed analysis reports and track your progress over time</p>
            <a href="/reports" className="inline-flex items-center text-purple-400 hover:text-purple-300 font-medium">
              View Reports
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        
        <div className="mt-12 bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Recent Analysis</h2>
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-400 text-lg mb-4">No analysis sessions yet</p>
            <a href="/analysis" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Start Your First Analysis
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user, loading, signOut, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Custom dock items for GMShoot
  const dockItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      onClick: () => window.location.href = '/',
      active: location.pathname === '/'
    },
    {
      id: 'video-analysis',
      label: 'Video Analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
        </svg>
      ),
      onClick: () => window.location.href = '/analysis',
      active: location.pathname === '/analysis'
    },
    {
      id: 'camera-analysis',
      label: 'Camera Analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M9 10l4.553-2.276A1 1 0 0114 8.618v6.764a1 1 0 01-1.447.894L9 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => window.location.href = '/camera',
      active: location.pathname === '/camera'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => window.location.href = '/reports',
      active: location.pathname === '/reports' || location.pathname.startsWith('/report/')
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      onClick: handleSignOut,
      active: false
    }
  ];

  // Check if we should show the login screen
  useEffect(() => {
    if (location.pathname === '/login') {
      setIsTransitioning(true);
      setTimeout(() => {
        setShowLogin(true);
        setIsTransitioning(false);
      }, 50);
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setShowLogin(false);
        setIsTransitioning(false);
      }, 50);
    }
  }, [location.pathname]);

  const handleBackToLanding = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 50);
  };


  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If we're on the login path, show login screen
  if (showLogin) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 transition-all duration-500 ease-in-out ${isTransitioning ? 'transform translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'} fixed inset-0 z-50`}>
        <div className="fixed top-4 left-4 z-60">
          <Button variant="ghost" onClick={handleBackToLanding} className="text-slate-300 hover:text-white bg-slate-800/50 backdrop-blur-sm border border-slate-600/50">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <MagicLogin
            onLogin={signInWithEmail}
            onSignup={signUpWithEmail}
            onGoogleSignIn={signInWithGoogle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background transition-all duration-500 ease-in-out ${isTransitioning ? 'transform -translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'} relative`}>
      {user && (
        <>
          {/* Logo in top-left */}
          <div className="fixed top-4 left-4 z-40 flex items-center space-x-2">
            <img src="/GMShoot_logo.png" alt="GMShoot" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-slate-100">GMShoot</h1>
          </div>
          
          {/* MagicDock navigation */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <MagicDock items={dockItems} />
          </div>
        </>
      )}
      
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <MagicLandingPage />} />
        <Route path="/login" element={<div>Redirecting to login...</div>} />
        <Route
          path="/analysis"
          element={
            <div className={user ? "pt-20" : ""}>
              {user ? <VideoAnalysis /> : <Navigate to="/login" replace />}
            </div>
          }
        />
        <Route
          path="/camera"
          element={
            <div className={user ? "pt-20" : ""}>
              {user ? <CameraAnalysis /> : <Navigate to="/login" replace />}
            </div>
          }
        />
        <Route
          path="/reports"
          element={
            <div className={user ? "pt-20" : ""}>
              {user ? <ReportList /> : <Navigate to="/login" replace />}
            </div>
          }
        />
        <Route
          path="/report/:id"
          element={
            <div className={user ? "pt-20" : ""}>
              {user ? <Report /> : <Navigate to="/login" replace />}
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
