import React, { useState, useEffect } from 'react';

import {
  Share2,
  Download,
  Upload,
  Link,
  Mail,
  MessageCircle,
  FileText,
  Image,
  BarChart3,
  Users,
  Globe,
  Lock,
  Unlock,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  Settings,
  QrCode
} from 'lucide-react';

import { SessionData, ShotData } from '../services/HardwareAPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge-2';

interface SessionSharingProps {
  session: SessionData | null;
  shots: ShotData[];
  onShare?: (shareData: ShareData) => void;
}

interface ShareData {
  type: 'link' | 'email' | 'file' | 'qr';
  format: 'json' | 'csv' | 'pdf' | 'image';
  privacy: 'public' | 'private' | 'unlisted';
  includeAnalytics: boolean;
  includeImages: boolean;
  customMessage?: string;
}

interface ShareLink {
  url: string;
  expiresAt?: Date;
  accessCount?: number;
  maxAccess?: number;
}

export const SessionSharing: React.FC<SessionSharingProps> = ({
  session,
  shots,
  onShare
}) => {
  const [shareData, setShareData] = useState<ShareData>({
    type: 'link',
    format: 'json',
    privacy: 'private',
    includeAnalytics: true,
    includeImages: false
  });
  
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Generate share link
  const generateShareLink = async () => {
    if (!session) return;
    
    setIsGenerating(true);
    try {
      // In a real implementation, this would call an API to generate a share link
      const mockShareLink: ShareLink = {
        url: `https://gmshoot.app/shared/${session.sessionId}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        accessCount: 0,
        maxAccess: 50
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShareLink(mockShareLink);
      onShare?.(shareData);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy share link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Download session data
  const downloadSessionData = async () => {
    if (!session) return;
    
    let data: any;
    let filename: string;
    let mimeType: string;

    switch (shareData.format) {
      case 'json':
        data = JSON.stringify({
          session,
          shots,
          analytics: shareData.includeAnalytics ? generateAnalytics() : null,
          exportedAt: new Date().toISOString()
        }, null, 2);
        filename = `session-${session.sessionId}.json`;
        mimeType = 'application/json';
        break;
        
      case 'csv':
        data = generateCSV();
        filename = `session-${session.sessionId}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'pdf':
        // In a real implementation, this would generate a PDF
        data = generatePDFContent();
        filename = `session-${session.sessionId}.pdf`;
        mimeType = 'application/pdf';
        break;
        
      default:
        return;
    }

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate CSV data
  const generateCSV = () => {
    if (!session || shots.length === 0) return '';
    
    const headers = ['Shot Number', 'Timestamp', 'Score', 'Confidence', 'X Coordinate', 'Y Coordinate'];
    const rows = shots.map((shot, index) => [
      index + 1,
      new Date(shot.timestamp).toISOString(),
      shot.score,
      shot.confidence,
      shot.coordinates.x,
      shot.coordinates.y
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Generate PDF content (simplified)
  const generatePDFContent = () => {
    if (!session) return '';
    
    return `
Session Report: ${session.sessionId}
Date: ${new Date(session.startTime).toLocaleDateString()}
Target Distance: ${session.settings.targetDistance}m
Target Size: ${session.settings.targetSize}m
Total Shots: ${shots.length}

Shot Details:
${shots.map((shot, index) => `
Shot ${index + 1}:
  Score: ${shot.score}/10
  Confidence: ${Math.round(shot.confidence * 100)}%
  Position: (${shot.coordinates.x}, ${shot.coordinates.y})
  Time: ${new Date(shot.timestamp).toLocaleTimeString()}
`).join('\n')}

Analytics:
${generateAnalyticsText()}
    `.trim();
  };

  // Generate analytics data
  const generateAnalytics = () => {
    if (shots.length === 0) return null;
    
    const scores = shots.map(s => s.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const bullseyes = shots.filter(s => s.score >= 10).length;
    
    return {
      totalShots: shots.length,
      averageScore: Math.round(avgScore * 10) / 10,
      maxScore,
      minScore,
      bullseyes,
      accuracy: Math.round((bullseyes / shots.length) * 100)
    };
  };

  // Generate analytics text
  const generateAnalyticsText = () => {
    const analytics = generateAnalytics();
    if (!analytics) return 'No analytics available';
    
    return `
Total Shots: ${analytics.totalShots}
Average Score: ${analytics.averageScore}/10
Best Shot: ${analytics.maxScore}/10
Worst Shot: ${analytics.minScore}/10
Bullseyes: ${analytics.bullseyes}
Accuracy: ${analytics.accuracy}%
    `.trim();
  };

  // Generate preview data
  const generatePreview = () => {
    if (!session) return;
    
    const preview = {
      session: {
        id: session.sessionId,
        startTime: session.startTime,
        settings: session.settings
      },
      shots: shots.slice(0, 3), // Only show first 3 shots in preview
      analytics: shareData.includeAnalytics ? generateAnalytics() : null,
      privacy: shareData.privacy,
      format: shareData.format
    };
    
    setPreviewData(preview);
    setShowPreview(true);
  };

  // Share via email
  const shareViaEmail = () => {
    if (!shareLink) return;
    
    const subject = encodeURIComponent(`GMShoot Session: ${session?.sessionId}`);
    const body = encodeURIComponent(`
Check out my shooting session:

Session ID: ${session?.sessionId}
Date: ${session?.startTime ? new Date(session.startTime).toLocaleDateString() : 'N/A'}
Total Shots: ${shots.length}
Average Score: ${generateAnalytics()?.averageScore || 'N/A'}

View the session here: ${shareLink.url}

${shareData.customMessage || ''}
    `.trim());
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Share via social media
  const shareViaSocial = (platform: 'twitter' | 'facebook') => {
    if (!shareLink) return;
    
    const text = encodeURIComponent(`Check out my shooting session on GMShoot! ${shots.length} shots, avg score: ${generateAnalytics()?.averageScore || 'N/A'}`);
    const url = encodeURIComponent(shareLink.url);
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
        break;
    }
  };

  if (!session) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No session to share</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Share Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Session
          </CardTitle>
          <CardDescription>
            Configure how you want to share your shooting session
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Share Type */}
          <div>
            <label id="share-method-label" className="text-sm font-medium mb-2 block">Share Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="radiogroup" aria-labelledby="share-method-label">
              {[
                { value: 'link', label: 'Share Link', icon: <Link className="h-4 w-4" /> },
                { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
                { value: 'file', label: 'Download', icon: <Download className="h-4 w-4" /> },
                { value: 'qr', label: 'QR Code', icon: <QrCode className="h-4 w-4" /> }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={shareData.type === option.value ? "default" : "outline"}
                  onClick={() => setShareData(prev => ({ ...prev, type: option.value as any }))}
                  className="flex items-center gap-2"
                >
                  {option.icon}
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label id="export-format-label" className="text-sm font-medium mb-2 block">Export Format</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="radiogroup" aria-labelledby="export-format-label">
              {[
                { value: 'json', label: 'JSON', icon: <FileText className="h-4 w-4" /> },
                { value: 'csv', label: 'CSV', icon: <BarChart3 className="h-4 w-4" /> },
                { value: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
                { value: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={shareData.format === option.value ? "default" : "outline"}
                  onClick={() => setShareData(prev => ({ ...prev, format: option.value as any }))}
                  className="flex items-center gap-2"
                >
                  {option.icon}
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <label id="privacy-label" className="text-sm font-medium mb-2 block">Privacy</label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="privacy-label">
              {[
                { value: 'public', label: 'Public', icon: <Globe className="h-4 w-4" />, description: 'Anyone can view' },
                { value: 'private', label: 'Private', icon: <Lock className="h-4 w-4" />, description: 'Only you can view' },
                { value: 'unlisted', label: 'Unlisted', icon: <EyeOff className="h-4 w-4" />, description: 'Only with link' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={shareData.privacy === option.value ? "default" : "outline"}
                  onClick={() => setShareData(prev => ({ ...prev, privacy: option.value as any }))}
                  className="flex flex-col items-center gap-1 p-3"
                >
                  {option.icon}
                  <span className="text-xs">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-2">
            <label htmlFor="include-analytics" className="flex items-center gap-2">
              <input
                id="include-analytics"
                type="checkbox"
                checked={shareData.includeAnalytics}
                onChange={(e) => setShareData(prev => ({ ...prev, includeAnalytics: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include analytics and statistics</span>
            </label>
            
            <label htmlFor="include-images" className="flex items-center gap-2">
              <input
                id="include-images"
                type="checkbox"
                checked={shareData.includeImages}
                onChange={(e) => setShareData(prev => ({ ...prev, includeImages: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include target images</span>
            </label>
          </div>

          {/* Custom Message */}
          <div>
            <label htmlFor="custom-message" className="text-sm font-medium mb-2 block">Custom Message (Optional)</label>
            <textarea
              id="custom-message"
              value={shareData.customMessage || ''}
              onChange={(e) => setShareData(prev => ({ ...prev, customMessage: e.target.value }))}
              placeholder="Add a personal message to share with your session..."
              className="w-full p-2 border rounded-md text-sm"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {shareData.type === 'link' && (
              <Button onClick={generateShareLink} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            )}
            
            {shareData.type === 'file' && (
              <Button onClick={downloadSessionData}>
                <Download className="h-4 w-4 mr-2" />
                Download {shareData.format.toUpperCase()}
              </Button>
            )}
            
            <Button variant="outline" onClick={generatePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Link Result */}
      {shareLink && shareData.type === 'link' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Share Link Generated
            </CardTitle>
            <CardDescription>
              Your session is ready to share
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-sm flex-1 truncate">{shareLink.url}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareLink.url)}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Expires:</span>
                <div>{shareLink.expiresAt?.toLocaleDateString()}</div>
              </div>
              <div>
                <span className="font-medium">Access Limit:</span>
                <div>{shareLink.accessCount}/{shareLink.maxAccess}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={shareViaEmail} size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              
              <Button onClick={() => shareViaSocial('twitter')} size="sm" variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              
              <Button onClick={() => shareViaSocial('facebook')} size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Facebook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Share Preview
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={previewData.privacy === 'public' ? 'success' : previewData.privacy === 'private' ? 'destructive' : 'warning'}>
                  {previewData.privacy === 'public' && <Globe className="h-3 w-3 mr-1" />}
                  {previewData.privacy === 'private' && <Lock className="h-3 w-3 mr-1" />}
                  {previewData.privacy === 'unlisted' && <EyeOff className="h-3 w-3 mr-1" />}
                  {previewData.privacy}
                </Badge>
                
                <Badge variant="outline">
                  {previewData.format.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionSharing;