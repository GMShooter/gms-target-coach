import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
// import { Progress } from "./ui/progress";

interface ReportData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  summary?: string;
  overall_accuracy: number;
  total_frames: number;
  successful_detections: number;
  report_data?: any;
  share_token?: string;
  is_public: boolean;
}

const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [progress, setProgress] = useState(13);

  // useEffect(() => {
  //   const timer = setTimeout(() => setProgress(66), 500);
  //   return () => clearTimeout(timer);
  // }, []);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('reports')
          .select('*')
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

    if (id) {
      fetchReport();
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
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

  // Extract data from report_data JSON if available
  const reportData = report.report_data || {};
  const strengths = reportData.strengths || [];
  const areasForImprovement = reportData.areas_for_improvement || [];
  const coachingAdvice = reportData.coaching_advice || 'No advice available.';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                {report.title || 'Shooting Analysis Report'}
              </h1>
              <div className="text-sm text-slate-300">
                Report ID: {report.id} <br />
                Date: {new Date(report.created_at).toLocaleString()}
              </div>
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
                <h2 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                  Performance Summary
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  {report.summary || 'No summary available.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Overall Accuracy</p>
                    <p className={`text-2xl font-bold ${
                      report.overall_accuracy >= 0.8 ? 'text-green-400' :
                      report.overall_accuracy >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(report.overall_accuracy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Detection Rate</p>
                    <p className="text-2xl font-bold text-slate-200">
                      {report.total_frames > 0 ?
                        ((report.successful_detections / report.total_frames) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-600 bg-slate-900">
              <CardHeader>
                <h2 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                  Coaching Advice
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  {coachingAdvice}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <h3 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                    Strengths
                  </h3>
                </CardHeader>
                <CardContent>
                  {strengths.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {strengths.map((item: string, index: number) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-400">None identified.</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <h3 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                    Areas for Improvement
                  </h3>
                </CardHeader>
                <CardContent>
                  {areasForImprovement.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {areasForImprovement.map((item: string, index: number) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-400">None identified.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-slate-600 bg-slate-900">
              <CardHeader>
                <h2 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                  Session Statistics
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Frames</span>
                  <span className="text-slate-200 font-medium">{report.total_frames}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Successful Detections</span>
                  <span className="text-slate-200 font-medium">{report.successful_detections}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Detection Rate</span>
                  <span className="text-slate-200 font-medium">
                    {report.total_frames > 0 ?
                      ((report.successful_detections / report.total_frames) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-slate-200 font-medium">
                    {new Date(report.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {reportData.sample_frames && reportData.sample_frames.length > 0 && (
              <Card className="border-slate-600 bg-slate-900">
                <CardHeader>
                  <h2 className="text-2xl font-semibold leading-none tracking-tight text-slate-100">
                    Sample Frames
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {reportData.sample_frames.slice(0, 4).map((frame: any, index: number) => (
                      <img
                        key={index}
                        src={frame.url}
                        alt={`Sample frame ${index + 1}`}
                        className="w-full h-auto rounded-lg"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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