import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  Target, 
  BarChart3, 
  Settings, 
  User, 
  LogOut, 
  ChevronDown,
  ChevronRight,
  Shield,
  Camera,
  FileText,
  HelpCircle,
  Zap,
  Wifi,
  WifiOff,
  Bell,
  Search,
  Moon,
  Sun,
  Globe,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GMShootLogo } from '../ui/gmshoot-logo';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className = '' }) => {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [searchQuery, setSearchQuery] = useState('');

  // Detect device type
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
        setSidebarOpen(false);
      } else if (width < 1024) {
        setDeviceType('tablet');
        setSidebarOpen(false);
      } else {
        setDeviceType('desktop');
        setSidebarOpen(true);
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      path: '/dashboard'
    },
    {
      id: 'live-demo',
      label: 'Live Demo',
      icon: <Target className="h-5 w-5" />,
      path: '/demo',
      badge: 'LIVE'
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/analysis',
      children: [
        {
          id: 'sessions',
          label: 'Sessions',
          icon: <Camera className="h-4 w-4" />,
          path: '/analysis/sessions'
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText className="h-4 w-4" />,
          path: '/analysis/reports'
        }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      path: '/settings',
      children: [
        {
          id: 'profile',
          label: 'Profile',
          icon: <User className="h-4 w-4" />,
          path: '/settings/profile'
        },
        {
          id: 'hardware',
          label: 'Hardware',
          icon: <Shield className="h-4 w-4" />,
          path: '/settings/hardware'
        }
      ]
    }
  ];

  // Handle navigation
  const handleNavigation = (path: string) => {
    window.location.href = path;
    if (deviceType === 'mobile') {
      setSidebarOpen(false);
    }
  };

  // Toggle expanded items
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get device icon
  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${className}`}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            {deviceType !== 'desktop' && (
              <motion.div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <motion.div
              className={`fixed top-0 left-0 h-full bg-slate-800 border-r border-slate-700 z-50 ${
                deviceType === 'desktop' ? 'w-64' : 'w-72'
              }`}
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <GMShootLogo size="lg" variant="gradient" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                      className="lg:hidden"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {navigationItems.map((item) => (
                    <div key={item.id}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          window.location.pathname === item.path ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        onClick={() => {
                          if (item.children) {
                            toggleExpanded(item.id);
                          } else {
                            handleNavigation(item.path);
                          }
                        }}
                      >
                        {item.icon}
                        <span className="ml-3">{item.label}</span>
                        {item.badge && (
                          <Badge variant="warning" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {item.children && (
                          <span className="ml-auto">
                            {expandedItems.includes(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </Button>

                      {/* Sub-items */}
                      <AnimatePresence>
                        {item.children && expandedItems.includes(item.id) && (
                          <motion.div
                            className="ml-4 mt-2 space-y-1"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.children.map((child) => (
                              <Button
                                key={child.id}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start ${
                                  window.location.pathname === child.path ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                onClick={() => handleNavigation(child.path)}
                              >
                                {child.icon}
                                <span className="ml-2">{child.label}</span>
                              </Button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon()}
                      <span className="text-xs text-slate-400 capitalize">{deviceType}</span>
                    </div>
                    <Badge variant={isOnline ? "success" : "destructive"} className="text-xs">
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-slate-500 text-center">
                    GMShoot v2.0<br />
                    © 2024 All rights reserved
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex flex-col h-screen ${sidebarOpen && deviceType === 'desktop' ? 'ml-64' : ''}`}>
        {/* Top Navigation */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search */}
              <div className="hidden md:flex items-center bg-slate-700 rounded-lg px-3 py-2 w-64">
                <Search className="h-4 w-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-white placeholder-slate-400 text-sm w-full"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="hidden sm:flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-slate-400">
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </Button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 border-b border-slate-700">
                        <h3 className="text-sm font-medium text-white">Notifications</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-slate-400">No new notifications</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 border-b border-slate-700">
                        <p className="text-sm font-medium text-white">{user?.email}</p>
                        <p className="text-xs text-slate-400">Premium Account</p>
                      </div>
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleNavigation('/settings/profile')}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleNavigation('/settings')}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleNavigation('/help')}
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Help
                        </Button>
                        <hr className="my-2 border-slate-700" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-400 hover:text-red-300"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Search Bar */}
      {deviceType === 'mobile' && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 z-20">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder-slate-400 text-sm flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;