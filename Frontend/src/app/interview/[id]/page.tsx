"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Code2,
  Layers,
  Users,
  Brain,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  SlidersHorizontal,
  RefreshCw,
  PlusCircle,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface InterviewQuestion {
  id: string;
  interview_id: string;
  order_index: number;
  question_text: string;
  category: string;
  difficulty: string;
  competency: string;
  context_source: string;
  rationale?: string;
  is_selected?: boolean;
  created_at: string;
}

interface InterviewSession {
  id: string;
  role_title: string;
  company_name?: string | null;
  seniority: string;
  status: string;
  resume_id?: string | null;
  job_description_id?: string | null;
  questions: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params?.id as string;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Accordions
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedRationales, setExpandedRationales] = useState<Record<string, boolean>>({});

  // Action status
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);
  const [editForm, setEditForm] = useState({
    question_text: "",
    category: "technical",
    difficulty: "medium",
    competency: "",
  });
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  // Add Question Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    question_text: "",
    category: "technical",
    difficulty: "medium",
    competency: "",
  });
  const [isAddingSubmitting, setIsAddingSubmitting] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!interviewId) return;
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          router.push("/auth/login?returnUrl=/interview/" + interviewId);
          return;
        }

        const res = await fetch(`${backendUrl}/api/interviews/${interviewId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 404) throw new Error("Interview session not found.");
          if (res.status === 403) throw new Error("You do not have permission to view this interview.");
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to load interview session.");
        }

        const data: InterviewSession = await res.json();
        if (!ignore) {
          setSession(data);
          const sortedQ = (data.questions || []).sort((a, b) => a.order_index - b.order_index);
          setQuestions(sortedQ);

          // Expand first question rationale by default
          if (sortedQ.length > 0) {
            setExpandedRationales({ [sortedQ[0].id]: true });
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching interview:", err);
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load interview session.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [interviewId, backendUrl, supabase, router, refreshKey]);

  // Clear notifications after 4 seconds
  useEffect(() => {
    if (actionSuccess || actionError) {
      const t = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccess, actionError]);

  const toggleRationale = (qId: string) => {
    setExpandedRationales((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const expandAllRationales = () => {
    const allExpanded: Record<string, boolean> = {};
    questions.forEach((q) => {
      allExpanded[q.id] = true;
    });
    setExpandedRationales(allExpanded);
  };

  const collapseAllRationales = () => {
    setExpandedRationales({});
  };

  // Toggle is_selected for practice
  const handleToggleSelect = async (qId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic update
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, is_selected: newVal } : q))
    );

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/questions/${qId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_selected: newVal }),
      });

      if (!res.ok) {
        throw new Error("Failed to update question selection.");
      }
    } catch {
      // Revert optimistic update
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, is_selected: currentVal } : q))
      );
      setActionError("Could not update practice selection.");
    }
  };

  // Select / Deselect All
  const handleSelectAll = async (select: boolean) => {
    setQuestions((prev) => prev.map((q) => ({ ...q, is_selected: select })));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired.");

      await Promise.all(
        questions.map((q) =>
          fetch(`${backendUrl}/api/interviews/${interviewId}/questions/${q.id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ is_selected: select }),
          })
        )
      );
      setActionSuccess(select ? "All questions selected for practice." : "All questions deselected.");
    } catch {
      setRefreshKey((k) => k + 1); // Revert on failure
      setActionError("Failed to update all selections.");
    }
  };

  // AI Re-roll / Regeneration of single question
  const handleRegenerateQuestion = async (qId: string) => {
    setRegeneratingId(qId);
    setActionError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(
        `${backendUrl}/api/interviews/${interviewId}/questions/${qId}/regenerate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to regenerate question with AI.");
      }

      const updatedQ: InterviewQuestion = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === qId ? updatedQ : q)));
      setExpandedRationales((prev) => ({ ...prev, [qId]: true }));
      setActionSuccess("Question regenerated successfully with fresh grounding!");
    } catch (err: unknown) {
      console.error("Regeneration error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to regenerate question.");
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Are you sure you want to remove this question from your interview set?")) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/questions/${qId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete question.");
      }

      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setActionSuccess("Question deleted.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete question.");
    }
  };

  // Move Question (Reorder)
  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newOrder = [...questions];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Update order_index in state
    const updatedWithOrder = newOrder.map((q, idx) => ({ ...q, order_index: idx }));
    setQuestions(updatedWithOrder);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      await fetch(`${backendUrl}/api/interviews/${interviewId}/questions/reorder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_ids: updatedWithOrder.map((q) => q.id),
        }),
      });
    } catch {
      setRefreshKey((k) => k + 1); // Revert on failure
    }
  };

  // Open Edit Modal
  const openEditModal = (q: InterviewQuestion) => {
    setEditingQuestion(q);
    setEditForm({
      question_text: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
      competency: q.competency,
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setIsEditingSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired.");

      const res = await fetch(
        `${backendUrl}/api/interviews/${interviewId}/questions/${editingQuestion.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to update question.");
      }

      const updated: InterviewQuestion = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setEditingQuestion(null);
      setActionSuccess("Question updated successfully!");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update question.");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // Save Custom Question
  const handleSaveCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired.");

      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to add custom question.");
      }

      const created: InterviewQuestion = await res.json();
      setQuestions((prev) => [...prev, created]);
      setIsAddModalOpen(false);
      setAddForm({
        question_text: "",
        category: "technical",
        difficulty: "medium",
        competency: "",
      });
      setActionSuccess("Custom question added to your interview set!");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to add custom question.");
    } finally {
      setIsAddingSubmitting(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: questions.length };
    questions.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const selectedCount = useMemo(() => {
    return questions.filter((q) => q.is_selected !== false).length;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === "all") return questions;
    return questions.filter((q) => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case "technical":
        return { label: "Technical Depth", icon: Code2, badgeClass: "bg-blue-100 text-blue-800 border-blue-200" };
      case "system_design":
        return { label: "System Design", icon: Layers, badgeClass: "bg-purple-100 text-purple-800 border-purple-200" };
      case "behavioral":
        return { label: "Behavioral (STAR)", icon: Users, badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
      case "problem_solving":
        return { label: "Problem Solving", icon: Brain, badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "General", icon: Sparkles, badgeClass: "bg-navy-100 text-navy-800 border-navy-200" };
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "hard":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-navy-50 text-navy-700 border-navy-200";
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "user":
        return { label: "Candidate Custom", class: "bg-purple-100 text-purple-800 border-purple-200" };
      case "resume":
        return { label: "Resume Grounded", class: "bg-navy-100 text-navy-700 border-navy-200" };
      case "job_description":
        return { label: "Role Required", class: "bg-indigo-100 text-indigo-700 border-indigo-200" };
      case "both":
      default:
        return { label: "Resume + Role Match", class: "bg-blue-100 text-blue-700 border-blue-200" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-50 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-navy-200">
            <Logo size="md" withText />
          </div>
          <div className="p-12 text-center bg-white rounded-xl border border-navy-200 space-y-4">
            <RefreshCw className="h-8 w-8 text-electric-blue animate-spin mx-auto" />
            <p className="text-lg font-semibold text-navy-900">Loading interview customisation hub...</p>
            <p className="text-sm text-navy-500 max-w-sm mx-auto">
              Preparing your questions, difficulty controls, and grounded rationales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-navy-50 py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-navy-200">
            <Logo size="md" withText />
          </div>
          <Card className="border-rose-200">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl text-navy-900">Unable to Load Interview</CardTitle>
              <CardDescription className="text-navy-600 mt-1">
                {error || "An error occurred while loading this interview session."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/intake")}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Return to Intake
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-navy-200">
          <div className="flex items-center gap-3">
            <Logo size="md" withText />
            <span className="hidden sm:inline-block text-navy-300">|</span>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-navy-500">
              Feature 2B: Question Customisation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/interview">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Interviews
              </Button>
            </Link>
            <Link href="/intake">
              <Button variant="outline" size="sm">
                Intake
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Toast / Feedback Alerts */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-fade-in">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Hero Header */}
        <div className="p-6 rounded-2xl bg-white border border-navy-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-electric-blue border border-blue-200">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Feature 2B: Customise & Review
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-navy-100 text-navy-800 border border-navy-200">
                  {session.seniority} Level
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {selectedCount} Active for Practice
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-electric-blue shrink-0" />
                {session.role_title}
              </h1>
              {session.company_name && (
                <p className="text-sm font-medium text-navy-600 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-navy-400" />
                  {session.company_name}
                </p>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="bg-navy-900 hover:bg-navy-800 text-white shadow-sm"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Add Question
              </Button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-navy-600 border-t border-navy-100 pt-3">
            Review and personalize your question set. Toggle questions on/off for practice, edit prompts, resequence ordering, or click <strong>Regenerate</strong> to re-roll any question with fresh AI grounding.
          </p>
        </div>

        {/* Practice Selection Bar */}
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-electric-blue shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-navy-900">{selectedCount}</span> of{" "}
              <span className="font-bold text-navy-900">{questions.length}</span> questions selected for mock practice
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="font-semibold text-electric-blue hover:underline"
            >
              Select All
            </button>
            <span className="text-navy-300">|</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="font-semibold text-navy-600 hover:text-navy-900"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Category Filters & Expand Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === "all"
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
              }`}
            >
              All ({categoryCounts.all || 0})
            </button>
            {categoryCounts.technical ? (
              <button
                type="button"
                onClick={() => setSelectedCategory("technical")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === "technical"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                Technical ({categoryCounts.technical})
              </button>
            ) : null}
            {categoryCounts.system_design ? (
              <button
                type="button"
                onClick={() => setSelectedCategory("system_design")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === "system_design"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                System Design ({categoryCounts.system_design})
              </button>
            ) : null}
            {categoryCounts.behavioral ? (
              <button
                type="button"
                onClick={() => setSelectedCategory("behavioral")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === "behavioral"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Behavioral ({categoryCounts.behavioral})
              </button>
            ) : null}
            {categoryCounts.problem_solving ? (
              <button
                type="button"
                onClick={() => setSelectedCategory("problem_solving")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === "problem_solving"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
                }`}
              >
                <Brain className="h-3.5 w-3.5" />
                Problem Solving ({categoryCounts.problem_solving})
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-navy-500">
            <button
              type="button"
              onClick={expandAllRationales}
              className="hover:text-electric-blue transition-colors font-medium"
            >
              Expand All Rationales
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAllRationales}
              className="hover:text-electric-blue transition-colors font-medium"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, index) => {
            const meta = getCategoryMeta(q.category);
            const CategoryIcon = meta.icon;
            const diffClass = getDifficultyBadge(q.difficulty);
            const sourceMeta = getSourceBadge(q.context_source);
            const isExpanded = !!expandedRationales[q.id];
            const isSelected = q.is_selected !== false;
            const isRegenerating = regeneratingId === q.id;

            return (
              <Card
                key={q.id || index}
                className={`overflow-hidden transition-all ${
                  isSelected ? "border-navy-200 hover:border-electric-blue shadow-sm" : "opacity-60 border-dashed border-navy-300 bg-navy-50/50"
                }`}
              >
                <div className="p-5 sm:p-6 space-y-3.5">
                  {/* Card Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Checkbox Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(q.id, isSelected)}
                          className="h-4 w-4 rounded border-navy-300 text-electric-blue focus:ring-electric-blue"
                        />
                        <span className="text-xs font-bold text-navy-700">
                          {isSelected ? "Active in Practice" : "Excluded"}
                        </span>
                      </label>

                      <span className="text-navy-300">•</span>
                      <span className="text-xs font-bold text-navy-400 bg-navy-100 px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}
                      >
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${diffClass}`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {/* Move Up */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => handleMoveQuestion(index, "up")}
                        title="Move question up"
                        className="h-7 w-7 p-0 text-navy-500 hover:text-navy-900"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>

                      {/* Move Down */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === questions.length - 1}
                        onClick={() => handleMoveQuestion(index, "down")}
                        title="Move question down"
                        className="h-7 w-7 p-0 text-navy-500 hover:text-navy-900"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(q)}
                        className="h-7 px-2 text-xs font-medium text-navy-700"
                      >
                        <Pencil className="h-3 w-3 mr-1 text-navy-500" />
                        Edit
                      </Button>

                      {/* Regenerate with AI */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRegenerating}
                        onClick={() => handleRegenerateQuestion(q.id)}
                        className="h-7 px-2 text-xs font-medium text-electric-blue hover:bg-blue-50 border-blue-200"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
                        {isRegenerating ? "Re-rolling..." : "Regenerate"}
                      </Button>

                      {/* Delete */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete question"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Competency Tag & Source */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-navy-600 uppercase tracking-wider">
                        Assessing:
                      </span>{" "}
                      <span className="text-xs font-bold text-navy-900 bg-navy-100/70 px-2 py-0.5 rounded">
                        {q.competency}
                      </span>
                    </div>

                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sourceMeta.class}`}>
                      {sourceMeta.label}
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <p className="text-base sm:text-lg font-semibold text-navy-900 leading-relaxed pt-1">
                    {q.question_text}
                  </p>

                  {/* Grounded Rationale Drawer */}
                  {q.rationale && (
                    <div className="pt-2 border-t border-navy-100">
                      <button
                        type="button"
                        onClick={() => toggleRationale(q.id)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-navy-600 hover:text-electric-blue transition-colors py-1"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                          Why this question was chosen
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-navy-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-navy-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs text-navy-800 leading-relaxed animate-fade-in">
                          <p className="font-medium text-amber-900 mb-1">Context Grounding Rationale:</p>
                          {q.rationale}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Practice Simulation Readiness Card (Leading into Feature 2C) */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                Interview Preparation Hub
              </span>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-electric-blue" />
                Ready to Start Practice
              </h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-400/30 self-start sm:self-auto">
              {selectedCount} Questions Prepared
            </span>
          </div>

          <p className="text-xs sm:text-sm text-navy-200 leading-relaxed">
            Your customized question set is saved and ready. In <strong>Feature 2C (Text Practice Interview)</strong>, you will practice answering these questions in an interactive, turn-by-turn mock interview simulation with real-time AI feedback.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              className="bg-electric-blue hover:bg-blue-600 text-white border-0 shadow-md font-semibold"
              disabled={selectedCount === 0}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Text Practice Interview (Feature 2C Next)
            </Button>
            <Link href="/intake">
              <Button
                variant="outline"
                className="bg-transparent hover:bg-white/10 text-white border-white/20"
              >
                Change Role or Target
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT QUESTION MODAL */}
      {/* ========================================================================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-navy-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-electric-blue" />
                Edit Interview Question
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="text-navy-400 hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                  Question Prompt Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.question_text}
                  onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 p-2.5 text-sm text-navy-900 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
                  placeholder="Enter the interview question prompt..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-lg border border-navy-300 p-2 text-sm text-navy-900 focus:border-electric-blue"
                  >
                    <option value="technical">Technical Depth</option>
                    <option value="system_design">System Design</option>
                    <option value="behavioral">Behavioral (STAR)</option>
                    <option value="problem_solving">Problem Solving</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="w-full rounded-lg border border-navy-300 p-2 text-sm text-navy-900 focus:border-electric-blue"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                  Target Competency
                </label>
                <Input
                  required
                  value={editForm.competency}
                  onChange={(e) => setEditForm({ ...editForm, competency: e.target.value })}
                  placeholder="e.g. Distributed Caching, React Performance, Conflict Resolution"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isEditingSubmitting}
                  className="bg-electric-blue hover:bg-blue-600 text-white"
                >
                  {isEditingSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD CUSTOM QUESTION MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-navy-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-electric-blue" />
                Add Custom Interview Question
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-navy-400 hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                  Question Prompt Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={addForm.question_text}
                  onChange={(e) => setAddForm({ ...addForm, question_text: e.target.value })}
                  className="w-full rounded-lg border border-navy-300 p-2.5 text-sm text-navy-900 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue"
                  placeholder="Enter a custom question you want to practice..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                    Category
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full rounded-lg border border-navy-300 p-2 text-sm text-navy-900 focus:border-electric-blue"
                  >
                    <option value="technical">Technical Depth</option>
                    <option value="system_design">System Design</option>
                    <option value="behavioral">Behavioral (STAR)</option>
                    <option value="problem_solving">Problem Solving</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={addForm.difficulty}
                    onChange={(e) => setAddForm({ ...addForm, difficulty: e.target.value })}
                    className="w-full rounded-lg border border-navy-300 p-2 text-sm text-navy-900 focus:border-electric-blue"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 mb-1">
                  Target Competency
                </label>
                <Input
                  required
                  value={addForm.competency}
                  onChange={(e) => setAddForm({ ...addForm, competency: e.target.value })}
                  placeholder="e.g. Distributed Caching, Kafka Lag, Database deadlocks"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingSubmitting}
                  className="bg-electric-blue hover:bg-blue-600 text-white"
                >
                  {isAddingSubmitting ? "Adding..." : "Add to Practice Set"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
