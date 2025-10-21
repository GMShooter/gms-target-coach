import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface AnalysisResult {
  id: string;
  frameNumber: number;
  timestamp: number;
  accuracy: number;
  confidence: number;
  aimPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  imageUrl?: string;
}

export interface VideoAnalysisState {
  isUploading: boolean;
  isProcessing: boolean;
  progress: number;
  results: AnalysisResult[];
  error: string | null;
  videoFile: File | null;
  sessionId: string | null;
}

export const useVideoAnalysis = () => {
  const [state, setState] = useState<VideoAnalysisState>({
    isUploading: false,
    isProcessing: false,
    progress: 0,
    results: [],
    error: null,
    videoFile: null,
    sessionId: null,
  });

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      isProcessing: false,
      progress: 0,
      results: [],
      error: null,
      videoFile: null,
      sessionId: null,
    });
  }, []);

  const uploadVideo = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isUploading: true, error: null, videoFile: file }));
    
    try {
      // Create a new session
      const { data: sessionData, error: sessionError } = await supabase
        .from('analysis_sessions')
        .insert({ user_id: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Upload the video file
      const filePath = `videos/${sessionData.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('analysis-videos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        sessionId: sessionData.id 
      }));
      
      return sessionData.id;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error instanceof Error ? error.message : 'Failed to upload video' 
      }));
      return null;
    }
  }, []);

  const processVideo = useCallback(async (sessionId: string) => {
    setState(prev => ({ ...prev, isProcessing: true, progress: 0, error: null }));
    
    try {
      // Start the video processing
      const { data, error } = await supabase.functions.invoke('process-video', {
        body: { sessionId }
      });
      
      if (error) throw error;
      
      // Poll for progress updates
      const checkProgress = async () => {
        const { data: session } = await supabase
          .from('analysis_sessions')
          .select('progress, status')
          .eq('id', sessionId)
          .single();
        
        if (session) {
          setState(prev => ({ 
            ...prev, 
            progress: session.progress || 0 
          }));
          
          if (session.status === 'completed') {
            // Fetch the results
            const { data: results } = await supabase
              .from('analysis_results')
              .select('*')
              .eq('session_id', sessionId)
              .order('frame_number');
            
            setState(prev => ({ 
              ...prev, 
              isProcessing: false, 
              results: results || [] 
            }));
          } else if (session.status === 'failed') {
            setState(prev => ({ 
              ...prev, 
              isProcessing: false, 
              error: 'Video processing failed' 
            }));
          } else {
            // Continue polling
            setTimeout(checkProgress, 1000);
          }
        }
      };
      
      // Start polling
      setTimeout(checkProgress, 1000);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to process video' 
      }));
    }
  }, []);

  const testWithFrames = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      progress: 0, 
      error: null, 
      results: [] 
    }));
    
    try {
      // Test with the 5 sample frames
      const framePromises = [];
      for (let i = 1; i <= 5; i++) {
        framePromises.push(
          supabase.functions.invoke('analyze-frame', {
            body: { 
              imageUrl: `/test_videos_frames/${i}.png`,
              frameNumber: i
            }
          })
        );
        
        // Update progress
        setState(prev => ({ 
          ...prev, 
          progress: (i / 5) * 100 
        }));
      }
      
      const results = await Promise.all(framePromises);
      
      // Extract the data from the results
      const analysisResults: AnalysisResult[] = results.map((result, index) => ({
        id: `test-${index + 1}`,
        frameNumber: index + 1,
        timestamp: (index + 1) * 0.5, // Assuming 0.5 seconds per frame
        accuracy: result.data?.accuracy || 0,
        confidence: result.data?.confidence || 0,
        aimPosition: result.data?.aimPosition || { x: 0, y: 0 },
        targetPosition: result.data?.targetPosition || { x: 0, y: 0 },
        imageUrl: `/test_videos_frames/${index + 1}.png`
      }));
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        results: analysisResults 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze frames' 
      }));
    }
  }, []);

  return {
    ...state,
    uploadVideo,
    processVideo,
    testWithFrames,
    resetState
  };
};