import React, { useRef, useState } from 'react';
import { Upload, Play, TestTube, AlertCircle, CheckCircle, Target, TrendingUp, Award, BarChart3, Eye } from 'lucide-react';

import { useVideoAnalysis } from '../hooks/useVideoAnalysis';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { BullseyeRadarChart, SessionScoreLineChart } from './ui/charts';

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

  // Helper functions for chart data
  const calculateConsistency = (results: any[]) => {
    if (results.length < 2) return 0;
    const accuracies = results.map(r => r.accuracy);
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    const standardDeviation = Math.sqrt(variance);
    return Math.max(0, 100 - standardDeviation);
  };

  const calculateStability = (results: any[]) => {
    if (results.length < 2) return 0;
    const confidences = results.map(r => r.confidence);
    const mean = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / confidences.length;
    const standardDeviation = Math.sqrt(variance);
    return Math.max(0, 100 - standardDeviation);
  };

  const calculateFollowThrough = (results: any[]) => {
    // Simulate follow-through based on accuracy and confidence correlation
    if (results.length < 2) return 0;
    const accuracies = results.map(r => r.accuracy);
    const confidences = results.map(r => r.confidence);
    const correlation = accuracies.reduce((sum, acc, i) => {
      return sum + (acc - accuracies.reduce((s, a) => s + a, 0) / accuracies.length) *
                    (confidences[i] - confidences.reduce((s, c) => s + c, 0) / confidences.length);
    }, 0) / accuracies.length;
    return Math.min(100, Math.max(0, correlation * 2));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="video-analysis-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2" data-testid="page-title">Video Analysis</h1>
        <p className="text-slate-300">Upload a video of your shooting technique for detailed analysis</p>
      </div>

      {/* Upload Area */}
      {!videoFile && !isProcessing && !results.length && (
        <Card className="mb-8 border-slate-700 bg-slate-800" data-testid="upload-area">
          <CardHeader>
            <div className="text-2xl font-semibold leading-none tracking-tight text-slate-100" role="heading" aria-level={2}>Upload Video</div>
            <CardDescription className="text-slate-300">
              Click to browse or drag and drop your video file
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
                  data-testid="video-upload"
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
                data-testid="video-upload-input"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleTestFrames}
              data-testid="test-frames-button"
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
        <Card className="mb-8 border-slate-700 bg-slate-800" data-testid="processing-indicator">
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
              <Progress value={progress} className="h-2" data-testid="progress-bar" />
              <p className="text-slate-300 text-center" data-testid="progress-text">
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
        <Alert className="mb-8 bg-red-900/20 border-red-800 text-red-200" data-testid="upload-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-8" data-testid="analysis-results">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="mr-3 h-8 w-8 text-green-400" />
              <h2 className="text-3xl font-bold text-slate-100">Analysis Complete</h2>
            </div>
            <p className="text-slate-400">
              Deep analysis of {results.length} frames provides actionable insights.
            </p>
          </div>

          {/* Key Performance Indicators */}
          <Card className="border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900" data-testid="results-summary">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-400" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full mb-2">
                    <Target className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-sm">Avg. Accuracy</p>
                  <p className="text-3xl font-bold text-slate-100">
                    {(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-2">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-slate-400 text-sm">Avg. Confidence</p>
                  <p className="text-3xl font-bold text-slate-100">
                    {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-full mb-2">
                    <Award className="h-6 w-6 text-purple-400" />
                  </div>
                  <p className="text-slate-400 text-sm">Best Shot</p>
                  <p className="text-3xl font-bold text-slate-100">
                    {Math.max(...results.map(r => r.accuracy)).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <Card className="border-slate-700 bg-slate-800" data-testid="accuracy-chart">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <Target className="mr-2 h-5 w-5 text-purple-400" />
                  Shooting Performance Radar
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Comprehensive view of your shooting metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BullseyeRadarChart data={[
                  { shot: "Accuracy", accuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length, confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length },
                  { shot: "Consistency", accuracy: calculateConsistency(results), confidence: calculateStability(results) },
                  { shot: "Follow Through", accuracy: calculateFollowThrough(results), confidence: Math.max(...results.map(r => r.confidence)) },
                  { shot: "Best Shot", accuracy: Math.max(...results.map(r => r.accuracy)), confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length },
                  { shot: "Average", accuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length, confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length }
                ]} />
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-400" />
                  Performance Timeline
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Track your accuracy and confidence over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionScoreLineChart data={results.map(r => ({
                  session: `Frame ${r.frameNumber}`,
                  score: r.accuracy,
                  accuracy: r.confidence
                }))} />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Frame Analysis */}
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Eye className="mr-2 h-5 w-5 text-indigo-400" />
                Frame-by-Frame Breakdown
              </CardTitle>
              <CardDescription className="text-slate-300">
                Click on any frame for a detailed view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((result, index) => (
                  <div key={result.id} className="group relative bg-slate-900/50 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all duration-300">
                    {result.imageUrl && (
                      <div className="relative">
                        <img
                          src={result.imageUrl}
                          alt={`Frame ${result.frameNumber}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-slate-800/80 text-slate-100 text-xs px-2 py-1 rounded-full">
                          Frame {result.frameNumber}
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Accuracy</span>
                        <span className={`text-lg font-bold ${
                          result.accuracy > 80 ? 'text-green-400' :
                          result.accuracy > 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {result.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Confidence</span>
                        <span className="text-slate-200 text-sm font-medium">
                          {result.confidence.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${result.accuracy}%` }}
                        ></div>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Timestamp: {result.timestamp.toFixed(1)}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center">
            <Button onClick={handleReset} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="reset-button">
              Analyze Another Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAnalysis;