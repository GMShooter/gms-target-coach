
import React from 'react';
import { Skeleton } from './ui/skeleton';

interface Shot {
  id: string;
  shot_number: number;
  score: number;
  direction: string;
  comment: string;
}

interface ShotTableProps {
  shots: Shot[];
  loading?: boolean;
}

export const ShotTable: React.FC<ShotTableProps> = ({ shots, loading = false }) => {
  const getScoreColor = (score: number) => {
    if (score >= 10) return 'text-green-400';
    if (score >= 9) return 'text-yellow-400';
    if (score >= 7) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold">Shot #</th>
              <th className="text-left py-3 px-4 font-semibold">Score</th>
              <th className="text-left py-3 px-4 font-semibold">Direction</th>
              <th className="text-left py-3 px-4 font-semibold">Comment</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-slate-700/50">
                <td className="py-3 px-4"><Skeleton className="h-4 w-8" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
                <td className="py-3 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 font-semibold">Shot #</th>
            <th className="text-left py-3 px-4 font-semibold">Score</th>
            <th className="text-left py-3 px-4 font-semibold">Direction</th>
            <th className="text-left py-3 px-4 font-semibold">Comment</th>
          </tr>
        </thead>
        <tbody>
          {shots.map((shot, index) => (
            <tr 
              key={shot.id} 
              className="border-b border-slate-700/50 hover:bg-slate-700/20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <td className="py-3 px-4 font-mono">{shot.shot_number}</td>
              <td className="py-3 px-4">
                <span className={`font-semibold ${getScoreColor(shot.score)}`}>
                  {shot.score}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  shot.direction === 'Centered' 
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-orange-900/30 text-orange-400'
                }`}>
                  {shot.direction}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-300">{shot.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
