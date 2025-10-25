import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge-2';
import { Target, TrendingUp, BarChart3 } from 'lucide-react';

interface ShotData {
  id: string;
  shot_number: number;
  x_coordinate: number;
  y_coordinate: number;
  score: number;
  scoring_zone: string;
  confidence_score: number;
  timestamp: string;
}

interface SessionStatistics {
  total_shots: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  accuracy_percentage: number;
  session_duration_seconds: number;
  shots_per_minute: number;
}

interface TargetVisualizationProps {
  shots: ShotData[];
  statistics: SessionStatistics;
  className?: string;
}

const TargetVisualization: React.FC<TargetVisualizationProps> = ({
  shots,
  statistics,
  className = ''
}) => {
  const targetSize = 400;
  const centerX = targetSize / 2;
  const centerY = targetSize / 2;

  // Target rings with proper scoring zones
  const rings = [
    { radius: 180, score: 1, color: '#3b82f6', label: '1', zoneColor: 'bg-blue-500' },
    { radius: 150, score: 3, color: '#6366f1', label: '3', zoneColor: 'bg-blue-400' },
    { radius: 120, score: 5, color: '#eab308', label: '5', zoneColor: 'bg-yellow-500' },
    { radius: 80, score: 7, color: '#f97316', label: '7', zoneColor: 'bg-orange-500' },
    { radius: 40, score: 10, color: '#ef4444', label: '10', zoneColor: 'bg-red-500' }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#10b981';
    if (score >= 7) return '#eab308';
    if (score >= 5) return '#f97316';
    return '#ef4444';
  };

  const getScoringZoneColor = (zone: string) => {
    const zoneColors: { [key: string]: string } = {
      'bullseye': '#ef4444',
      'inner': '#f97316',
      'middle': '#eab308',
      'outer': '#3b82f6',
      'edge': '#6b7280'
    };
    return zoneColors[zone] || '#6b7280';
  };

  const renderTarget = () => (
    <div className="relative">
      <svg width={targetSize} height={targetSize} className="border-2 border-gray-300 rounded-full bg-white">
        {/* Target rings */}
        {rings.map((ring, index) => (
          <g key={index}>
            <circle
              cx={centerX}
              cy={centerY}
              r={ring.radius}
              fill={ring.color}
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Score labels */}
            <text
              x={centerX}
              y={centerY - ring.radius + 15}
              textAnchor="middle"
              fill="#374151"
              fontSize="12"
              fontWeight="bold"
            >
              {ring.label}
            </text>
          </g>
        ))}
        
        {/* Shot markers with enhanced visualization */}
        {shots.map((shot) => {
          // Convert coordinates from 0-1 range to pixel coordinates
          const x = centerX + (shot.x_coordinate - 0.5) * targetSize;
          const y = centerY + (shot.y_coordinate - 0.5) * targetSize;
          
          return (
            <g key={shot.id}>
              {/* Shot marker with confidence-based sizing */}
              <circle
                cx={x}
                cy={y}
                r={6 + (shot.confidence_score * 4)}
                fill={getScoreColor(shot.score)}
                stroke="white"
                strokeWidth="2"
                opacity={0.8 + (shot.confidence_score * 0.2)}
              />
              
              {/* Shot number */}
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                stroke="#374151"
                strokeWidth="1"
              >
                {shot.shot_number}
              </text>
              
              {/* Score label */}
              <text
                x={x + 15}
                y={y + 5}
                textAnchor="start"
                fill={getScoreColor(shot.score)}
                fontSize="12"
                fontWeight="bold"
              >
                {shot.score}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Target legend */}
      <div className="absolute -bottom-8 -left-4 bg-white border border-gray-200 rounded p-2 text-xs">
        <div className="font-semibold mb-1">Scoring Zones:</div>
        <div className="grid grid-cols-2 gap-1">
          {rings.map((ring, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${ring.zoneColor}`}></div>
              <span>{ring.label} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{statistics.total_shots}</div>
          <div className="text-sm text-blue-600">Total Shots</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{statistics.average_score?.toFixed(1) || '0.0'}</div>
          <div className="text-sm text-green-600">Average Score</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{statistics.highest_score || 0}</div>
          <div className="text-sm text-red-600">Highest Score</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{statistics.lowest_score || 0}</div>
          <div className="text-sm text-orange-600">Lowest Score</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {statistics.accuracy_percentage?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-sm text-purple-600">Accuracy</div>
        </div>
        <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-600">
            {Math.floor(statistics.session_duration_seconds / 60)}:{(statistics.session_duration_seconds % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-indigo-600">Duration</div>
        </div>
        <div className="text-center p-4 bg-teal-50 rounded-lg border border-teal-200">
          <div className="text-2xl font-bold text-teal-600">
            {statistics.shots_per_minute?.toFixed(1) || '0.0'}
          </div>
          <div className="text-sm text-teal-600">Shots/Min</div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Score Distribution
        </h4>
        <div className="space-y-2">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(score => {
            const count = shots.filter(shot => shot.score === score).length;
            const percentage = shots.length > 0 ? (count / shots.length) * 100 : 0;
            
            return (
              <div key={score} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full ${getScoreColor(score)}`}></div>
                  <span className="text-sm font-medium w-8">{score}</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreColor(score)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 w-12 text-right">
                  {count} ({percentage.toFixed(0)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Target Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Target Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shots.length > 0 ? renderTarget() : (
            <div className="text-center py-12 text-gray-500">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No shots recorded for this session</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      {shots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStatistics()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TargetVisualization;