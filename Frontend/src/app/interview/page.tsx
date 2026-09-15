"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Briefcase,
  Building2,
  Clock,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

interface InterviewSessionSummary {
  id: string;
  role_title: string;
  company_name?: string | null;
  seniority: string;
  status: string;
  questions: Array<{ id: string; category: string }>;
  created_at: string;
}

export default function InterviewsListPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchInterviews() {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          router.push("/auth/login?returnUrl=/interview");
          return;
        }

        const res = await fetch(`${backendUrl}/api/interviews`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to load interviews.");
        }

        const data: InterviewSessionSummary[] = await res.json();
        setInterviews(data);
      } catch (err: unknown) {
        console.error("Error loading interviews:", err);
        setError(err instanceof Error ? err.message : "Failed to load interviews.");
      } finally {
        setLoading(false);
      }
    }

    fetchInterviews();
  }, [backendUrl, supabase, router]);

  return (
    <div className="min-h-screen bg-navy-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-navy-200">
          <div className="flex items-center gap-3">
            <Logo size="md" withText />
            <span className="hidden sm:inline-block text-navy-300">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-navy-500">
              My Interviews
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/intake">
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                New Interview Intake
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
            Interview Question Sets
          </h1>
          <p className="text-sm text-navy-600">
            Review and practice with questions tailored to your background and target positions.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-navy-200 space-y-3">
            <RefreshCw className="h-6 w-6 text-electric-blue animate-spin mx-auto" />
            <p className="text-sm font-medium text-navy-700">Loading interview sessions...</p>
          </div>
        ) : error ? (
          <Card className="border-rose-200">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
                <AlertCircle className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Failed to Load Interviews</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : interviews.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-navy-300 bg-white space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-electric-blue">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-navy-900">No interviews generated yet</h3>
              <p className="text-sm text-navy-600">
                Complete the intake steps to upload your resume, define your target job profile, and generate your first set of personalized questions.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/intake">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Start Intake Now
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {interviews.map((session) => (
              <Card
                key={session.id}
                className="overflow-hidden hover:border-electric-blue hover:shadow-sm transition-all"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-navy-100 text-navy-800">
                        {session.seniority} Level
                      </span>
                      <span className="text-xs text-navy-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 truncate">
                      <Briefcase className="h-4 w-4 text-electric-blue shrink-0" />
                      {session.role_title}
                    </h2>

                    {session.company_name && (
                      <p className="text-xs text-navy-500 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-navy-400" />
                        {session.company_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-navy-400">Questions</p>
                      <p className="text-base font-bold text-navy-900">{session.questions.length}</p>
                    </div>

                    <Link href={`/interview/${session.id}`}>
                      <Button size="sm">
                        View Questions
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
