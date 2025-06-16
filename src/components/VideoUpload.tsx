
import React, { useCallback, useState } from 'react';
import { Upload, Video, FileVideo, Zap, Brain, Clock, AlertTriangle } from 'lucide-react';
import { useVideoAnalysis } from '@/hooks/useVideoAnalysis';
import { DrillMode } from './DrillMode';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  onAnalysisComplete: (sessionId: string) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload, onAnalysisComplete }) => {
  const { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown
  } = useVideoAnalysis();
  const [mode, setMode] = useState<'upload' | 'drill'>('upload');
  const [isRecording, setIsRecording] = useState(false);

  const remainingRequests = getRemainingRequests();
  const timeUntilReset = getTimeUntilReset();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    if (videoFile) {
      handleVideoFile(videoFile, false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoFile(file, false);
    }
  };

  const handleVideoFile = async (file: File, isDrillMode: boolean) => {
    onVideoUpload(file);
    const sessionId = await analyzeVideo(file, isDrillMode);
    if (sessionId) {
      onAnalysisComplete(sessionId);
    }
  };

  const handleDrillStart = () => {
    setIsRecording(true);
    console.log('Drill mode started');
  };

  const handleDrillStop = () => {
    setIsRecording(false);
    console.log('Drill mode stopped');
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Brain className="w-6 h-6 text-blue-400" />
            Video Analysis
          </h3>
          <div className="space-y-2 text-slate-400">
            <p className="text-lg font-semibold text-blue-400">{analysisProgress}</p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p>📹 Direct video analysis with Gemini 2.5 Flash Preview</p>
              <p>🤖 Smart fallback to frame-pair detection with Gemma 3 27B</p>
              <p>⚡ Intelligent API management with automatic switching</p>
              <p>📊 Professional ballistics analysis with split times</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mode Selection */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'upload'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Upload Video
        </button>
        <button
          onClick={() => setMode('drill')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'drill'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Smart Drill Mode
        </button>
      </div>

      {/* API Status */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-blue-400">AI Analysis Status</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300">Gemini: {remainingRequests}/10</span>
            </div>
            {isInCooldown && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400">Reset: {timeUntilReset}s</span>
              </div>
            )}
          </div>
        </div>
        {isInCooldown && (
          <div className="mt-2 text-sm text-orange-300 bg-orange-900/20 rounded p-2">
            Gemini cooling down - next analysis will use smart frame-pair detection
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="font-semibold text-red-400">Analysis Error</h4>
          </div>
          <p className="text-slate-300">{error}</p>
        </div>
      )}

      {mode === 'drill' ? (
        <DrillMode
          onDrillStart={handleDrillStart}
          onDrillStop={handleDrillStop}
          isRecording={isRecording}
        />
      ) : (
        <>
          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-800/20 backdrop-blur-sm"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('video-input')?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-400/10 rounded-lg flex items-center justify-center">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Smart Video Analysis
                </h3>
                <p className="text-slate-400 mb-4">
                  Direct video analysis with Gemini or intelligent frame-pair detection
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <FileVideo className="w-4 h-4" />
                  <span>Supports MP4, MOV, AVI formats</span>
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
          </div>
          
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              Analysis Features
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• <strong className="text-blue-400">Direct Video Analysis:</strong> Gemini 2.5 Flash analyzes the entire video natively</li>
              <li>• <strong className="text-yellow-400">Smart Fallback:</strong> Frame-pair detection with change analysis for reliability</li>
              <li>• <strong className="text-green-400">Intelligent Switching:</strong> Automatic model selection based on availability</li>
              <li>• <strong className="text-red-400">Professional Analysis:</strong> Split times, grouping, expert coaching feedback</li>
              <li>• Target must be clearly visible with good contrast and lighting</li>
              <li>• White paper target with dark background recommended</li>
              <li>• Minimum 720p video quality for best results</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
