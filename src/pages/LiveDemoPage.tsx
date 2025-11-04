import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Activity, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Smartphone,
  Tablet,
  Zap,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { type ShotData } from '../services/HardwareAPI';
import { useAuth } from '../hooks/useAuth';
import LiveTargetView from '../components/LiveTargetView';
import { LiveMetricsDashboard } from '../components/LiveMetricsDashboard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { GMShootLogo } from '../components/ui/gmshoot-logo';

interface LiveDemoPageProps {
  className?: string;
}

export const LiveDemoPage: React.FC<LiveDemoPageProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [shots, setShots] = useState<ShotData[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [metricsCollapsed, setMetricsCollapsed] = useState(false);

  // Detect device type and adjust layout
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setLayoutMode('mobile');
        setMetricsCollapsed(true);
      } else if (width < 1024) {
        setLayoutMode('tablet');
        setMetricsCollapsed(false);
      } else {
        setLayoutMode('desktop');
        setMetricsCollapsed(false);
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // Simulate connection for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Handle shot detection
  const handleShotDetected = (shot: ShotData) => {
    setShots(prev => [...prev, shot]);
  };

  // Handle session complete
  const handleSessionComplete = (results: ShotData[]) => {
    setIsSessionActive(false);
    // Could show a summary modal here
  };

  // Handle demo connection
  const handleDemoConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
    }, 2000);
  };

  // Handle disconnect
  const handleDisconnect = () => {
    setIsConnected(false);
    setIsSessionActive(false);
    setShots([]);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Export data handler
  const handleExportData = () => {
    const data = {
      sessionId: `demo-session-${Date.now()}`,
      userId: user?.id,
      shots,
      timestamp: new Date().toISOString(),
      metrics: {
        totalShots: shots.length,
        averageScore: shots.length > 0 ? shots.reduce((sum, s) => sum + s.score, 0) / shots.length : 0,
        bestScore: shots.length > 0 ? Math.max(...shots.map(s => s.score)) : 0
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmshoot-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share results handler
  const handleShareResults = async () => {
    const shareData = {
      title: 'GMShoot Session Results',
      text: `I just completed a shooting session with ${shots.length} shots and an average score of ${shots.length > 0 ? (shots.reduce((sum, s) => sum + s.score, 0) / shots.length).toFixed(1) : 0}!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    // Simulate refresh
    window.location.reload();
  };

  // Get layout classes based on device
  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'mobile':
        return 'grid grid-cols-1 gap-4';
      case 'tablet':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-4';
      case 'desktop':
      default:
        return metricsCollapsed 
          ? 'grid grid-cols-1 gap-4' 
          : 'grid grid-cols-1 lg:grid-cols-3 gap-6';
    }
  };

  // Get target view column span
  const getTargetViewSpan = () => {
    switch (layoutMode) {
      case 'mobile':
        return 'col-span-1';
      case 'tablet':
        return 'col-span-1 lg:col-span-2';
      case 'desktop':
      default:
        return metricsCollapsed ? 'col-span-1' : 'col-span-1 lg:col-span-2';
    }
  };

  // Get metrics column span
  const getMetricsSpan = () => {
    switch (layoutMode) {
      case 'mobile':
        return 'col-span-1';
      case 'tablet':
        return 'col-span-1';
      case 'desktop':
      default:
        return metricsCollapsed ? 'col-span-1' : 'col-span-1 lg:col-span-1';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      {/* Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-8 max-w-md mx-4 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <GMShootLogo size="xl" variant="gradient" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to GMShoot Live</h2>
              <p className="text-slate-400 mb-6">
                Experience professional shooting analysis with real-time metrics and advanced target detection.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time shot detection</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Professional metrics</span>
                </div>
              </div>
              <Button
                onClick={() => setShowWelcome(false)}
                variant="gmshoot"
                className="w-full mt-6"
              >
                Get Started
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu toggle */}
              {layoutMode === 'mobile' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="text-white"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              
              <div className="flex items-center space-x-3">
                <GMShootLogo size="sm" variant="gradient" />
                <div>
                  <h1 className="text-xl font-bold text-white">GMShoot Live</h1>
                  <p className="text-xs text-slate-400">Professional Shooting Analysis</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Connection status */}
              <Badge variant={isConnected ? "success" : "destructive"} className="hidden sm:flex">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>

              {/* Device indicator */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
                {layoutMode === 'mobile' && <Smartphone className="h-4 w-4" />}
                {layoutMode === 'tablet' && <Tablet className="h-4 w-4" />}
                {layoutMode === 'desktop' && <Monitor className="h-4 w-4" />}
                <span className="capitalize">{layoutMode}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMetricsCollapsed(!metricsCollapsed)}
                  className="hidden lg:flex"
                >
                  {metricsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && layoutMode === 'mobile' && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              className="bg-slate-800 w-64 h-full p-4"
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <GMShootLogo size="sm" variant="gradient" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Connection</span>
                    <Badge variant={isConnected ? "success" : "destructive"}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  {!isConnected && (
                    <Button
                      variant="gmshoot"
                      size="sm"
                      onClick={handleDemoConnect}
                      disabled={isConnecting}
                      className="w-full mt-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loading variant="spinner" size="sm" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Demo Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Session</span>
                    <Badge variant={isSessionActive ? "warning" : "default"}>
                      {isSessionActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {shots.length} shots recorded
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setMetricsCollapsed(!metricsCollapsed)}
                  className="w-full justify-start"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {metricsCollapsed ? 'Show' : 'Hide'} Metrics
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Connection Error Alert */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium">Connection Error</p>
                  <p className="text-red-300 text-sm">{connectionError}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectionError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Two-Panel Layout */}
        <div className={getLayoutClasses()}>
          {/* Target View Panel (70% on desktop) */}
          <div className={getTargetViewSpan()}>
            <LiveTargetView
              sessionId="demo-session"
              onShotDetected={handleShotDetected}
              onSessionComplete={handleSessionComplete}
            />
          </div>

          {/* Metrics Dashboard Panel (30% on desktop) */}
          <AnimatePresence>
            {!metricsCollapsed && (
              <motion.div
                className={getMetricsSpan()}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LiveMetricsDashboard
                  shots={shots}
                  isSessionActive={isSessionActive}
                  onExportData={handleExportData}
                  onShareResults={handleShareResults}
                  onRefresh={handleRefresh}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Metrics Toggle */}
        {layoutMode === 'mobile' && metricsCollapsed && shots.length > 0 && (
          <div className="fixed bottom-4 right-4 z-20">
            <Button
              variant="gmshoot"
              size="sm"
              onClick={() => setMetricsCollapsed(false)}
              className="rounded-full shadow-lg"
            >
              <Activity className="h-4 w-4 mr-2" />
              View Metrics
            </Button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-6 max-w-md mx-4 w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2">Display</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Layout Mode</span>
                      <Badge variant="outline" className="capitalize">{layoutMode}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Fullscreen</span>
                      <Badge variant={isFullscreen ? "success" : "default"}>
                        {isFullscreen ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2">Session</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total Shots</span>
                      <span className="text-sm text-white">{shots.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Session Status</span>
                      <Badge variant={isSessionActive ? "warning" : "default"}>
                        {isSessionActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2">About</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <GMShootLogo size="xs" variant="gradient" />
                      <span className="text-sm text-white">GMShoot v2.0</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Professional shooting analysis platform with real-time metrics and advanced target detection.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveDemoPage;