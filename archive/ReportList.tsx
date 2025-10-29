import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';


interface Report {
  id: string;
  title: string;
  created_at: string;
  overall_accuracy: number;
  total_frames: number;
  successful_detections: number;
}

const ReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;

  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('reports')
          .select(`
            id,
            title,
            created_at,
            overall_accuracy,
            total_frames,
            successful_detections,
            analysis_sessions!inner(
              user_id
            )
          `)
          .eq('analysis_sessions.user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setReports(data || []);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [userId]);

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="bg-amber-900/20 border-amber-800 text-amber-200">
          <AlertDescription>
            You need to be authenticated to view your reports. Please sign in to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div data-testid="reports-page" className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 data-testid="page-title" className="text-3xl font-bold text-slate-100 mb-2">Session History</h1>
        <p className="text-slate-300">Review your past analysis reports and track your progress over time</p>
      </div>

      <Card data-testid="reports-list" className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Analysis Reports</CardTitle>
          <CardDescription className="text-slate-300">
            Review your past shooting analysis sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div data-testid="loading-spinner" className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}
          {error && (
            <Alert data-testid="error-message" className="mb-4 bg-red-900/20 border-red-800 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">Report Title</TableHead>
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Accuracy</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell data-testid="empty-reports-message" colSpan={4} className="text-center text-slate-400 py-8">
                      No reports found. Complete your first analysis to see reports here.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report, index) => (
                    <TableRow key={report.id}>
                      <TableCell data-testid={`report-title-${index + 1}`} className="text-slate-200 font-medium">
                        {report.title || `Analysis Report ${report.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell data-testid={`report-date-${index + 1}`} className="text-slate-200">
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`report-accuracy-${index + 1}`} className="text-slate-200">
                        <span className={`font-medium ${
                          report.overall_accuracy >= 80 ? 'text-green-400' :
                          report.overall_accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {(report.overall_accuracy * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                          <Link to={`/report/${report.id}`}>View Report</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportList;