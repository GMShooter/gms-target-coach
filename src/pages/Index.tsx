
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoUpload } from '../components/VideoUpload';
import { CameraCapture } from '../components/CameraCapture';
import { AnalysisResults } from '../components/AnalysisResults';
import { Target, Camera, TrendingUp, Video, VideoIcon, Crosshair, Zap, Brain, Eye, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [firstFrameBase64, setFirstFrameBase64] = useState<string | undefined>(undefined);
  const [lastFrameBase64, setLastFrameBase64] = useState<string | undefined>(undefined);
  const [heroTitleIndex, setHeroTitleIndex] = useState(0);

  const heroTitles = useMemo(
    () => ["precise", "intelligent", "advanced", "real-time", "professional"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHeroTitleIndex((prev) => (prev + 1) % heroTitles.length);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [heroTitleIndex, heroTitles]);

  const handleVideoUpload = async (file: File) => {
    console.log('Video uploaded:', file.name);
  };

  const handleAnalysisComplete = (newSessionId: string, firstFrame?: string, lastFrame?: string) => {
    setSessionId(newSessionId);
    setFirstFrameBase64(firstFrame);
    setLastFrameBase64(lastFrame);
  };

  const handleCameraAnalysis = async (shotData: any) => {
    console.log('Camera shot detected:', shotData);
    if (shotData.sessionId) {
      setSessionId(shotData.sessionId);
    }
  };

  const handleNewAnalysis = () => {
    setSessionId(null);
    setFirstFrameBase64(undefined);
    setLastFrameBase64(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-red-500/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-500/8 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl"
      >
        <div className="container mx-auto px-6 py-8">
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 rounded-2xl blur-md opacity-50" />
              <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl shadow-xl">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                GMShooter SOTA
              </h1>
              <p className="text-slate-400 text-lg font-medium">State-of-the-Art Shooting Analysis & AI Coach</p>
            </div>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!sessionId ? (
            <motion.div
              key="main-interface"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-w-6xl mx-auto"
            >
              {/* Hero Section */}
              <div className="text-center mb-16">
                <motion.div 
                  className="flex justify-center gap-12 mb-12"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {[
                    { Icon: Crosshair, label: "SOTA Detection", color: "text-red-400" },
                    { Icon: Brain, label: "AI Analysis", color: "text-blue-400" },
                    { Icon: Eye, label: "Real-time", color: "text-green-400" },
                    { Icon: BarChart3, label: "Performance", color: "text-purple-400" }
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="flex items-center gap-3 text-slate-300"
                      whileHover={{ scale: 1.1, y: -5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={`p-2 rounded-xl bg-slate-800/50 ${item.color}`}>
                        <item.Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="flex gap-6 flex-col mb-12">
                  <h2 className="text-6xl md:text-8xl max-w-5xl mx-auto tracking-tight text-center font-bold leading-tight">
                    <span className="text-slate-100">State-of-the-Art</span>
                    <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-6 md:pt-2">
                      &nbsp;
                      {heroTitles.map((title, index) => (
                        <motion.span
                          key={index}
                          className="absolute font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent"
                          initial={{ opacity: 0, y: 100 }}
                          animate={
                            heroTitleIndex === index
                              ? { y: 0, opacity: 1 }
                              : { y: heroTitleIndex > index ? -150 : 150, opacity: 0 }
                          }
                          transition={{ type: "spring", stiffness: 50, damping: 20 }}
                        >
                          {title}
                        </motion.span>
                      ))}
                    </span>
                    <span className="text-slate-100">analysis</span>
                  </h2>

                  <motion.p 
                    className="text-xl md:text-2xl leading-relaxed tracking-tight text-slate-400 max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Revolutionary Roboflow detection with frame-by-frame comparison logic, 
                    generalized shot identification, and comprehensive Gemini AI coaching for professional shooting analysis.
                  </motion.p>
                </div>

                {/* Mode Selection */}
                <motion.div 
                  className="flex justify-center gap-6 mb-16"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  {[
                    { mode: 'camera', Icon: Camera, label: 'Live Camera', description: 'Real-time analysis' },
                    { mode: 'upload', Icon: VideoIcon, label: 'Upload Video', description: 'Frame-by-frame processing' }
                  ].map((option) => (
                    <motion.button
                      key={option.mode}
                      onClick={() => setMode(option.mode as 'upload' | 'camera')}
                      className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                        mode === option.mode 
                          ? 'border-red-500 bg-red-500/10 shadow-2xl shadow-red-500/20' 
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex flex-col items-center gap-4 min-w-[200px]">
                        <div className={`p-4 rounded-xl transition-colors ${
                          mode === option.mode ? 'bg-red-500' : 'bg-slate-700 group-hover:bg-slate-600'
                        }`}>
                          <option.Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{option.label}</h3>
                          <p className="text-slate-400 text-sm">{option.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {/* Features Grid */}
              <motion.div 
                className="grid md:grid-cols-3 gap-8 mb-16"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                {[
                  {
                    Icon: Target,
                    title: "SOTA Detection",
                    description: "Real Roboflow API with frame-by-frame comparison logic for precise shot identification.",
                    color: "red"
                  },
                  {
                    Icon: TrendingUp,
                    title: "Smart Analysis",
                    description: "Generalized analysis engine with no hardcoded assumptions about shot patterns.",
                    color: "blue"
                  },
                  {
                    Icon: Brain,
                    title: "AI Coaching",
                    description: "Comprehensive Gemini analysis with full context and professional ballistics feedback.",
                    color: "purple"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="group relative p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:bg-slate-800/50 transition-all duration-300"
                    whileHover={{ y: -10, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/0 to-slate-900/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className={`w-12 h-12 mb-6 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center`}>
                        <feature.Icon className={`w-6 h-6 text-${feature.color}-400`} />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Dynamic Content */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                {mode === 'upload' ? (
                  <VideoUpload 
                    onVideoUpload={handleVideoUpload} 
                    onAnalysisComplete={handleAnalysisComplete}
                  />
                ) : (
                  <CameraCapture onShotDetected={handleCameraAnalysis} />
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="analysis-results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <AnalysisResults 
                sessionId={sessionId} 
                onNewAnalysis={handleNewAnalysis}
                firstFrameBase64={firstFrameBase64}
                lastFrameBase64={lastFrameBase64}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
