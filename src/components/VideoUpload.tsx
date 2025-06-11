
import React, { useCallback } from 'react';
import { Upload, Video, FileVideo } from 'lucide-react';
import { useVideoAnalysis } from '@/hooks/useVideoAnalysis';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  onAnalysisComplete: (sessionId: string) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload, onAnalysisComplete }) => {
  const { analyzeVideo, isAnalyzing, error } = useVideoAnalysis();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    if (videoFile) {
      handleVideoFile(videoFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoFile(file);
    }
  };

  const handleVideoFile = async (file: File) => {
    onVideoUpload(file);
    const sessionId = await analyzeVideo(file);
    if (sessionId) {
      onAnalysisComplete(sessionId);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-2xl font-bold mb-4">Analyzing Your Shooting Performance</h3>
          <div className="space-y-2 text-slate-400">
            <p>🎯 Detecting bullet impacts...</p>
            <p>📊 Calculating performance metrics...</p>
            <p>🎓 Generating coaching feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <h4 className="font-semibold text-red-400 mb-1">Analysis Error</h4>
          <p className="text-slate-300">{error}</p>
        </div>
      )}
      
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
            <h3 className="text-xl font-semibold mb-2">Upload Target Video</h3>
            <p className="text-slate-400 mb-4">
              Drag and drop your target camera video here, or click to browse
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
      
      <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-red-400" />
          Video Requirements
        </h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Camera must be mounted behind or to the side of the target</li>
          <li>• Target should be clearly visible and well-lit</li>
          <li>• Video quality: minimum 720p recommended</li>
          <li>• File size: up to 500MB supported</li>
          <li>• Ensure each shot impact is clearly visible</li>
        </ul>
      </div>
    </div>
  );
};
