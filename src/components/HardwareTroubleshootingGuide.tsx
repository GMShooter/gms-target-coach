import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Camera,
  Settings,
  RefreshCw,
  HelpCircle,
  Zap,
  Thermometer,
  HardDrive,
  Router,
  Smartphone,
  Monitor,
  Cable,
  Battery,
  Clock,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Lightbulb,
  Cpu
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge-2';

interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  severity: 'low' | 'medium' | 'high';
  checked: boolean;
  onToggle: () => void;
}

interface TroubleshootingCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: TroubleshootingStep[];
  expanded: boolean;
  onToggle: () => void;
}

export const HardwareTroubleshootingGuide: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['connection']));
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleStep = (stepId: string) => {
    setCheckedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const resetChecklist = () => {
    setCheckedSteps(new Set());
  };

  const categories: TroubleshootingCategory[] = [
    {
      id: 'connection',
      title: 'Connection Issues',
      description: 'Problems connecting to Raspberry Pi hardware',
      icon: <Wifi className="h-5 w-5" />,
      expanded: expandedCategories.has('connection'),
      onToggle: () => toggleCategory('connection'),
      steps: [
        {
          id: 'wifi-signal',
          title: 'Check WiFi Signal Strength',
          description: 'Ensure your device has strong WiFi signal. Move closer to the router if necessary.',
          icon: <Wifi className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('wifi-signal'),
          onToggle: () => toggleStep('wifi-signal')
        },
        {
          id: 'pi-power',
          title: 'Verify Pi Power Status',
          description: 'Check that the Raspberry Pi has power and the status LED is on.',
          icon: <Zap className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('pi-power'),
          onToggle: () => toggleStep('pi-power')
        },
        {
          id: 'network-credentials',
          title: 'Check Network Credentials',
          description: 'Verify the Pi is connected to the correct network with proper credentials.',
          icon: <Router className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('network-credentials'),
          onToggle: () => toggleStep('network-credentials')
        },
        {
          id: 'firewall-settings',
          title: 'Check Firewall Settings',
          description: 'Ensure port 8080 is open on your network firewall.',
          icon: <Shield className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('firewall-settings'),
          onToggle: () => toggleStep('firewall-settings')
        },
        {
          id: 'ip-address',
          title: 'Verify IP Address',
          description: 'Confirm the Pi has a valid IP address and is accessible on the network.',
          icon: <Monitor className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('ip-address'),
          onToggle: () => toggleStep('ip-address')
        }
      ]
    },
    {
      id: 'camera',
      title: 'Camera Issues',
      description: 'Problems with video feed or camera functionality',
      icon: <Camera className="h-5 w-5" />,
      expanded: expandedCategories.has('camera'),
      onToggle: () => toggleCategory('camera'),
      steps: [
        {
          id: 'camera-connection',
          title: 'Check Camera Connection',
          description: 'Ensure the camera is properly connected to the Raspberry Pi CSI port.',
          icon: <Cable className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('camera-connection'),
          onToggle: () => toggleStep('camera-connection')
        },
        {
          id: 'camera-enabled',
          title: 'Verify Camera is Enabled',
          description: 'Use `raspi-config` to ensure the camera interface is enabled.',
          icon: <Settings className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('camera-enabled'),
          onToggle: () => toggleStep('camera-enabled')
        },
        {
          id: 'lighting-conditions',
          title: 'Check Lighting Conditions',
          description: 'Ensure adequate lighting for target detection. Avoid glare or shadows.',
          icon: <Lightbulb className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('lighting-conditions'),
          onToggle: () => toggleStep('lighting-conditions')
        },
        {
          id: 'camera-focus',
          title: 'Adjust Camera Focus',
          description: 'Manually adjust the camera lens focus for clear target visibility.',
          icon: <Camera className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('camera-focus'),
          onToggle: () => toggleStep('camera-focus')
        }
      ]
    },
    {
      id: 'performance',
      title: 'Performance Issues',
      description: 'Slow response or system performance problems',
      icon: <RefreshCw className="h-5 w-5" />,
      expanded: expandedCategories.has('performance'),
      onToggle: () => toggleCategory('performance'),
      steps: [
        {
          id: 'cpu-usage',
          title: 'Check CPU Usage',
          description: 'Monitor Pi CPU usage. Close unnecessary processes if usage is high.',
          icon: <Cpu className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('cpu-usage'),
          onToggle: () => toggleStep('cpu-usage')
        },
        {
          id: 'memory-usage',
          title: 'Check Memory Usage',
          description: 'Ensure sufficient RAM is available. Restart Pi if memory is low.',
          icon: <HardDrive className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('memory-usage'),
          onToggle: () => toggleStep('memory-usage')
        },
        {
          id: 'temperature',
          title: 'Monitor Temperature',
          description: 'Check Pi temperature. Overheating can cause performance issues.',
          icon: <Thermometer className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('temperature'),
          onToggle: () => toggleStep('temperature')
        },
        {
          id: 'storage-space',
          title: 'Check Storage Space',
          description: 'Ensure sufficient disk space is available for logs and images.',
          icon: <HardDrive className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('storage-space'),
          onToggle: () => toggleStep('storage-space')
        }
      ]
    },
    {
      id: 'mobile',
      title: 'Mobile Device Issues',
      description: 'Problems specific to mobile devices',
      icon: <Smartphone className="h-5 w-5" />,
      expanded: expandedCategories.has('mobile'),
      onToggle: () => toggleCategory('mobile'),
      steps: [
        {
          id: 'browser-compatibility',
          title: 'Check Browser Compatibility',
          description: 'Use a modern browser with WebRTC support (Chrome, Firefox, Safari).',
          icon: <Monitor className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('browser-compatibility'),
          onToggle: () => toggleStep('browser-compatibility')
        },
        {
          id: 'camera-permissions',
          title: 'Verify Camera Permissions',
          description: 'Ensure the browser has permission to access the camera for QR scanning.',
          icon: <Camera className="h-4 w-4" />,
          severity: 'high',
          checked: checkedSteps.has('camera-permissions'),
          onToggle: () => toggleStep('camera-permissions')
        },
        {
          id: 'orientation-lock',
          title: 'Check Orientation Settings',
          description: 'Disable screen rotation lock for better QR code scanning.',
          icon: <Smartphone className="h-4 w-4" />,
          severity: 'low',
          checked: checkedSteps.has('orientation-lock'),
          onToggle: () => toggleStep('orientation-lock')
        },
        {
          id: 'battery-optimization',
          title: 'Disable Battery Optimization',
          description: 'Turn off battery saving features that might affect performance.',
          icon: <Battery className="h-4 w-4" />,
          severity: 'medium',
          checked: checkedSteps.has('battery-optimization'),
          onToggle: () => toggleStep('battery-optimization')
        }
      ]
    }
  ];

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getProgressPercentage = () => {
    const totalSteps = categories.reduce((sum, cat) => sum + cat.steps.length, 0);
    const checkedCount = checkedSteps.size;
    return totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Hardware Troubleshooting Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to diagnose and resolve common hardware issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Progress:</span> {getProgressPercentage()}%
              </div>
              <div className="text-sm">
                <span className="font-medium">Completed:</span> {checkedSteps.size} / {categories.reduce((sum, cat) => sum + cat.steps.length, 0)} steps
              </div>
            </div>
            <Button onClick={resetChecklist} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Start with Connection</h4>
                <p className="text-xs text-muted-foreground">Most issues are related to network connectivity</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Be Patient</h4>
                <p className="text-xs text-muted-foreground">Some operations take time to complete</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Check Power First</h4>
                <p className="text-xs text-muted-foreground">Ensure Pi has stable power supply</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Restart When Needed</h4>
                <p className="text-xs text-muted-foreground">A simple restart can fix many issues</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Categories */}
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={category.onToggle}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {category.icon}
                <div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {category.steps.filter(step => checkedSteps.has(step.id)).length}/{category.steps.length}
                </Badge>
                {category.expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
          
          {category.expanded && (
            <CardContent className="space-y-4">
              {category.steps.map((step) => (
                <div 
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    step.checked ? 'bg-green-50 border-green-200' : 'bg-muted/30'
                  }`}
                >
                  <button
                    onClick={step.onToggle}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      step.checked 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {step.checked && <CheckCircle className="h-3 w-3" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {step.icon}
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      <Badge variant={getSeverityColor(step.severity)} className="text-xs">
                        {step.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Actions
          </CardTitle>
          <CardDescription>
            Use these actions when standard troubleshooting doesn't work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Force Restart Pi
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Unplug power for 30 seconds, then reconnect. This resolves most hardware issues.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Restart Guide
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                Reset Network
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Reset network settings and reconnect to WiFi with fresh credentials.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Network Reset
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Factory Reset
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Restore Pi to factory settings. This will erase all configurations.
              </p>
              <Button variant="destructive" size="sm" className="w-full">
                Factory Reset
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Contact Support
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get help from our technical support team for persistent issues.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Get Help
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HardwareTroubleshootingGuide;