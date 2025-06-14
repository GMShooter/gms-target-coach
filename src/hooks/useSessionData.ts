
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Shot {
  id: string;
  shot_number: number;
  score: number;
  x_coordinate: number;
  y_coordinate: number;
  direction: string;
  comment: string;
  shot_timestamp?: number;
}

interface Session {
  id: string;
  created_at: string;
  total_score: number;
  group_size_mm: number;
  accuracy_percentage: number;
  directional_trend: string;
  drill_mode?: boolean;
  time_to_first_shot?: number;
  average_split_time?: number;
  split_times?: any;
}

interface SessionData {
  session: Session;
  shots: Shot[];
}

export const useSessionData = (sessionId: string | null) => {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch session data
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          throw new Error(`Failed to fetch session: ${sessionError.message}`);
        }

        // Fetch shots data
        const { data: shots, error: shotsError } = await supabase
          .from('shots')
          .select('*')
          .eq('session_id', sessionId)
          .order('shot_number');

        if (shotsError) {
          throw new Error(`Failed to fetch shots: ${shotsError.message}`);
        }

        setData({ session, shots });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Session data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  return { data, loading, error };
};
