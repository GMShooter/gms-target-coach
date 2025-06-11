
import React from 'react';

interface Shot {
  id: number;
  score: number;
  ring: string;
  direction: string;
  comment: string;
}

interface ShotTableProps {
  shots: Shot[];
}

export const ShotTable: React.FC<ShotTableProps> = ({ shots }) => {
  const getScoreColor = (score: number) => {
    if (score >= 10) return 'text-green-400';
    if (score >= 9) return 'text-yellow-400';
    if (score >= 7) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 font-semibold">Shot #</th>
            <th className="text-left py-3 px-4 font-semibold">Score (Ring)</th>
            <th className="text-left py-3 px-4 font-semibold">Direction</th>
            <th className="text-left py-3 px-4 font-semibold">Comment</th>
          </tr>
        </thead>
        <tbody>
          {shots.map((shot) => (
            <tr key={shot.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
              <td className="py-3 px-4 font-mono">{shot.id}</td>
              <td className="py-3 px-4">
                <span className={`font-semibold ${getScoreColor(shot.score)}`}>
                  {shot.score}
                </span>
                <span className="text-slate-400 ml-2">({shot.ring})</span>
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
