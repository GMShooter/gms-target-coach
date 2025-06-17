
import { supabase } from '@/integrations/supabase/client';

export interface VideoMetadata {
  id: string;
  hash: string;
  filename: string;
  size: number;
  duration: number;
  uploaded_at: string;
  user_id: string;
  storage_url: string;
}

export class VideoStorageManager {
  private static readonly BUCKET_NAME = 'training-videos';

  static async calculateVideoHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async uploadVideo(file: File, userId: string): Promise<VideoMetadata | null> {
    try {
      // Calculate video hash for deduplication
      const videoHash = await this.calculateVideoHash(file);
      
      // Check if video already exists using raw query
      const { data: existingVideo } = await supabase
        .from('training_videos' as any)
        .select('*')
        .eq('hash', videoHash)
        .single();

      if (existingVideo) {
        console.log('📹 Video already exists, skipping upload');
        return existingVideo as VideoMetadata;
      }

      // Get video duration
      const duration = await this.getVideoDuration(file);

      // Upload to Supabase Storage
      const filename = `${videoHash}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filename, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filename);

      // Save metadata to database using raw query
      const videoMetadata = {
        hash: videoHash,
        filename: file.name,
        size: file.size,
        duration,
        uploaded_at: new Date().toISOString(),
        user_id: userId,
        storage_url: publicUrl
      };

      const { data: savedVideo, error: saveError } = await supabase
        .from('training_videos' as any)
        .insert(videoMetadata)
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      console.log('✅ Video uploaded and saved:', savedVideo);
      return savedVideo as VideoMetadata;
    } catch (error) {
      console.error('❌ Video upload error:', error);
      return null;
    }
  }

  private static async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  }

  static async getTrainingVideos(userId?: string): Promise<VideoMetadata[]> {
    let query = supabase.from('training_videos' as any).select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching training videos:', error);
      return [];
    }

    return (data || []) as VideoMetadata[];
  }

  static async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('training_videos' as any)
        .delete()
        .eq('id', videoId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      return false;
    }
  }
}
