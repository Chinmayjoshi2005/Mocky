"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Circle, Clock3, Target, Trash2, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { apiFetch } from "@/lib/api";

interface PracticeHistoryItem {
  id: string;
  interview_id: string;
  role_title: string;
  company_name: string | null;
  status: string;
  overall_score: number | null;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
}

interface ProgressSummary {
  total_interviews: number;
  total_practice_sessions: number;
  completed_practice_sessions: number;
  average_score: number | null;
  recent_sessions: PracticeHistoryItem[];
}

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchProgress = async () => {
      try {
        const [progressData, goalData] = await Promise.all([
          apiFetch("/api/progress"),
          apiFetch("/api/goals"),
        ]);
        if (active) {
          setSummary(progressData as ProgressSummary);
          setGoals(goalData as Goal[]);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load your progress.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void fetchProgress();
    return () => {
      active = false;
    };
  }, []);

  const createGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingGoal(true);
    setError(null);
    try {
      const goal = (await apiFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          target_date: targetDate || null,
        }),
      })) as Goal;
      setGoals((current) => [goal, ...current]);
      setTitle("");
      setTargetDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create this goal.");
    } finally {
      setSavingGoal(false);
    }
  };

  const toggleGoal = async (goal: Goal) => {
    setUpdatingGoalId(goal.id);
    setError(null);
    try {
      const updated = (await apiFetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_completed: !goal.is_completed }),
      })) as Goal;
      setGoals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this goal.");
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const deleteGoal = async (goalId: string) => {
    setUpdatingGoalId(goalId);
    setError(null);
    try {
      await apiFetch(`/api/goals/${goalId}`, { method: "DELETE" });
      setGoals((current) => current.filter((goal) => goal.id !== goalId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this goal.");
    } finally {
      setUpdatingGoalId(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50 py-6">
      <main className="portrait-frame space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-200 pb-5">
          <div className="flex items-center gap-3">
            <Logo size="md" withText />
            <span className="hidden text-navy-300 sm:inline">|</span>
            <h1 className="hidden text-xs font-semibold uppercase tracking-wider text-navy-500 sm:block">
              Progress &amp; Goals
            </h1>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
          </Link>
        </header>

        <section className="space-y-1">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Your progress</h2>
          <p className="text-sm text-navy-600">
            Review your practice history and keep track of what you want to improve.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="rounded-xl border border-navy-200 bg-white p-8 text-center text-sm text-navy-600" role="status">
            Loading your progress...
          </p>
        ) : summary ? (
          <>
            <section className="grid gap-4 sm:grid-cols-3" aria-label="Progress summary">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Interview sets</CardDescription>
                  <CardTitle className="text-3xl">{summary.total_interviews}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Completed practices</CardDescription>
                  <CardTitle className="text-3xl">{summary.completed_practice_sessions}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Average practice score</CardDescription>
                  <CardTitle className="text-3xl">
                    {summary.average_score === null ? "—" : `${Math.round(summary.average_score)}%`}
                  </CardTitle>
                </CardHeader>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="h-5 w-5 text-electric-blue" aria-hidden="true" />
                  Recent practice
                </CardTitle>
                <CardDescription>
                  {summary.total_practice_sessions} practice session
                  {summary.total_practice_sessions === 1 ? "" : "s"} in total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary.recent_sessions.length === 0 ? (
                  <p className="text-sm text-navy-600">
                    Your completed and in-progress sessions will show here after your first practice.
                  </p>
                ) : (
                  <ul className="divide-y divide-navy-100">
                    {summary.recent_sessions.map((session) => (
                      <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <Link
                            href={`/interview/${session.interview_id}`}
                            className="font-semibold text-navy-900 hover:text-electric-blue"
                          >
                            {session.role_title}
                          </Link>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                            {session.company_name && <span>{session.company_name}</span>}
                            <span>
                              {session.answered_questions}/{session.total_questions} answered
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" aria-hidden="true" />
                              {new Date(session.started_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-navy-700">
                            {session.status.replace(/_/g, " ")}
                          </span>
                          {session.overall_score !== null && (
                            <span className="min-w-12 text-right font-bold text-navy-900">
                              {Math.round(session.overall_score)}%
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-electric-blue" aria-hidden="true" />
                  Improvement goals
                </CardTitle>
                <CardDescription>Choose a specific skill or habit to work on next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form onSubmit={createGoal} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <Input
                    label="Goal"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    minLength={2}
                    maxLength={160}
                    placeholder="e.g. Practise explaining system design trade-offs"
                    required
                  />
                  <Input
                    label="Target date (optional)"
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                  />
                  <Button type="submit" loading={savingGoal} disabled={savingGoal || title.trim().length < 2}>
                    Add goal
                  </Button>
                </form>

                {goals.length === 0 ? (
                  <p className="text-sm text-navy-600">No goals yet. Add one above to make your next step concrete.</p>
                ) : (
                  <ul className="space-y-2">
                    {goals.map((goal) => (
                      <li
                        key={goal.id}
                        className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white/70 p-3"
                      >
                        <button
                          type="button"
                          className="shrink-0 rounded-full text-electric-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue disabled:opacity-50"
                          onClick={() => void toggleGoal(goal)}
                          disabled={updatingGoalId === goal.id}
                          aria-label={goal.is_completed ? `Reopen goal: ${goal.title}` : `Complete goal: ${goal.title}`}
                        >
                          {goal.is_completed ? (
                            <Check className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <Circle className="h-5 w-5" aria-hidden="true" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${goal.is_completed ? "text-navy-400 line-through" : "text-navy-900"}`}>
                            {goal.title}
                          </p>
                          {goal.target_date && (
                            <p className="mt-0.5 text-xs text-navy-500">Target: {goal.target_date}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void deleteGoal(goal.id)}
                          disabled={updatingGoalId === goal.id}
                          aria-label={`Delete goal: ${goal.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
