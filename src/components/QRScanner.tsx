import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, CameraOff, QrCode, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useHardwareStore } from '../store/hardwareStore';
import { hardwareAPI } from '../services/HardwareAPI';

interface QRScannerProps {
  onScan?: (result: QrScanner.ScanResult) => void;
  onError?: (error: Error | string) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

interface PairedDevice {
  id: string;
  name: string;
  url: string;
  lastConnected: Date;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onClose,
  title = "Scan QR Code",
  description = "Position the QR code within the frame to connect to your device"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Zustand store actions
  const hardwareStore = useHardwareStore();
  const { 
    setConnectedDevice, 
    setNgrokUrl, 
    setConnectionStatus,
    isConnected,
    isConnecting 
  } = hardwareStore;

  // Load paired devices from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pairedDevices');
    if (stored) {
      try {
        const devices = JSON.parse(stored);
        setPairedDevices(devices.map((d: any) => ({
          ...d,
          lastConnected: new Date(d.lastConnected)
        })));
      } catch (e) {
        console.error('Failed to load paired devices:', e);
      }
    }
  }, []);

  // Initialize scanner
  useEffect(() => {
    if (!videoRef.current) return;

    const initializeScanner = async () => {
      try {
        const qrScanner = new QrScanner(
          videoRef.current!,
          (result: QrScanner.ScanResult) => handleScanSuccess(result),
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await qrScanner.start();
        setScanner(qrScanner);
        setIsScanning(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize QR scanner:', err);
        setHasCamera(false);
        setError('Camera access denied or not available');
        if (onError) {
          onError(err as Error);
        }
      }
    };

    // Don't auto-start scanner - let user control it
    // initializeScanner();

    return () => {
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
    };
  }, [videoRef.current]);

  const handleScanSuccess = async (result: QrScanner.ScanResult) => {
    setScanResult(result.data);
    setConnectionStatus(false, true, null); // Set connecting state
    
    try {
      // Parse QR code data using HardwareAPI
      const device = await hardwareAPI.connectViaQRCode(result.data);
      
      if (device) {
        // Store device info in Zustand store
        setConnectedDevice(device);
        setNgrokUrl(device.ngrokUrl || device.url);
        setConnectionStatus(true, false, null);
        
        // Update paired devices list
        const newDevice: PairedDevice = {
          id: device.id,
          name: device.name,
          url: device.url,
          lastConnected: new Date()
        };

        const existingIndex = pairedDevices.findIndex(d => d.id === device.id);
        let updatedDevices: PairedDevice[];
        
        if (existingIndex >= 0) {
          updatedDevices = [...pairedDevices];
          updatedDevices[existingIndex] = newDevice;
        } else {
          updatedDevices = [...pairedDevices, newDevice];
        }

        setPairedDevices(updatedDevices);
        localStorage.setItem('pairedDevices', JSON.stringify(updatedDevices));
        
        // Stop scanning after successful scan
        if (scanner) {
          scanner.stop();
        }
        setIsScanning(false);
        
        if (onScan) onScan(result);
      } else {
        setConnectionStatus(false, false, 'Failed to connect to device');
        setError('Invalid QR code format. Please scan a valid GMShooter device QR code.');
      }
    } catch (error) {
      setConnectionStatus(false, false, error instanceof Error ? error.message : 'Connection failed');
      setError(error instanceof Error ? error.message : 'Invalid QR code data. Please scan a valid GMShooter device QR code.');
      if (onError) onError(error instanceof Error ? error : new Error('QR scan failed'));
    }
  };

  const startScanning = async () => {
    try {
      // Create scanner instance if it doesn't exist
      if (!scanner) {
        const qrScanner = new QrScanner(
          videoRef.current!,
          (result: QrScanner.ScanResult) => handleScanSuccess(result),
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        
        setScanner(qrScanner);
        await qrScanner.start();
      } else {
        await scanner.start();
      }
      
      setIsScanning(true);
      setError(null);
      setScanResult(null);
    } catch (err) {
      console.error('Failed to start scanning:', err);
      setHasCamera(false);
      setError('Camera access denied or not available');
    }
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.stop();
    }
    setIsScanning(false);
  };

  const connectToDevice = async (device: PairedDevice) => {
    setConnectionStatus(false, true, null); // Set connecting state
    
    try {
      // Create QR code data for paired device
      const qrData = `GMShoot://${device.id}|${device.name}|${device.url}|8080`;
      
      // Connect using HardwareAPI
      const connectedDevice = await hardwareAPI.connectViaQRCode(qrData);
      
      if (connectedDevice) {
        // Store device info in Zustand store
        setConnectedDevice(connectedDevice);
        setNgrokUrl(connectedDevice.ngrokUrl || connectedDevice.url);
        setConnectionStatus(true, false, null);
        
        // Update last connected time
        const updatedDevice = { ...device, lastConnected: new Date() };
        const existingIndex = pairedDevices.findIndex(d => d.id === device.id);
        let updatedDevices: PairedDevice[];
        
        if (existingIndex >= 0) {
          updatedDevices = [...pairedDevices];
          updatedDevices[existingIndex] = updatedDevice;
        } else {
          updatedDevices = [...pairedDevices, updatedDevice];
        }

        setPairedDevices(updatedDevices);
        localStorage.setItem('pairedDevices', JSON.stringify(updatedDevices));
        
        if (onClose) onClose();
      } else {
        setConnectionStatus(false, false, 'Failed to connect to device');
        setError('Failed to connect to device');
      }
    } catch (error) {
      setConnectionStatus(false, false, error instanceof Error ? error.message : 'Connection failed');
      setError(error instanceof Error ? error.message : 'Failed to connect to device');
      if (onError) onError(error instanceof Error ? error : new Error('Device connection failed'));
    }
  };

  const removeDevice = (deviceId: string) => {
    const updatedDevices = pairedDevices.filter(d => d.id !== deviceId);
    setPairedDevices(updatedDevices);
    localStorage.setItem('pairedDevices', JSON.stringify(updatedDevices));
  };

  if (!hasCamera) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraOff className="h-5 w-5 text-red-500" />
            Camera Not Available
          </CardTitle>
          <CardDescription>
            Camera access is required for QR code scanning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Please ensure camera permissions are granted and a camera is available.
            </AlertDescription>
          </Alert>
          
          {pairedDevices.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Previously Paired Devices:</h4>
              <div className="space-y-2">
                {pairedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-500">
                        Last connected: {device.lastConnected.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => connectToDevice(device)}
                      >
                        Connect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeDevice(device.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Video */}
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg border-2 border-gray-200"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          
          {!isScanning && (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {scanResult && (
            <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Scan Result */}
        {scanResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Successfully scanned: {JSON.stringify(scanResult, null, 2)}
            </AlertDescription>
          </Alert>
        )}

        {/* Paired Devices */}
        {pairedDevices.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Previously Paired Devices:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pairedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{device.name}</div>
                    <div className="text-xs text-gray-500">
                      {device.lastConnected.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connectToDevice(device)}
                    >
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDevice(device.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}
          
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;