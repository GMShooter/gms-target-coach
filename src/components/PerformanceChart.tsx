/* eslint-disable import/order */
import React, { useEffect, useRef } from 'react';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge-2';

interface PerformanceData {
  timestamp: number;
  score: number;
  accuracy: number;
  grouping: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title?: string;
  height?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  title = "Performance Trends", 
  height = 200 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Calculate bounds
    const maxScore = Math.max(...data.map(d => d.score), 10);
    const minScore = Math.min(...data.map(d => d.score), 0);
    const maxAccuracy = Math.max(...data.map(d => d.accuracy), 100);
    const minAccuracy = Math.min(...data.map(d => d.accuracy), 0);
    const maxGrouping = Math.max(...data.map(d => d.grouping), 50);
    const minGrouping = Math.min(...data.map(d => d.grouping), 0);

    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw data lines
    const drawLine = (values: number[], min: number, max: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach((value, index) => {
        const x = padding + (chartWidth / (values.length - 1)) * index;
        const y = padding + chartHeight - ((value - min) / (max - min)) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = color;
      values.forEach((value, index) => {
        const x = padding + (chartWidth / (values.length - 1)) * index;
        const y = padding + chartHeight - ((value - min) / (max - min)) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Draw performance lines
    drawLine(data.map(d => d.score), minScore, maxScore, '#3b82f6'); // Blue for score
    drawLine(data.map(d => d.accuracy), minAccuracy, maxAccuracy, '#10b981'); // Green for accuracy
    drawLine(data.map(d => d.grouping), minGrouping, maxGrouping, '#f59e0b'); // Orange for grouping

    // Draw legend
    const legendY = 10;
    const legendItems = [
      { label: 'Score', color: '#3b82f6' },
      { label: 'Accuracy', color: '#10b981' },
      { label: 'Grouping', color: '#f59e0b' }
    ];

    legendItems.forEach((item, index) => {
      const legendX = rect.width - 150 + index * 50;
      
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY, 10, 10);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.label, legendX + 15, legendY + 8);
    });

  }, [data, height]);

  // Calculate trend
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const scoreTrend = calculateTrend(data.map(d => d.score));
  const accuracyTrend = calculateTrend(data.map(d => d.accuracy));
  // Note: accuracyTrend is used for future accuracy visualization
  void accuracyTrend; // Suppress unused variable warning

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'up': return <Badge variant="success" className="bg-green-100 text-green-800">Improving</Badge>;
      case 'down': return <Badge variant="destructive">Declining</Badge>;
      default: return <Badge variant="secondary">Stable</Badge>;
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {getTrendIcon(scoreTrend)}
            {getTrendBadge(scoreTrend)}
          </div>
        </CardTitle>
        <CardDescription>
          Performance trends over time with score, accuracy, and grouping metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: `${height}px` }}
        />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.length > 0 ? data[data.length - 1].score.toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600">Latest Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.length > 0 ? data[data.length - 1].accuracy.toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Latest Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.length > 0 ? data[data.length - 1].grouping.toFixed(1) : '0.0'}mm
            </div>
            <div className="text-sm text-gray-600">Latest Grouping</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};