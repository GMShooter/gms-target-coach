import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { useVideoAnalysis } from '../hooks/useVideoAnalysis';
import { Upload, Play, TestTube, AlertCircle, CheckCircle } from 'lucide-react';

const VideoAnalysis: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const {
    isUploading,
    isProcessing,
    progress,
    results,
    error,
    videoFile,
    sessionId,
    uploadVideo,
    processVideo,
    testWithFrames,
    resetState
  } = useVideoAnalysis();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type.startsWith('video/')) {
      const newSessionId = await uploadVideo(file);
      if (newSessionId) {
        await processVideo(newSessionId);
      }
    } else {
      // Handle error - not a video file
      console.error('Please upload a video file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleTestFrames = async () => {
    await testWithFrames();
  };

  const handleReset = () => {
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Video Analysis</h1>
        <p className="text-slate-300">Upload a video of your shooting technique for detailed analysis</p>
      </div>

      {/* Upload Area */}
      {!videoFile && !isProcessing && !results.length && (
        <Card className="mb-8 border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Upload Video</CardTitle>
            <CardDescription className="text-slate-300">
              Drag and drop your video file here or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-950/20' 
                  : 'border-slate-600 bg-slate-900/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-300 mb-2">
                Drag and drop your video file here, or{' '}
                <button
                  className="text-blue-400 hover:text-blue-300 underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-slate-500 text-sm">
                Supported formats: MP4, MOV, AVI (Max 100MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleTestFrames}
            >
              <TestTube className="mr-2 h-4 w-4" />
              Test with Sample Frames
            </Button>
            <div className="text-slate-500 text-sm">
              Test the analysis pipeline with 5 sample frames
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Processing State */}
      {(isUploading || isProcessing) && (
        <Card className="mb-8 border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-5 w-5 text-blue-400" />
                  Uploading Video
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5 text-blue-400" />
                  Processing Video
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-slate-300 text-center">
                {isUploading 
                  ? `Uploading ${videoFile?.name}...` 
                  : `Analyzing video... ${Math.round(progress)}%`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert className="mb-8 bg-red-900/20 border-red-800 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="mb-8 border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
              Analysis Results
            </CardTitle>
            <CardDescription className="text-slate-300">
              {results.length} frames analyzed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Average Accuracy</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Average Confidence</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Best Shot</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {Math.max(...results.map(r => r.accuracy)).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Frame Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Frame Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result) => (
                    <div key={result.id} className="bg-slate-900/50 p-4 rounded-lg">
                      {result.imageUrl && (
                        <img 
                          src={result.imageUrl} 
                          alt={`Frame ${result.frameNumber}`}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <div className="space-y-1">
                        <p className="text-slate-300 text-sm">
                          Frame {result.frameNumber} ({result.timestamp.toFixed(1)}s)
                        </p>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Accuracy:</span>
                          <span className="text-slate-200 text-sm font-medium">
                            {result.accuracy.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Confidence:</span>
                          <span className="text-slate-200 text-sm font-medium">
                            {result.confidence.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReset} className="w-full">
              Analyze Another Video
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default VideoAnalysis;