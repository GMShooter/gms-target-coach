import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { Button } from './components/ui/button';
import MagicLogin from './components/ui/magic-login';
import { MagicDock } from './components/ui/magicui';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LiveDemoPage from './pages/LiveDemoPage';
import { QueryProvider } from './lib/query-client';
import './App.css';


function App() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryProvider>
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
      // eslint-disable-next-line no-console
      console.error('Sign out error:', error);
    }
  };

  // Custom dock items for GMShoot Demo
  const dockItems = [
    {
      id: 'demo',
      label: 'Live Demo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M9 10l4.553-2.276A1 1 0 0114 8.618v6.764a1 1 0 01-1.447.894L9 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => window.location.href = '/demo',
      active: location.pathname === '/demo'
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
          
          {/* User menu in top-right */}
          <div className="fixed top-4 right-4 z-40 flex items-center space-x-4" data-testid="user-menu">
            <div className="text-slate-300 text-sm" data-testid="user-display-name">
              {user.fullName || user.email}
            </div>
          </div>
          
          {/* MagicDock navigation */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <MagicDock items={dockItems} />
          </div>
        </>
      )}
      
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/login" element={<div>Redirecting to login...</div>} />
        <Route
          path="/demo"
          element={
            <div className={user ? "pt-20" : ""}>
              {user ? <LiveDemoPage /> : <Navigate to="/login" replace />}
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
