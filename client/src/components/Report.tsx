import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Progress } from "./ui/progress";

interface ReportData {
  id: string;
  created_at: string;
  performance_summary?: string;
  strengths?: string;
  areas_for_improvement?: string;
  coaching_advice?: string;
  target_image_url?: string;
}

const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(13);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sessions')
          .select('id, created_at, performance_summary, strengths, areas_for_improvement, coaching_advice, target_image_url')
          .eq('id', id)
          .single();

        if (error) throw error;
        setReport(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="bg-amber-900/20 border-amber-800 text-amber-200">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The requested report could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Safely split strings that might be null or undefined
  const strengths = report.strengths?.split(', ') || [];
  const areasForImprovement = report.areas_for_improvement?.split(', ') || [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-slate-100">Shooting Session Report</CardTitle>
              <CardDescription className="text-slate-300">
                Session ID: {report.id} <br />
                Date: {new Date(report.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Link to="/reports"><ArrowLeft className="mr-2 h-4 w-4" />Back to Reports</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="border-slate-600 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-100">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  {report.performance_summary || 'No summary available.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-600 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-100">Coaching Advice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  {report.coaching_advice || 'No advice available.'}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-100">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  {strengths.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-400">None identified.</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-100">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  {areasForImprovement.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {areasForImprovement.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-400">None identified.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            {report.target_image_url && (
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-100">Target Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={report.target_image_url} 
                    alt="Target with shot placements" 
                    className="w-full h-auto rounded-lg"
                  />
                </CardContent>
              </Card>
            )}
            <Card className="border-slate-600 bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-100">Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-slate-400 text-sm mt-2">Analysis completion: {progress}%</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="text-center text-xs text-slate-500 border-t border-slate-700">
          Generated by GMShoot AI Analysis
        </CardFooter>
      </Card>
    </div>
  );
};

export default Report;