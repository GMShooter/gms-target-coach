
import React from 'react';
import { Card } from './ui/card';

interface FrameValidationProps {
  firstFrameBase64?: string;
  lastFrameBase64?: string;
}

export const FrameValidation: React.FC<FrameValidationProps> = ({ 
  firstFrameBase64, 
  lastFrameBase64 
}) => {
  if (!firstFrameBase64 && !lastFrameBase64) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-white">Frame Validation</h3>
      <p className="text-slate-400 mb-4">
        Compare the first and last frames to validate shot detection accuracy
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {firstFrameBase64 && (
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <h4 className="text-lg font-medium text-slate-300 mb-3">First Frame</h4>
            <div className="relative rounded-lg overflow-hidden border border-slate-600">
              <img 
                src={firstFrameBase64} 
                alt="First frame of the video showing initial target state" 
                className="w-full h-auto max-h-64 object-contain bg-slate-900"
              />
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                Initial State
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Target before shooting - used as baseline for detection
            </p>
          </Card>
        )}
        
        {lastFrameBase64 && (
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <h4 className="text-lg font-medium text-slate-300 mb-3">Last Frame</h4>
            <div className="relative rounded-lg overflow-hidden border border-slate-600">
              <img 
                src={lastFrameBase64} 
                alt="Last frame of the video showing final target state" 
                className="w-full h-auto max-h-64 object-contain bg-slate-900"
              />
              <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                Final State
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Target after shooting - shows all detected bullet holes
            </p>
          </Card>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
        <h4 className="font-semibold mb-2 text-blue-400">🔍 Validation Guide</h4>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• Compare both frames to verify all shots were detected</li>
          <li>• Check if any bullet holes are missing from the analysis</li>
          <li>• Ensure no false positives (marks that aren't bullet holes)</li>
          <li>• This helps improve future AI model training</li>
        </ul>
      </div>
    </div>
  );
};
