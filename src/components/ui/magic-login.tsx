"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';

import { cn } from '../../lib/utils';

import { MagicButton } from './magic-button';
import { MagicCard } from './magic-card';
import { TextGradient } from './text-gradient';

interface MagicLoginProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onSignup?: (email: string, password: string, name: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  className?: string;
}

export const MagicLogin: React.FC<MagicLoginProps> = ({
  onLogin,
  onSignup,
  onGoogleSignIn,
  className
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    login: ''
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      login: ''
    };

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    // Name validation for signup
    if (!isLogin && !formData.name) {
      newErrors.login = 'Name is required';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password && !newErrors.login;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        await onLogin?.(formData.email, formData.password);
      } else {
        await onSignup?.(formData.email, formData.password, formData.name);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      let errorMessage = 'An error occurred';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid credentials';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error';
      }
      
      setErrors(prev => ({ ...prev, login: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await onGoogleSignIn?.();
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", className)} data-testid="login-page">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        {/* Floating elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <div className="absolute top-40 right-32 w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-75" />
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-150" />
        <div className="absolute bottom-20 right-20 w-4 h-4 bg-indigo-400 rounded-full animate-pulse delay-300" />
      </div>

      <MagicCard
        variant="glass"
        className="w-full max-w-md p-8 backdrop-blur-xl border-white/10"
        hover="lift"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <TextGradient
            variant="primary"
            animation="fadeIn"
            className="text-3xl font-bold mb-2"
            data-testid="login-title"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </TextGradient>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name field for signup */}
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your name"
                required={!isLogin}
                data-testid="name-input"
              />
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
              required
              data-testid="email-input"
            />
            <div className={`text-red-500 text-sm ${errors.email ? 'block' : 'hidden'}`} data-testid="email-error">
              {errors.email}
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
                required
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                data-testid="toggle-password-visibility"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className={`text-red-500 text-sm ${errors.password ? 'block' : 'hidden'}`} data-testid="password-error">
              {errors.password}
            </div>
          </div>

          {/* Login error */}
          <div className={`text-red-500 text-sm ${errors.login ? 'block' : 'hidden'}`} data-testid="login-error">
            {errors.login}
          </div>

          {/* Loading spinner */}
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto" data-testid="loading-spinner"></div>
          )}

          {/* Submit button */}
          <MagicButton
            type="submit"
            variant="gradient"
            size="lg"
            disabled={isLoading}
            className="w-full py-3 text-base font-semibold"
            loading={isLoading}
            data-testid="login-button"
          >
            <div className="flex items-center justify-center gap-2">
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </div>
          </MagicButton>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900/50 text-slate-400 backdrop-blur-sm">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <MagicButton
          type="button"
          variant="outline"
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 border-slate-700 hover:bg-slate-800/50"
          loading={isLoading}
          data-testid="google-sign-in-button"
        >
          <div className="flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </div>
        </MagicButton>

        {/* Toggle between login/signup */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
              data-testid="signup-link"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </MagicCard>
    </div>
  );
};

export default MagicLogin;