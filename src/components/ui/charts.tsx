"use client";

import { TrendingUp, Target, Crosshair } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer as LineResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

// Radar Chart for Bullseye Shot Analysis
export function BullseyeRadarChart({ data }: { data?: any[] }) {
  const defaultData = [
    { shot: "Center", accuracy: 95, confidence: 88 },
    { shot: "Inner Ring", accuracy: 87, confidence: 92 },
    { shot: "Middle Ring", accuracy: 78, confidence: 85 },
    { shot: "Outer Ring", accuracy: 65, confidence: 79 },
    { shot: "Edge", accuracy: 45, confidence: 70 },
  ];

  const chartData = data || defaultData;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Shot Accuracy Analysis
        </CardTitle>
        <CardDescription className="text-slate-400">
          Distribution of shot accuracy across target zones
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="mx-auto aspect-square max-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid 
                className="fill-blue-500/20 opacity-30"
                gridType="circle"
                stroke="#475569"
              />
              <PolarAngleAxis 
                dataKey="shot" 
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
              />
              <Radar
                name="Accuracy"
                dataKey="accuracy"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Confidence"
                dataKey="confidence"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#1e293b", 
                  border: "1px solid #475569",
                  borderRadius: "8px"
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Legend 
                wrapperStyle={{ color: "#cbd5e1" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium text-white">
          <TrendingUp className="h-4 w-4 text-green-400" />
          Overall accuracy improved by 12% this session
        </div>
        <div className="text-slate-400 flex items-center gap-2 leading-none">
          <Crosshair className="h-4 w-4" />
          Focus on center shots for maximum points
        </div>
      </CardFooter>
    </Card>
  );
}

// Line Chart for Session Scores
export function SessionScoreLineChart({ data }: { data?: any[] }) {
  const defaultData = [
    { session: "Session 1", score: 65, accuracy: 72 },
    { session: "Session 2", score: 78, accuracy: 81 },
    { session: "Session 3", score: 82, accuracy: 85 },
    { session: "Session 4", score: 75, accuracy: 79 },
    { session: "Session 5", score: 88, accuracy: 91 },
    { session: "Session 6", score: 92, accuracy: 94 },
  ];

  const chartData = data || defaultData;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Performance Progress
        </CardTitle>
        <CardDescription className="text-slate-400">
          Session scores and accuracy trends over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <LineResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid 
                vertical={false} 
                stroke="#475569"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="session"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => value.replace("Session ", "S")}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#1e293b", 
                  border: "1px solid #475569",
                  borderRadius: "8px"
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Line
                dataKey="score"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{
                  fill: "#3b82f6",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
                name="Score"
              />
              <Line
                dataKey="accuracy"
                type="monotone"
                stroke="#10b981"
                strokeWidth={3}
                dot={{
                  fill: "#10b981",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
                name="Accuracy %"
              />
              <Legend 
                wrapperStyle={{ color: "#cbd5e1" }}
              />
            </LineChart>
          </LineResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-white">
          <TrendingUp className="h-4 w-4 text-green-400" />
          Average score increased by 41% over 6 sessions
        </div>
        <div className="text-slate-400 leading-none">
          Consistent improvement in both score and accuracy metrics
        </div>
      </CardFooter>
    </Card>
  );
}

// Combined Chart Component for Reports
export function ShootingAnalysisCharts({ 
  radarData, 
  lineData 
}: { 
  radarData?: any[]; 
  lineData?: any[]; 
}) {
  return (
    <div className="space-y-6">
      <BullseyeRadarChart data={radarData} />
      <SessionScoreLineChart data={lineData} />
    </div>
  );
}