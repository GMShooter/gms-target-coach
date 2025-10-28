import { useCallback } from 'react';

import { useQuery, useMutation, useQueryClient } from '../lib/query-client';
import { analysisService, AnalysisResult, AnalysisOptions, ShotDetection } from '../services/AnalysisService';

export interface UseAnalysisQueryReturn {
  // Query state
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Batch analysis state
  batchResults: AnalysisResult[];
  isBatchAnalyzing: boolean;
  batchError: string | null;
  
  // Statistics
  statistics: any | null;
  
  // Actions
  analyzeFrame: (frameData: string, options?: AnalysisOptions) => Promise<AnalysisResult | null>;
  analyzeBatch: (frameDataArray: string[], options?: AnalysisOptions) => Promise<AnalysisResult[]>;
  getStatistics: (results: AnalysisResult[]) => void;
  clearResults: () => void;
  setMockMode: (enabled: boolean) => void;
}

export const useAnalysisQuery = (): UseAnalysisQueryReturn => {
  const queryClient = useQueryClient();

  // Query for current analysis result
  const { data: analysisResult, error: analysisError, isLoading: isAnalyzing } = useQuery<AnalysisResult>({
    queryKey: ['analysis-result'],
    queryFn: () => {
      throw new Error('This query should be manually triggered');
    },
    staleTime: 0,
    refetchOnMount: false,
    enabled: false // This query is manually triggered
  });

  // Query for batch results
  const { data: batchResults, error: batchError, isLoading: isBatchAnalyzing } = useQuery<AnalysisResult[]>({
    queryKey: ['analysis-batch-results'],
    queryFn: () => {
      throw new Error('This query should be manually triggered');
    },
    staleTime: 0,
    refetchOnMount: false,
    enabled: false // This query is manually triggered
  });

  // Query for statistics
  const { data: statistics } = useQuery({
    queryKey: ['analysis-statistics'],
    queryFn: () => {
      throw new Error('This query should be manually triggered');
    },
    staleTime: 0,
    refetchOnMount: false,
    enabled: false // This query is manually triggered
  });

  // Mutation for single frame analysis
  const analyzeMutation = useMutation({
    mutationFn: async ({ frameData, options }: { frameData: string; options?: AnalysisOptions }) => {
      return await analysisService.analyzeFrame(frameData, options);
    },
    onSuccess: (result) => {
      // Update the analysis result query
      queryClient.setQueryData(['analysis-result'], result);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['analysis-statistics'] });
    },
    onError: (error: any) => {
      console.error('Frame analysis failed:', error);
    }
  });

  // Mutation for batch analysis
  const batchAnalyzeMutation = useMutation({
    mutationFn: async ({ frameDataArray, options }: { frameDataArray: string[]; options?: AnalysisOptions }) => {
      return await analysisService.analyzeBatch(frameDataArray, options);
    },
    onSuccess: (results) => {
      // Update the batch results query
      queryClient.setQueryData(['analysis-batch-results'], results);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['analysis-statistics'] });
    },
    onError: (error: any) => {
      console.error('Batch analysis failed:', error);
    }
  });

  // Mutation for statistics calculation
  const statisticsMutation = useMutation({
    mutationFn: async (results: AnalysisResult[]) => {
      return analysisService.getSessionStatistics(results);
    },
    onSuccess: (stats) => {
      // Update the statistics query
      queryClient.setQueryData(['analysis-statistics'], stats);
    },
    onError: (error: any) => {
      console.error('Statistics calculation failed:', error);
    }
  });

  // Analyze a single frame
  const analyzeFrame = useCallback(async (
    frameData: string, 
    options?: AnalysisOptions
  ): Promise<AnalysisResult | null> => {
    try {
      const result = await analyzeMutation.mutateAsync({ frameData, options });
      return result;
    } catch (error) {
      console.error('Failed to analyze frame:', error);
      return null;
    }
  }, [analyzeMutation]);

  // Analyze multiple frames in batch
  const analyzeBatch = useCallback(async (
    frameDataArray: string[], 
    options?: AnalysisOptions
  ): Promise<AnalysisResult[]> => {
    try {
      const results = await batchAnalyzeMutation.mutateAsync({ frameDataArray, options });
      return results;
    } catch (error) {
      console.error('Failed to analyze batch:', error);
      return [];
    }
  }, [batchAnalyzeMutation]);

  // Calculate statistics for results
  const getStatistics = useCallback((results: AnalysisResult[]) => {
    statisticsMutation.mutate(results);
  }, [statisticsMutation]);

  // Clear all results
  const clearResults = useCallback(() => {
    queryClient.setQueryData(['analysis-result'], null);
    queryClient.setQueryData(['analysis-batch-results'], []);
    queryClient.setQueryData(['analysis-statistics'], null);
  }, [queryClient]);

  // Set mock mode
  const setMockMode = useCallback((enabled: boolean) => {
    analysisService.setMockMode(enabled);
  }, []);

  return {
    // Query state
    analysisResult: analysisResult || null,
    isAnalyzing: isAnalyzing || analyzeMutation.isPending,
    analysisError: analysisError?.message || analyzeMutation.error?.message || null,
    
    // Batch analysis state
    batchResults: batchResults || [],
    isBatchAnalyzing: isBatchAnalyzing || batchAnalyzeMutation.isPending,
    batchError: batchError?.message || batchAnalyzeMutation.error?.message || null,
    
    // Statistics
    statistics: statistics || null,
    
    // Actions
    analyzeFrame,
    analyzeBatch,
    getStatistics,
    clearResults,
    setMockMode
  };
};

export default useAnalysisQuery;