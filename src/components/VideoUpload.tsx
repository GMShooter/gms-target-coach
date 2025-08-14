
import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, FileVideo, Zap, Brain, Clock, AlertTriangle, CheckCircle, Target, UploadCloud, File as FileIcon, Trash2, Loader } from 'lucide-react';
import { useVideoAnalysis } from '@/hooks/useVideoAnalysis';
import { DrillMode } from './DrillMode';
import { VideoAnalysisProgress } from './VideoAnalysisProgress';
import { MidAnalysisReport } from './MidAnalysisReport';
import CountUp from 'react-countup';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  onAnalysisComplete: (sessionId: string, firstFrameBase64?: string, lastFrameBase64?: string) => void;
}

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  file: File;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload, onAnalysisComplete }) => {
  const { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress,
    currentFrame,
    detectedBounds,
    isPaused,
    frameNumber,
    totalFrames,
    currentTimestamp,
    totalDetectedShots,
    pauseAnalysis,
    resumeAnalysis,
    stopAnalysis
  } = useVideoAnalysis();
  
  const [mode, setMode] = useState<'upload' | 'drill'>('upload');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMidReport, setShowMidReport] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const videoFile = droppedFiles.find(file => file.type.startsWith('video/'));
    if (videoFile) {
      processVideoFile(videoFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      processVideoFile(file);
    }
  };

  const processVideoFile = (file: File) => {
    const newFile: FileWithPreview = {
      id: `${Date.now()}-${file.name}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type,
      file
    };
    
    setFiles([newFile]);
    simulateUpload(newFile.id);
    onVideoUpload(file);
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: Math.min(progress, 100) } : f
      ));
      if (progress >= 100) {
        clearInterval(interval);
        // Start analysis when upload completes
        const file = files.find(f => f.id === fileId)?.file;
        if (file) {
          handleVideoFile(file, false);
        }
      }
    }, 200);
  };

  const handleVideoFile = async (file: File, isDrillMode: boolean) => {
    const result = await analyzeVideo(file, isDrillMode);
    if (result?.sessionId) {
      onAnalysisComplete(result.sessionId, result.firstFrameBase64, result.lastFrameBase64);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  if (isAnalyzing) {
    return (
      <>
        <VideoAnalysisProgress
          analysisProgress={analysisProgress}
          currentFrame={currentFrame}
          detectedBounds={detectedBounds}
          frameNumber={frameNumber}
          totalFrames={totalFrames}
          timestamp={currentTimestamp}
          isAnalyzing={isAnalyzing}
          totalDetectedShots={totalDetectedShots}
          onPause={pauseAnalysis}
          onResume={resumeAnalysis}
          onStop={stopAnalysis}
          onViewMidReport={() => setShowMidReport(true)}
          isPaused={isPaused}
        />
        
        {showMidReport && (
          <MidAnalysisReport
            totalDetectedShots={totalDetectedShots}
            currentTimestamp={currentTimestamp}
            frameNumber={frameNumber}
            totalFrames={totalFrames}
            averageConfidence={detectedBounds.length > 0 ? detectedBounds.reduce((sum, d) => sum + d.confidence, 0) / detectedBounds.length : 0}
            detectedBounds={detectedBounds}
            onClose={() => setShowMidReport(false)}
            onContinueAnalysis={() => setShowMidReport(false)}
            onStopAnalysis={() => {
              setShowMidReport(false);
              stopAnalysis();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* API Status Banner */}
      <motion.div 
        className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Target className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h4 className="font-bold text-red-400 text-lg">SOTA Roboflow + Gemini</h4>
              <p className="text-slate-400 text-sm">State-of-the-art detection pipeline active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-xl">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 font-medium text-sm">Online</span>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          className="p-6 bg-red-900/20 border border-red-700/50 rounded-2xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-400 mb-2">Analysis Error</h4>
              <p className="text-slate-300 mb-4">{error}</p>
              <div className="text-sm text-slate-400 bg-slate-800/30 p-4 rounded-xl">
                <p className="font-semibold mb-2">Troubleshooting tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure good lighting and clear target visibility</li>
                  <li>Use white paper target with dark bullet impacts</li>
                  <li>Minimize camera shake and maintain steady framing</li>
                  <li>Record in at least 720p resolution</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {mode === 'drill' ? (
        <DrillMode
          onDrillStart={() => console.log('Drill started')}
          onDrillStop={() => console.log('Drill stopped')}
          isRecording={false}
        />
      ) : (
        <>
          {/* Upload Drop Zone */}
          <motion.div
            className={`relative rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragging 
                ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500 shadow-2xl shadow-red-500/20 scale-105' 
                : 'bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-2 border-dashed border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('video-input')?.click()}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                className="relative"
                animate={{ 
                  y: isDragging ? [-5, 5, -5] : 0,
                  scale: isDragging ? [0.95, 1.05, 0.95] : 1 
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: isDragging ? Infinity : 0,
                  ease: "easeInOut" 
                }}
              >
                <div className={`absolute -inset-6 rounded-full blur-xl transition-all duration-300 ${
                  isDragging ? 'bg-red-400/20 animate-pulse' : 'bg-blue-400/10'
                }`} />
                <div className="relative p-6 bg-slate-800/50 rounded-2xl">
                  <UploadCloud className={`w-16 h-16 transition-colors duration-300 ${
                    isDragging ? 'text-red-400' : 'text-slate-400'
                  }`} />
                </div>
              </motion.div>
              
              <div className="space-y-4">
                <h3 className="text-3xl font-bold">
                  {isDragging 
                    ? 'Drop your video here' 
                    : files.length 
                      ? 'Add another video' 
                      : 'Upload Video for Analysis'
                  }
                </h3>
                <p className="text-slate-400 text-lg max-w-md mx-auto">
                  {isDragging ? (
                    <span className="font-medium text-red-400">Release to upload</span>
                  ) : (
                    <>Drag & drop your shooting video here, or <span className="text-blue-400 font-medium">browse files</span></>
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <FileVideo className="w-4 h-4" />
                  <span>MP4, MOV, AVI formats supported</span>
                </div>
              </div>
            </div>
            <input
              id="video-input"
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </motion.div>

          {/* Uploaded Files */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Uploaded Files ({files.length})</h3>
                  {files.length > 1 && (
                    <button
                      onClick={() => setFiles([])}
                      className="text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50"
                    >
                      {/* Video Thumbnail */}
                      <div className="relative flex-shrink-0">
                        <video
                          src={file.preview}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-600"
                          muted
                          preload="metadata"
                        />
                        {file.progress === 100 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-2 -right-2 p-1 bg-green-500 rounded-full"
                          >
                            <CheckCircle className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-5 h-5 text-blue-400" />
                          <h4 className="font-medium text-lg truncate" title={file.name}>
                            {file.name}
                          </h4>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                          <span>{formatFileSize(file.size)}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{Math.round(file.progress)}%</span>
                            {file.progress < 100 ? (
                              <Loader className="w-4 h-4 animate-spin text-blue-400" />
                            ) : (
                              <button
                                onClick={() => removeFile(file.id)}
                                className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              file.progress < 100 ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features Info */}
          <motion.div 
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-bold text-xl mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-yellow-400" />
              Real SOTA Pipeline Features
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-400">
              {[
                "🎯 Real Roboflow API: Actual object detection, no simulation",
                "📊 Frame-by-Frame Logic: Precise shot detection by comparison", 
                "🔄 Generalized Detection: No hardcoded shot assumptions",
                "🧠 Full Context Analysis: All frame data sent to Gemini",
                "📱 Live UI Feedback: Real-time frame display during analysis",
                "✅ Frame Validation: Before/after comparison for accuracy"
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                >
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
