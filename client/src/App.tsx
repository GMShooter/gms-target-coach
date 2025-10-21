import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Alert, AlertDescription } from './components/ui/alert';
import LandingPage from './components/ui/landing_page';
import { AuthProvider, useAuth } from './hooks/useAuth';
import VideoAnalysis from './components/VideoAnalysis';
import CameraAnalysis from './components/CameraAnalysis';
import ReportList from './components/ReportList';
import Report from './components/Report';
import './App.css';

function App() {
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user, loading, error, signInWithGoogle, signInWithEmail, signOut, clearError } = useAuth();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(email, password);
      window.location.href = '/';
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      window.location.href = '/';
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

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
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 flex items-center justify-center p-4 transition-all duration-500 ease-in-out ${isTransitioning ? 'transform translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'}`}>
        <div className="absolute top-4 left-4">
          <Button variant="ghost" onClick={handleBackToLanding} className="text-slate-300 hover:text-white">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center space-y-2">
            <img src="/GMShoot_logo.png" alt="GMShoot Logo" className="h-24 w-24" />
            <CardTitle className="text-2xl text-slate-100">Welcome to GMShoot</CardTitle>
            <CardDescription className="text-slate-300">
              Sign in to access your shooting analysis dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-slate-300">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-white">{loading ? 'Signing in...' : 'Google'}</span>
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-slate-300">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-400 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
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
        <Route path="/analysis" element={<VideoAnalysis />} />
        <Route path="/camera" element={<CameraAnalysis />} />
        <Route path="/reports" element={<ReportList />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
