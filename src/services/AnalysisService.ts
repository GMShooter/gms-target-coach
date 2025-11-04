/**
 * Analysis Service
 * 
 * Production-ready service for analyzing shooting frames
 * Integrates with Supabase Edge Functions for ML analysis
 */

import { supabase } from '../utils/supabase';

export interface AnalysisResult {
  frameId: string;
  shots: ShotDetection[];
  confidence: number;
  timestamp: string;
}

export interface ShotDetection {
  x: number; // 0-100 (percentage from left)
  y: number; // 0-100 (percentage from top)
  score: number; // 0-10
  confidence: number; // 0-1
  class: string;
}

export interface AnalysisOptions {
  confidence?: number; // Minimum confidence threshold (0-1)
  overlap?: number; // Overlap threshold for detection (0-1)
}

class AnalysisService {
  constructor() {
    // Production-ready service - no mock mode
  }

  /**
   * Analyze a frame for shot detection
   * @param frameData - Base64 encoded image data or image URL
   * @param options - Analysis options
   * @returns Promise<AnalysisResult>
   */
  async analyzeFrame(
    frameData: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const { confidence = 0.5, overlap = 0.5 } = options;

    try {
      // Call Supabase Edge Function for production analysis
      const { data, error } = await supabase.functions.invoke('analyze-frame', {
        body: {
          frameBase64: frameData,
          confidence,
          overlap
        }
      });

      if (error) {
        // console.error('Analysis service error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data || !data.shots) {
        throw new Error('Invalid analysis response');
      }

      // Transform response to match our interface
      return {
        frameId: this.generateFrameId(frameData),
        shots: data.shots.map((shot: any) => ({
          x: shot.x,
          y: shot.y,
          score: shot.score,
          confidence: shot.confidence,
          class: shot.class || 'shot'
        })),
        confidence: data.confidence || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // console.error('Frame analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple frames in batch
   * @param frameDataArray - Array of base64 encoded images or URLs
   * @param options - Analysis options
   * @returns Promise<AnalysisResult[]>
   */
  async analyzeBatch(
    frameDataArray: string[], 
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // Process frames in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(frameDataArray, concurrencyLimit);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(frameData => this.analyzeFrame(frameData, options))
      );
      
      // Extract successful results and log failures
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // console.error(`Failed to analyze frame ${index}:`, result.reason);
        }
      });
    }
    
    return results;
  }

  /**
   * Get analysis statistics for a session
   * @param results - Array of analysis results
   * @returns Analysis statistics
   */
  getSessionStatistics(results: AnalysisResult[]): {
    totalFrames: number;
    framesWithShots: number;
    totalShots: number;
    averageConfidence: number;
    averageScore: number;
    shotDistribution: { [key: string]: number };
  } {
    const totalFrames = results.length;
    const framesWithShots = results.filter(r => r.shots.length > 0).length;
    const allShots = results.flatMap(r => r.shots);
    const totalShots = allShots.length;
    
    const averageConfidence = totalShots > 0 
      ? allShots.reduce((sum, shot) => sum + shot.confidence, 0) / totalShots 
      : 0;
    
    const averageScore = totalShots > 0
      ? allShots.reduce((sum, shot) => sum + shot.score, 0) / totalShots
      : 0;

    // Calculate shot distribution by score ranges
    const shotDistribution = allShots.reduce((dist, shot) => {
      const range = this.getScoreRange(shot.score);
      dist[range] = (dist[range] || 0) + 1;
      return dist;
    }, {} as { [key: string]: number });

    return {
      totalFrames,
      framesWithShots,
      totalShots,
      averageConfidence,
      averageScore,
      shotDistribution
    };
  }


  /**
   * Generate a consistent frame ID from frame data
   * @private
   */
  private generateFrameId(frameData: string): string {
    // Create a simple hash from the frame data
    let hash = 0;
    for (let i = 0; i < frameData.length; i++) {
      const char = frameData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `frame-${Math.abs(hash)}`;
  }

  /**
   * Get score range category for statistics
   * @private
   */
  private getScoreRange(score: number): string {
    if (score >= 9.5) return 'Bullseye (9.5-10)';
    if (score >= 8.5) return 'Excellent (8.5-9.4)';
    if (score >= 7.5) return 'Good (7.5-8.4)';
    if (score >= 6.5) return 'Fair (6.5-7.4)';
    if (score >= 5.5) return 'Poor (5.5-6.4)';
    return 'Miss (0-5.4)';
  }

  /**
   * Split array into chunks for batch processing
   * @private
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

}

// Export singleton instance
export const analysisService = new AnalysisService();
export default analysisService;