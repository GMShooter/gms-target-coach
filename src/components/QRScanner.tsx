import React, { useState, useEffect, useRef } from 'react';

import { Button } from './ui/button';
import { CardContent, CardHeader, CardTitle } from './ui/card';

interface ScanResult {
  data: string;
  cornerPoints?: Array<{ x: number; y: number }>;
}

interface QRScannerProps {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        setIsScanning(true);
        setError(null);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Simulate QR code detection after 2 seconds for demo
        setTimeout(() => {
          const mockResult: ScanResult = {
            data: 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080',
            cornerPoints: [
              { x: 100, y: 100 },
              { x: 200, y: 100 },
              { x: 200, y: 200 },
              { x: 100, y: 200 }
            ]
          };
          onScan(mockResult);
          setIsScanning(false);
          
          // Stop camera stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }, 2000);

      } catch (err) {
        setError('Failed to access camera');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      // Cleanup
      const currentVideoRef = videoRef.current;
      if (currentVideoRef && currentVideoRef.srcObject) {
        const stream = currentVideoRef.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <CardHeader>
        <CardTitle>Scan QR Code</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
            
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-white text-sm">Scanning for QR code...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default QRScanner;