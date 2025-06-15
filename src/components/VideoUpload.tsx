import React, { useCallback, useState } from 'react';
import { Upload, Video, FileVideo, Zap } from 'lucide-react';
import { useVideoAnalysis } from '@/hooks/useVideoAnalysis';
import { DrillMode } from './DrillMode';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  onAnalysisComplete: (sessionId: string) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload, onAnalysisComplete }) => {
  const { analyzeVideo, isAnalyzing, error, analysisProgress } = useVideoAnalysis();
  const [mode, setMode] = useState<'upload' | 'drill'>('upload');
  const [isRecording, setIsRecording] = useState(false);

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
    console.log('Expert drill mode started - recording for professional timing analysis');
  };

  const handleDrillStop = () => {
    setIsRecording(false);
    console.log('Expert drill mode stopped - processing for professional analysis');
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Expert Marksmanship Analysis
          </h3>
          <div className="space-y-2 text-slate-400">
            <p className="text-lg font-semibold text-red-400">{analysisProgress}</p>
            <p>🎯 Optimized frame extraction at 5 FPS...</p>
            <p>🔍 Sequential frame analysis with Gemini 2.5 Flash...</p>
            <p>📊 Professional ballistics and pattern recognition...</p>
            <p>🎓 Expert coaching feedback generation...</p>
            <p>⚡ Enhanced performance and reliability...</p>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            <p>Professional-grade analysis using optimized AI models</p>
            <p>Processing frame sequences for comprehensive impact detection</p>
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
          Expert Drill Mode
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <h4 className="font-semibold text-red-400 mb-1">Expert Analysis Error</h4>
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
            className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-red-400 transition-colors cursor-pointer bg-slate-800/20 backdrop-blur-sm"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('video-input')?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-400/10 rounded-lg flex items-center justify-center">
                <Video className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Expert Video Analysis
                </h3>
                <p className="text-slate-400 mb-4">
                  Upload your target video for professional marksmanship analysis
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
              <Upload className="w-4 h-4 text-red-400" />
              Expert Analysis System & Requirements
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• <strong className="text-yellow-400">Gemini 2.5 Flash:</strong> Professional-grade AI model for ballistics analysis</li>
              <li>• <strong className="text-green-400">5 FPS Analysis:</strong> Optimized frame extraction for reliable detection</li>
              <li>• <strong className="text-blue-400">Sequential Processing:</strong> 3-frame chunks for reliable change detection</li>
              <li>• Target must be clearly visible with good contrast and lighting</li>
              <li>• Camera positioned behind or to the side of target</li>
              <li>• Minimum 720p video quality, up to 500MB file size</li>
              <li>• <strong className="text-red-400">Expert Coaching:</strong> Advanced trigger control and pattern diagnostics</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
