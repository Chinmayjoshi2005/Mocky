"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Lightbulb,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

interface PracticeQuestion {
  id: string;
  order_index: number;
  question_text: string;
  category: string;
  difficulty: string;
  competency: string;
  context_source: string;
}

interface PracticeAnswer {
  id: string;
  practice_session_id: string;
  interview_question_id: string;
  question_text: string;
  answer_text: string;
  score?: number | null;
  rating?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  model_answer?: string | null;
  evaluated: boolean;
  answered_at: string;
}

interface PracticeSession {
  id: string;
  interview_id: string;
  status: string;
  current_question_index: number;
  total_questions: number;
  overall_score?: number | null;
  questions: PracticeQuestion[];
  answers: PracticeAnswer[];
  started_at: string;
  completed_at?: string | null;
}

interface CompletionResult {
  id: string;
  interview_id: string;
  status: string;
  overall_score?: number | null;
  total_questions: number;
  answered_questions: number;
  answers: PracticeAnswer[];
  completed_at?: string | null;
}

export default function PracticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const interviewId = params?.id;

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (path: string, options: RequestInit = {}): Promise<unknown> => {
    try {
      return await apiFetch(path, options);
    } catch (err) {
      // Preserve the original return-URL redirect behaviour for the practice flow.
      if (err instanceof Error && err.message.includes("session has expired")) {
        router.push(`/auth/login?returnUrl=/interview/${interviewId}/practice`);
      }
      throw err;
    }
  }, [interviewId, router]);

  useEffect(() => {
    if (!interviewId) return;
    let cancelled = false;

    async function startSession() {
      setLoading(true);
      setError(null);
      try {
        const data = (await request("/api/practice", {
          method: "POST",
          body: JSON.stringify({ interview_id: interviewId }),
        })) as PracticeSession;
        if (!cancelled) setSession(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to start practice.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    startSession();
    return () => {
      cancelled = true;
    };
  }, [interviewId, request]);

  const currentIndex = session?.current_question_index ?? 0;
  const currentQuestion = session?.questions[currentIndex];
  const lastAnswer = session?.answers[session.answers.length - 1];
  const progress = session ? Math.min((session.answers.length / session.total_questions) * 100, 100) : 0;

  const submitAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || answerText.trim().length < 10) return;

    setSubmitting(true);
    setError(null);
    try {
      const answer = (await request(`/api/practice/${session.id}/answers`, {
        method: "POST",
        body: JSON.stringify({ answer_text: answerText.trim() }),
      })) as PracticeAnswer;
      setSession((current) =>
        current
          ? {
              ...current,
              current_question_index: current.current_question_index + 1,
              answers: [...current.answers, answer],
            }
          : current
      );
      setAnswerText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeSession = async () => {
    if (!session) return;
    setCompleting(true);
    setError(null);
    try {
      const result = (await request(`/api/practice/${session.id}/complete`, {
        method: "POST",
      })) as CompletionResult;
      setCompletion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete practice.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Preparing your practice session..." />;
  }

  if (error && !session) {
    return (
      <main className="min-h-screen bg-navy-50 px-4 py-10 sm:px-6">
        <div className="portrait-frame">
          <Link href={`/interview/${interviewId}`} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-electric-blue">
            <ArrowLeft className="h-4 w-4" /> Back to interview
          </Link>
          <Card className="border-red-200">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <CircleAlert className="h-10 w-10 text-red-500" />
              <h1 className="text-xl font-bold text-navy-900">Practice could not start</h1>
              <p className="text-sm text-navy-600">{error}</p>
              <Button onClick={() => window.location.reload()}><RotateCcw className="h-4 w-4" /> Try again</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!session) return null;

  if (completion) {
    return <CompletionView completion={completion} interviewId={interviewId} />;
  }

  const hasAnsweredCurrentQuestion = session.answers.some(
    (answer) => answer.interview_question_id === currentQuestion?.id
  );
  const finished = !currentQuestion || currentIndex >= session.total_questions;

  return (
    <main className="min-h-screen bg-navy-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="portrait-frame space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/interview/${interviewId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-electric-blue">
            <ArrowLeft className="h-4 w-4" /> Exit practice
          </Link>
          <div className="inline-flex items-center gap-2 text-sm text-navy-500"><Clock3 className="h-4 w-4" /> Text practice</div>
        </header>

        <section className="rounded-2xl bg-navy-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Feature 2C</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Practice interview</h1>
              <p className="mt-2 max-w-xl text-sm text-blue-100">Work through each selected question and get focused AI feedback after every answer.</p>
            </div>
            <div className="text-left sm:text-right"><p className="text-3xl font-bold">{Math.min(session.answers.length + (finished ? 0 : 1), session.total_questions)}<span className="text-lg text-blue-200">/{session.total_questions}</span></p><p className="text-xs text-blue-200">questions</p></div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-blue-300 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        </section>

        {error && <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {lastAnswer && !finished && !hasAnsweredCurrentQuestion && <FeedbackCard answer={lastAnswer} />}

        {finished ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-12"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h2 className="text-2xl font-bold text-navy-900">You answered every question</h2><p className="max-w-md text-sm text-navy-600">Complete the session to calculate your overall score and view your final feedback.</p><Button onClick={completeSession} loading={completing}>Finish practice <ArrowRight className="h-4 w-4" /></Button></CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="border-b border-navy-100"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-500"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-electric-blue">Question {currentIndex + 1}</span><span>{currentQuestion.category.replaceAll("_", " ")}</span><span>•</span><span>{currentQuestion.difficulty}</span></div><CardTitle className="pt-2 text-xl leading-snug sm:text-2xl">{currentQuestion.question_text}</CardTitle><p className="text-sm text-navy-500">Assessing: <strong className="text-navy-700">{currentQuestion.competency}</strong></p></CardHeader>
            <CardContent className="p-6 sm:p-8"><form onSubmit={submitAnswer} className="space-y-4"><label htmlFor="answer" className="flex items-center gap-2 text-sm font-bold text-navy-900"><MessageSquareText className="h-4 w-4 text-electric-blue" /> Your answer</label><textarea id="answer" value={answerText} onChange={(event) => setAnswerText(event.target.value)} placeholder="Structure your response with specific examples, decisions, and outcomes..." minLength={10} rows={8} disabled={submitting} className="w-full resize-y rounded-lg border border-navy-200 bg-white p-4 text-sm leading-6 text-navy-900 outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-blue-100 disabled:bg-navy-50" /><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-xs text-navy-500">Minimum 10 characters. Aim for a clear, specific response.</p><Button type="submit" disabled={answerText.trim().length < 10} loading={submitting}>Submit answer <Send className="h-4 w-4" /></Button></div></form></CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function LoadingState({ label }: { label: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-navy-50 px-6"><div className="portrait-frame flex items-center justify-center gap-3 text-sm font-semibold text-navy-600"><Loader2 className="h-5 w-5 animate-spin text-electric-blue" />{label}</div></main>;
}

function FeedbackCard({ answer }: { answer: PracticeAnswer }) {
  return <Card className="border-blue-200 bg-blue-50/50"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-electric-blue" /> AI feedback {answer.score !== null && answer.score !== undefined ? <span className="ml-auto text-2xl text-electric-blue">{answer.score}/100</span> : null}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><FeedbackBlock title="What worked" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} text={answer.strengths} /><FeedbackBlock title="Make it stronger" icon={<Lightbulb className="h-4 w-4 text-amber-600" />} text={answer.improvements} />{answer.model_answer && <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-white p-4"><p className="mb-1 text-xs font-bold uppercase tracking-wider text-electric-blue">Model answer</p><p className="text-sm leading-6 text-navy-700">{answer.model_answer}</p></div>}</CardContent></Card>;
}

function FeedbackBlock({ title, icon, text }: { title: string; icon: React.ReactNode; text?: string | null }) {
  return <div className="rounded-lg border border-navy-100 bg-white p-4"><p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-900">{icon}{title}</p><p className="text-sm leading-6 text-navy-700">{text || "Evaluation is still processing for this answer."}</p></div>;
}

function CompletionView({ completion, interviewId }: { completion: CompletionResult; interviewId: string }) {
  const score = completion.overall_score;
  return <main className="min-h-screen bg-navy-50 py-8"><div className="portrait-frame space-y-5"><Link href={`/interview/${interviewId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-electric-blue"><ArrowLeft className="h-4 w-4" /> Back to interview</Link><Card className="overflow-hidden"><div className="bg-navy-900 p-8 text-center text-white sm:p-12"><Trophy className="mx-auto mb-4 h-12 w-12 text-amber-300" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Practice complete</p><h1 className="mt-2 text-3xl font-bold">Your results are ready</h1><div className="mt-6 text-6xl font-bold text-blue-200">{score !== null && score !== undefined ? Math.round(score) : "-"}<span className="text-2xl">/100</span></div><p className="mt-2 text-sm text-blue-100">Overall score across {completion.answered_questions} of {completion.total_questions} answered questions</p></div><CardContent className="space-y-4 p-6 sm:p-8"><h2 className="text-lg font-bold text-navy-900">Review your feedback</h2>{completion.answers.map((answer, index) => <div key={answer.id} className="rounded-lg border border-navy-200 p-4"><div className="flex items-start justify-between gap-4"><p className="text-sm font-semibold text-navy-900">{index + 1}. {answer.question_text}</p>{answer.score !== null && answer.score !== undefined && <span className="shrink-0 text-sm font-bold text-electric-blue">{answer.score}/100</span>}</div><p className="mt-2 text-sm leading-6 text-navy-600">{answer.improvements || "No improvement notes were returned."}</p></div>)}<Link href={`/interview/${interviewId}`} className="inline-flex w-full"><Button className="w-full">Back to interview <ArrowRight className="h-4 w-4" /></Button></Link></CardContent></Card></div></main>;
}
