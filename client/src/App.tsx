import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from './components/ui/button';
import LandingPage from './components/ui/digital-serenity-animated-landing-page';
import LoginSignupForm from './components/ui/login-signup';
import { AuthProvider, useAuth } from './hooks/useAuth';
import VideoAnalysis from './components/VideoAnalysis';
import CameraAnalysis from './components/CameraAnalysis';
import ReportList from './components/ReportList';
import Report from './components/Report';
import './App.css';

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
  const { user, loading, signOut } = useAuth();

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


  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

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
      <div className={`transition-all duration-500 ease-in-out ${isTransitioning ? 'transform translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'}`}>
        <div className="absolute top-4 left-4 z-50">
          <Button variant="ghost" onClick={handleBackToLanding} className="text-slate-300 hover:text-white bg-slate-800/50 backdrop-blur-sm">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>
        <LoginSignupForm />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background transition-all duration-500 ease-in-out ${isTransitioning ? 'transform -translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'}`}>
      {user && (
        <nav className="p-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-100">GMShoot</h1>
            </div>
            <div className="space-x-4">
              <Link to="/">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/analysis">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Video Analysis</Button>
              </Link>
              <Link to="/camera">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Camera Analysis</Button>
              </Link>
              <Link to="/reports">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Reports</Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Sign Out
              </Button>
            </div>
          </div>
        </nav>
      )}
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<div>Redirecting to login...</div>} />
        <Route
          path="/analysis"
          element={
            user ? <VideoAnalysis /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/camera"
          element={
            user ? <CameraAnalysis /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/reports"
          element={
            user ? <ReportList /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/report/:id"
          element={
            user ? <Report /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
