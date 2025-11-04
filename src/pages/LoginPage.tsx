import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Target,
  Zap,
  Shield,
  Award,
  Camera,
  BarChart3,
  Users,
  Globe,
  Smartphone,
  Wifi,
  Monitor
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { GMShootLogo } from '../components/ui/gmshoot-logo';

interface LoginPageProps {
  className?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ className = '' }) => {
  const { signInWithEmail, signUpWithEmail, user, loading, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [browserInfo, setBrowserInfo] = useState({ name: '', version: '' });

  // Detect browser
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let browserName = 'Unknown';
      let browserVersion = '';

      if (userAgent.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        browserVersion = match ? match[1] : '';
      } else if (userAgent.indexOf('Safari') > -1) {
        browserName = 'Safari';
        const match = userAgent.match(/Version\/(\d+)/);
        browserVersion = match ? match[1] : '';
      } else if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        const match = userAgent.match(/Firefox\/(\d+)/);
        browserVersion = match ? match[1] : '';
      } else if (userAgent.indexOf('Edge') > -1) {
        browserName = 'Edge';
        const match = userAgent.match(/Edge\/(\d+)/);
        browserVersion = match ? match[1] : '';
      }

      setBrowserInfo({ name: browserName, version: browserVersion });
    };

    detectBrowser();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/demo';
    }
  }, [user, loading]);

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.fullName) {
        errors.fullName = 'Full name is required';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
      } else {
        await signUpWithEmail(formData.email, formData.password, formData.fullName);
        setShowSuccess(true);
        setTimeout(() => {
          setIsLogin(true);
          setShowSuccess(false);
          setFormData({ email: '', password: '', confirmPassword: '', fullName: '' });
        }, 3000);
      }
    } catch (err) {
      // Error is handled by useAuth hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Get browser icon
  const getBrowserIcon = () => {
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 ${className}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Panel - Branding & Features */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="text-center lg:text-left space-y-8">
              {/* Logo */}
              <div className="flex justify-center lg:justify-start">
                <GMShootLogo size="xl" variant="gradient" />
              </div>

              {/* Tagline */}
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                  Professional Shooting
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    Analysis Platform
                  </span>
                </h1>
                <p className="text-lg text-slate-400">
                  Experience the future of shooting analysis with real-time metrics, 
                  advanced target detection, and professional-grade analytics.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Precision Detection</h3>
                    <p className="text-sm text-slate-400">Advanced computer vision for accurate shot detection</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex items-start space-x-3"
                >
                  <div className="p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Real-time Analytics</h3>
                    <p className="text-sm text-slate-400">Live performance metrics and insights</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex items-start space-x-3"
                >
                  <div className="p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Secure & Reliable</h3>
                    <p className="text-sm text-slate-400">Enterprise-grade security for your data</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex items-start space-x-3"
                >
                  <div className="p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                    <Smartphone className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Cross-Platform</h3>
                    <p className="text-sm text-slate-400">Works on all devices and browsers</p>
                  </div>
                </motion.div>
              </div>

              {/* Browser Compatibility */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Browser Compatibility</span>
                  <Badge variant="success" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Compatible
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {getBrowserIcon()}
                  <span className="text-sm text-slate-400">
                    {browserInfo.name} {browserInfo.version}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-2">
                  <Monitor className="h-4 w-4 text-slate-500" />
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-slate-500 ml-2">All browsers supported</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Panel - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="text-center">
                {/* Mobile Logo */}
                <div className="lg:hidden flex justify-center mb-4">
                  <GMShootLogo size="lg" variant="gradient" />
                </div>
                
                <CardTitle className="text-2xl font-bold text-white">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isLogin 
                    ? 'Sign in to access your shooting analysis dashboard'
                    : 'Join GMShoot and start analyzing your performance'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Success Message */}
                  <AnimatePresence>
                    {showSuccess && (
                      <motion.div
                        className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-400 text-sm">
                            Account created successfully! Please check your email.
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-400 text-sm">{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Full Name (Signup only) */}
                  {!isLogin && (
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="text-sm font-medium text-slate-300">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="pl-10"
                          disabled={isSubmitting}
                        />
                      </div>
                      {formErrors.fullName && (
                        <p className="text-xs text-red-400">{formErrors.fullName}</p>
                      )}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-slate-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-xs text-red-400">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-slate-300">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-xs text-red-400">{formErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password (Signup only) */}
                  {!isLogin && (
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="pl-10"
                          disabled={isSubmitting}
                        />
                      </div>
                      {formErrors.confirmPassword && (
                        <p className="text-xs text-red-400">{formErrors.confirmPassword}</p>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="gmshoot"
                    className="w-full"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting || loading ? (
                      <>
                        <Loading variant="spinner" size="sm" />
                        {isLogin ? 'Signing In...' : 'Creating Account...'}
                      </>
                    ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle Login/Signup */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-400">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setFormErrors({});
                        setFormData({ email: '', password: '', confirmPassword: '', fullName: '' });
                      }}
                      className="ml-1 text-orange-500 hover:text-orange-400 font-medium"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>

                {/* Demo Account */}
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 text-center mb-2">
                    Want to try the demo?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFormData({
                        email: 'demo@gmshoot.com',
                        password: 'demo123',
                        confirmPassword: 'demo123',
                        fullName: 'Demo User'
                      });
                      setIsLogin(true);
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Use Demo Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;