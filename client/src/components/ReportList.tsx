import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
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
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  created_at: string;
}

const ReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
      } else if (data.user) {
        setUserId(data.user.id);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sessions')
          .select('id, created_at')
          .eq('user_id', userId)
          .not('performance_summary', 'is', null)
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Session History</h1>
        <p className="text-slate-300">Review your past analysis reports and track your progress over time</p>
      </div>

      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Analysis Reports</CardTitle>
          <CardDescription className="text-slate-300">
            Review your past shooting analysis sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}
          {error && (
            <Alert className="mb-4 bg-red-900/20 border-red-800 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400 py-8">
                      No reports found. Complete your first analysis to see reports here.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-slate-200">
                        {new Date(report.created_at).toLocaleString()}
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