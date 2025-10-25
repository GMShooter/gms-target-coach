import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge-2';
import { QRScanner } from '../components/QRScanner';
import { QrCode, Wifi, WifiOff, ArrowRight } from 'lucide-react';
import { useHardware } from '../hooks/useHardware';

// Define ScanResult type to avoid importing qr-scanner in component
interface ScanResult {
  data: string;
  cornerPoints?: Array<{ x: number; y: number }>;
}

export const ConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    isConnecting,
    connectionError,
    connectedDevice,
    connectToDevice
  } = useHardware();

  const [showQRScanner, setShowQRScanner] = React.useState(false);

  // Handle QR code scan result
  const handleQRCodeScanned = async (result: ScanResult) => {
    try {
      await connectToDevice(result.data);
      // Navigate to session page after successful connection
      navigate('/session');
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  };

  // Handle QR scanner close
  const handleQRScannerClose = () => {
    setShowQRScanner(false);
  };

  // Handle demo connection
  const handleDemoConnection = async () => {
    const mockQRCode = 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080';
    try {
      await connectToDevice(mockQRCode);
      navigate('/session');
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Connect to Hardware</h1>
          <p className="text-slate-300 text-lg">
            Scan a QR code from your GMShoot device or use demo connection
          </p>
        </div>

        {/* Connection Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={isConnected ? "success" : isConnecting ? "warning" : "destructive"}>
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Connected
                    </>
                  ) : isConnecting ? (
                    <>
                      <WifiOff className="h-4 w-4 mr-2 animate-pulse" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnected
                    </>
                  )}
                </Badge>
               
                {connectedDevice && (
                  <div className="text-right">
                    <p className="text-sm text-slate-300">Device:</p>
                    <p className="font-medium text-white">{connectedDevice.name}</p>
                  </div>
                )}
              </div>
            </div>

              {connectionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{connectionError}</p>
                </div>
              )}
            </CardContent>
          </Card>

        {/* QR Scanner Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan QR code displayed on your GMShoot Raspberry Pi device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {!isConnected ? (
                <div className="space-y-4">
                  <p className="text-slate-300 mb-4">
                    Click button below to open QR scanner and connect to your device
                  </p>
                  <Button
                    onClick={() => setShowQRScanner(true)}
                    disabled={isConnecting}
                    size="lg"
                    className="w-full"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    Scan QR Code
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 font-medium">Successfully connected to {connectedDevice?.name}</p>
                  </div>
                  <Button
                    onClick={() => navigate('/session')}
                    size="lg"
                    className="w-full"
                  >
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Go to Session
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demo Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Demo Connection
            </CardTitle>
            <CardDescription>
              For testing purposes without physical hardware
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-slate-300 mb-4">
                Use this option to test the application with a simulated hardware connection
              </p>
              <Button
                onClick={handleDemoConnection}
                disabled={isConnecting || isConnected}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Wifi className="h-5 w-5 mr-2" />
                Connect to Demo Device
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">How to connect</h3>
            <ol className="text-left text-slate-300 space-y-2">
              <li className="flex items-start">
                <span className="font-medium text-white mr-2">1.</span>
                Power on your GMShoot Raspberry Pi device
              </li>
              <li className="flex items-start">
                <span className="font-medium text-white mr-2">2.</span>
                Connect the Pi to your network via WiFi or Ethernet
              </li>
              <li className="flex items-start">
                <span className="font-medium text-white mr-2">3.</span>
                The device will display a QR code on its connected screen
              </li>
              <li className="flex items-start">
                <span className="font-medium text-white mr-2">4.</span>
                Scan the QR code using the button above
              </li>
              <li className="flex items-start">
                <span className="font-medium text-white mr-2">5.</span>
                You'll be automatically redirected to the session page
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <QRScanner
              onScan={handleQRCodeScanned}
              onClose={handleQRScannerClose}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectPage;