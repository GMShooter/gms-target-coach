
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { Target, TrendingUp, RotateCcw, AlertTriangle, CheckCircle, XCircle, Timer, Award, Crosshair, BarChart3 } from 'lucide-react';
import { ShotTable } from './ShotTable';
import { TargetVisualization } from './TargetVisualization';
import { PerformanceMetrics } from './PerformanceMetrics';
import { FrameValidation } from './FrameValidation';
import { useSessionData } from '@/hooks/useSessionData';

interface AnalysisResultsProps {
  sessionId: string;
  onNewAnalysis: () => void;
  firstFrameBase64?: string;
  lastFrameBase64?: string;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  sessionId, 
  onNewAnalysis, 
  firstFrameBase64, 
  lastFrameBase64 
}) => {
  const { data, loading, error } = useSessionData(sessionId);

  if (error) {
    return (
      <motion.div 
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-400 text-xl mb-2">Analysis Error</h3>
              <p className="text-slate-300 mb-6">{error}</p>
              <button
                onClick={onNewAnalysis}
                className="flex items-center gap-3 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl transition-colors font-semibold"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const generateCoachingFeedback = () => {
    if (!data?.shots) return null;

    const shots = data.shots;
    const avgScore = shots.reduce((sum, shot) => sum + shot.score, 0) / shots.length;
    
    const leftShots = shots.filter(shot => shot.direction.includes('left')).length;
    const rightShots = shots.filter(shot => shot.direction.includes('right')).length;
    const highShots = shots.filter(shot => shot.direction.includes('high')).length;
    const lowShots = shots.filter(shot => shot.direction.includes('low')).length;
    
    const strengths = [];
    const improvements = [];
    
    if (avgScore >= 9) strengths.push("Excellent accuracy and precision");
    if (data.session.group_size_mm <= 30) strengths.push("Tight shot grouping");
    if (shots.filter(shot => shot.score >= 9).length >= shots.length * 0.7) {
      strengths.push("Consistent high scores");
    }
    
    if (data.session.drill_mode && data.session.time_to_first_shot) {
      if (data.session.time_to_first_shot <= 1.5) {
        strengths.push("Excellent draw speed and reaction time");
      } else if (data.session.time_to_first_shot <= 2.0) {
        strengths.push("Good reaction time");
      }
      
      if (data.session.average_split_time && data.session.average_split_time <= 1.2) {
        strengths.push("Fast shot-to-shot timing");
      }
    }
    
    if (leftShots > shots.length * 0.4) improvements.push("Trigger control (leftward bias)");
    if (rightShots > shots.length * 0.4) improvements.push("Grip consistency (rightward bias)");
    if (lowShots > shots.length * 0.3) improvements.push("Follow-through technique");
    if (data.session.group_size_mm > 50) improvements.push("Shot consistency and fundamentals");
    
    if (data.session.drill_mode && data.session.time_to_first_shot) {
      if (data.session.time_to_first_shot > 2.5) {
        improvements.push("Draw speed and reaction time");
      }
      
      if (data.session.average_split_time && data.session.average_split_time > 2.0) {
        improvements.push("Shot-to-shot transition speed");
      }
    }
    
    if (strengths.length === 0) strengths.push("Room for improvement in all areas");
    if (improvements.length === 0) improvements.push("Maintain current excellent form");

    return {
      performance: `Your session shows ${avgScore >= 8.5 ? 'strong' : 'developing'} shooting fundamentals with ${data.session.group_size_mm <= 40 ? 'good' : 'improving'} shot grouping.`,
      advice: leftShots > rightShots ? 
        "Focus on smooth, straight-back trigger pull to reduce leftward bias. Consider dry-fire practice." :
        "Continue working on sight alignment and breathing technique for improved consistency.",
      strengths,
      improvements
    };
  };

  const coaching = generateCoachingFeedback();
  const isDrillMode = data?.session?.drill_mode || false;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h2 className="text-4xl font-bold mb-3 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl">
              <Award className="w-8 h-8 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              SOTA Analysis Results
            </span>
            {isDrillMode && (
              <motion.span 
                className="text-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full border border-purple-500/50 flex items-center gap-2 shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
              >
                <Timer className="w-5 h-5" />
                Real-Time Mode
              </motion.span>
            )}
          </h2>
          <p className="text-slate-400 text-lg">
            {isDrillMode 
              ? "Real-time Roboflow detection with precision shot tracking and Gemini analysis"
              : "State-of-the-art frame-by-frame analysis with AI-powered coaching"
            }
          </p>
        </div>
        <motion.button
          onClick={onNewAnalysis}
          className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RotateCcw className="w-5 h-5" />
          New Analysis
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {[
          { 
            label: "Total Shots", 
            value: data?.shots?.length || 0, 
            Icon: Target, 
            color: "from-red-500 to-red-600",
            bgColor: "from-red-500/20 to-red-600/10"
          },
          { 
            label: "Average Score", 
            value: data?.shots?.length ? (data.shots.reduce((sum, shot) => sum + shot.score, 0) / data.shots.length).toFixed(1) : "0.0", 
            Icon: Crosshair, 
            color: "from-blue-500 to-blue-600",
            bgColor: "from-blue-500/20 to-blue-600/10"
          },
          { 
            label: "Group Size", 
            value: data?.session?.group_size_mm ? `${data.session.group_size_mm}mm` : "N/A", 
            Icon: BarChart3, 
            color: "from-green-500 to-green-600",
            bgColor: "from-green-500/20 to-green-600/10"
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`p-6 bg-gradient-to-br ${stat.bgColor} border border-slate-700/50 rounded-2xl backdrop-blur-sm`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl shadow-lg`}>
                <stat.Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white">
                  {typeof stat.value === 'number' ? (
                    <CountUp end={stat.value} duration={1.5} />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Analysis Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Target Visualization */}
        <motion.div 
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Target className="w-6 h-6 text-red-400" />
            </div>
            Shot Pattern Analysis
          </h3>
          <TargetVisualization shots={data?.shots || []} loading={loading} />
        </motion.div>

        {/* Performance Metrics */}
        <motion.div 
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            Session Metrics
          </h3>
          <PerformanceMetrics 
            metrics={data?.session || null} 
            loading={loading} 
            totalShots={data?.shots?.length || 0}
          />
        </motion.div>
      </div>

      {/* Frame Validation */}
      <AnimatePresence>
        {(firstFrameBase64 || lastFrameBase64) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <FrameValidation 
              firstFrameBase64={firstFrameBase64}
              lastFrameBase64={lastFrameBase64}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shot Table */}
      <motion.div 
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h3 className="text-2xl font-bold mb-6">
          {isDrillMode ? "Real-Time Shot Detection Log" : "Detailed Shot Analysis"}
        </h3>
        <ShotTable 
          shots={data?.shots || []} 
          loading={loading} 
          drillMode={isDrillMode}
        />
      </motion.div>

      {/* Coaching Summary */}
      <AnimatePresence>
        {coaching && (
          <motion.div
            className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              SOTA Coach's Analysis & Recommendations
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <h4 className="font-bold mb-4 text-green-400 text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Strengths
                </h4>
                <ul className="space-y-3">
                  {coaching.strengths.map((strength: string, index: number) => (
                    <motion.li 
                      key={index} 
                      className="flex items-start gap-3 text-slate-300 p-3 bg-green-900/10 rounded-xl border border-green-500/20"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 1.0 + index * 0.1 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      {strength}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <h4 className="font-bold mb-4 text-yellow-400 text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-3">
                  {coaching.improvements.map((improvement: string, index: number) => (
                    <motion.li 
                      key={index} 
                      className="flex items-start gap-3 text-slate-300 p-3 bg-yellow-900/10 rounded-xl border border-yellow-500/20"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 1.1 + index * 0.1 }}
                    >
                      <XCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.div 
              className="space-y-6 p-6 bg-slate-700/20 rounded-2xl border border-slate-600/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <div>
                <h4 className="font-bold mb-3 text-blue-400 text-lg">Performance Summary</h4>
                <p className="text-slate-300 leading-relaxed">{coaching.performance}</p>
              </div>
              
              <div>
                <h4 className="font-bold mb-3 text-purple-400 text-lg">Coaching Advice</h4>
                <p className="text-slate-300 leading-relaxed">{coaching.advice}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
