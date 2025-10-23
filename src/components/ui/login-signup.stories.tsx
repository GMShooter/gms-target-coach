import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import LoginSignupForm from './login-signup';

const meta: Meta<typeof LoginSignupForm> = {
  title: 'Components/LoginSignupForm',
  component: LoginSignupForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {
  args: {},
};

export const Signup: Story = {
  render: () => {
    // Create a modified version that starts in signup mode
    const SignupForm = () => {
      const [isLogin, setIsLogin] = React.useState(false);
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800">
          <div className="w-full max-w-md">
            <div className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl rounded-lg p-6">
              <div className="flex flex-col items-center space-y-2 pb-6">
                <h2 className="text-2xl font-semibold text-white">
                  Create an account
                </h2>
                <p className="text-slate-400 text-center">
                  Welcome! Create an account to get started with shooting analysis.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium">
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    return <SignupForm />;
  },
};

export const WithError: Story = {
  render: () => {
    const ErrorForm = () => {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800">
          <div className="w-full max-w-md">
            <div className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl rounded-lg p-6">
              <div className="flex flex-col items-center space-y-2 pb-6">
                <h2 className="text-2xl font-semibold text-white">
                  Sign in to GMShoot
                </h2>
                <p className="text-slate-400 text-center">
                  Welcome back! Please sign in to continue.
                </p>
              </div>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-md text-sm">
                  Invalid email or password. Please try again.
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md"
                  />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    return <ErrorForm />;
  },
};

export const WithLoading: Story = {
  render: () => {
    const LoadingForm = () => {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800">
          <div className="w-full max-w-md">
            <div className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl rounded-lg p-6">
              <div className="flex flex-col items-center space-y-2 pb-6">
                <h2 className="text-2xl font-semibold text-white">
                  Sign in to GMShoot
                </h2>
                <p className="text-slate-400 text-center">
                  Welcome back! Please sign in to continue.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    defaultValue="test@example.com"
                    disabled
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm font-medium">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    defaultValue="••••••••"
                    disabled
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-md opacity-50"
                  />
                </div>
                <button 
                  disabled
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium opacity-50 flex items-center justify-center"
                >
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Please wait...
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    return <LoadingForm />;
  },
};