import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface Shot {
  x_coordinate: number;
  y_coordinate: number;
  shot_number: number;
  score: number;
  direction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_id, user_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating final report for session ${session_id}`);

    // Get all shots for this session
    const { data: shots, error: shotsError } = await supabaseClient
      .from('shots')
      .select('*')
      .eq('session_id', session_id)
      .order('shot_number');

    if (shotsError) {
      console.error('Error fetching shots:', shotsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch shots' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shots || shots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No shots found for this session' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate comprehensive analysis
    const analysis = generateFinalAnalysis(shots as Shot[]);

    // Update session with final metrics
    const { error: updateError } = await supabaseClient
      .from('sessions')
      .update({
        total_score: analysis.sessionMetrics.totalScoreNum,
        accuracy_percentage: analysis.sessionMetrics.accuracyNum,
        group_size_mm: analysis.sessionMetrics.groupSizeNum,
        directional_trend: analysis.sessionMetrics.directionalTrend,
        user_id: user_id || null
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Error updating session:', updateError);
    }

    console.log(`✅ Final report generated for session ${session_id}`);

    return new Response(
      JSON.stringify({
        session_id,
        analysis,
        totalShots: shots.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session analysis error:', error);
    return new Response(
      JSON.stringify({ error: `Session analysis failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFinalAnalysis(shots: Shot[]) {
  const TARGET_CENTER_X = 820;
  const TARGET_CENTER_Y = 420;
  
  const numShots = shots.length;
  const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0);
  const maxPossibleScore = numShots * 10;
  const accuracy = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  const averageScore = numShots > 0 ? totalScore / numShots : 0;

  // Calculate group size (max distance between any two shots)
  let maxDistance = 0;
  if (numShots > 1) {
    for (let i = 0; i < numShots; i++) {
      for (let j = i + 1; j < numShots; j++) {
        const dist = Math.sqrt(
          Math.pow(shots[i].x_coordinate - shots[j].x_coordinate, 2) +
          Math.pow(shots[i].y_coordinate - shots[j].y_coordinate, 2)
        );
        if (dist > maxDistance) {
          maxDistance = dist;
        }
      }
    }
  }

  // Calculate directional trend
  let avgXDev = 0;
  let avgYDev = 0;
  shots.forEach(shot => {
    avgXDev += (shot.x_coordinate - TARGET_CENTER_X);
    avgYDev += (shot.y_coordinate - TARGET_CENTER_Y);
  });
  avgXDev /= numShots;
  avgYDev /= numShots;

  const trendDirection = getDirection(
    TARGET_CENTER_X + avgXDev, 
    TARGET_CENTER_Y + avgYDev, 
    TARGET_CENTER_X, 
    TARGET_CENTER_Y
  );
  const trendMagnitude = (Math.abs(avgXDev) + Math.abs(avgYDev)) / 2;
  const directionalTrend = trendDirection !== "Center" 
    ? `${Math.round(trendMagnitude)}px ${trendDirection}` 
    : "Centered Pattern";

  // Performance grade
  let grade = "C";
  if (averageScore >= 9.5) grade = "A+";
  else if (averageScore >= 9.0) grade = "A";
  else if (averageScore >= 8.5) grade = "B+";
  else if (averageScore >= 8.0) grade = "B";
  else if (averageScore >= 7.5) grade = "C+";

  // Generate coaching analysis
  const coaching = generateRuleBasedCoaching(averageScore, directionalTrend, maxDistance);

  // Detailed shots analysis
  const detailedShots = shots.map(shot => ({
    shot_num: shot.shot_number,
    score: shot.score,
    direction: shot.direction,
    comment: `Shot #${shot.shot_number} - ${shot.score}/10 points`
  }));

  return {
    sessionMetrics: {
      accuracy: `${Math.round(accuracy)}%`,
      accuracyNum: accuracy,
      groupSize: `${Math.round(maxDistance)}px`,
      groupSizeNum: maxDistance,
      totalScore: `${totalScore}/${maxPossibleScore}`,
      totalScoreNum: totalScore,
      directionalTrend,
      performanceGrade: grade
    },
    detailedShots,
    coachingAnalysis: coaching
  };
}

function getDirection(x: number, y: number, centerX: number, centerY: number): string {
  const threshold = 17.5; // Half of ring spacing
  let direction = "";
  
  if (y < centerY - threshold) direction += "High";
  else if (y > centerY + threshold) direction += "Low";
  
  if (x < centerX - threshold) direction += direction ? " Left" : "Left";
  else if (x > centerX + threshold) direction += direction ? " Right" : "Right";
  
  return direction || "Center";
}

function generateRuleBasedCoaching(avgScore: number, directionalTrend: string, groupSize: number) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let advice = "Continue focusing on the fundamentals: sight alignment, trigger control, and follow-through.";

  // Analyze strengths
  if (avgScore >= 9.0) {
    strengths.push("Consistent high scores and excellent accuracy");
  } else if (avgScore >= 8.0) {
    strengths.push("Solid shooting fundamentals and good control");
  } else if (avgScore >= 7.0) {
    strengths.push("Developing accuracy with room for improvement");
  }

  if (groupSize < 50) {
    strengths.push("Excellent shot grouping and consistency");
  } else if (groupSize < 100) {
    strengths.push("Good shot consistency");
  }

  // Analyze areas for improvement
  const trendLower = directionalTrend.toLowerCase();
  if (trendLower.includes("left")) {
    improvements.push("Reduce leftward shot pattern");
    advice = "Focus on a smooth, straight-back trigger pull to reduce the leftward bias. Consider dry-fire practice to improve trigger control.";
  } else if (trendLower.includes("right")) {
    improvements.push("Address rightward shot tendency");
    advice = "Ensure consistent grip pressure and focus on your support hand to stabilize the firearm. Check your grip fundamentals.";
  } else if (trendLower.includes("high")) {
    improvements.push("Lower shot placement needed");
    advice = "Focus on consistent sight picture and follow-through. Ensure you're not anticipating recoil.";
  } else if (trendLower.includes("low")) {
    improvements.push("Elevate shot placement");
    advice = "Check your sight alignment and ensure proper trigger follow-through. Avoid jerking the trigger.";
  }

  if (groupSize > 100) {
    improvements.push("Improve shot grouping consistency");
    if (!advice.includes("fundamentals")) {
      advice = "Work on breathing control and consistent shooting position. Practice with a smaller target to improve precision.";
    }
  }

  // Default values if nothing specific found
  if (strengths.length === 0) {
    strengths.push("Good effort and developing shooting skills");
  }
  if (improvements.length === 0) {
    improvements.push("Continue to refine shot placement and grouping");
  }

  return {
    strengths,
    areasForImprovement: improvements,
    performanceSummary: `Your session shows ${avgScore >= 8 ? 'strong' : 'developing'} shooting fundamentals with ${groupSize < 75 ? 'excellent' : 'good'} consistency.`,
    coachingAdvice: advice
  };
}