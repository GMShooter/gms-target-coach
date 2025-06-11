
import React, { useCallback } from 'react';
import { Upload, Video, FileVideo } from 'lucide-react';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload }) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    if (videoFile) {
      onVideoUpload(videoFile);
    }
  }, [onVideoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
