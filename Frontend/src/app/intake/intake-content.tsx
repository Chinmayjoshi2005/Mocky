"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  FileCheck2,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { getBackendUrl } from "@/lib/api";
import { CandidateProfileView } from "@/components/intake/CandidateProfileView";
import type {
  SeniorityLevel,
  ResumeRecord,
  JobDescriptionRecord,
  JobDescriptionFormData,
  ParseResumeResponse,
  IntakeStep,
  ResumeAnalysisRecord,
  ResumeAnalysisResponse,
} from "@/types/intake";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const SENIORITY_LEVELS: SeniorityLevel[] = ["Intern", "Junior", "Mid", "Senior"];

interface IntakeContentProps {
  user: {
    id: string;
    email?: string;
  };
}

export function IntakeContent({ user }: IntakeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Navigation / step state
  const initialStepParam = searchParams.get("step");
  const parsedStep =
    initialStepParam === "2" ? 2 : initialStepParam === "3" ? 3 : 1;
  const [currentStep, setCurrentStep] = useState<IntakeStep>(parsedStep as IntakeStep);

  // Existing records from database
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existingResume, setExistingResume] = useState<ResumeRecord | null>(null);
  const [existingJob, setExistingJob] = useState<JobDescriptionRecord | null>(null);

  // Step 1: Resume Upload & Parsing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [parseStage, setParseStage] = useState<"idle" | "uploading" | "parsing" | "parsed" | "failed">("idle");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccessMessage, setResumeSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature 1C: Candidate Profile Analysis state
  const [existingAnalysis, setExistingAnalysis] = useState<ResumeAnalysisRecord | null>(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Feature 2A: Interview Question Generation state
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<number>(1);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Step 2: Job Description state
  const [formData, setFormData] = useState<JobDescriptionFormData>({
    role_title: "",
    company_name: "",
    seniority: "Mid",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobDescriptionFormData, string>>>({});
  const [savingJob, setSavingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  // Global notification banner
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Calculate word count from text
  const calculateWordCount = (text?: string | null): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  };

  // Fetch initial records on mount
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [resumesRes, jdRes] = await Promise.all([
          supabase
            .from("resumes")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("job_descriptions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (ignore) return;

        if (resumesRes.data) {
          const resRecord = resumesRes.data as ResumeRecord;
          if (resRecord.parsed_text && !resRecord.word_count) {
            resRecord.word_count = calculateWordCount(resRecord.parsed_text);
          }
          setExistingResume(resRecord);

          // Fetch candidate profile analysis if table has been migrated
          try {
            const { data: analysisData } = await supabase
              .from("resume_analyses")
              .select("*")
              .eq("resume_id", resRecord.id)
              .maybeSingle();

            if (analysisData && !ignore) {
              setExistingAnalysis(analysisData as ResumeAnalysisRecord);
            }
          } catch (aErr) {
            console.debug("Resume analysis not yet created or table pending migration:", aErr);
          }
        }

        if (jdRes.data) {
          const jd = jdRes.data as JobDescriptionRecord;
          setExistingJob(jd);
          setFormData({
            role_title: jd.role_title,
            company_name: jd.company_name || "",
            seniority: jd.seniority,
            description: jd.description,
          });
        }

        // If user came with no step specified and already has parsed resume and job, show success/ready
        if (!initialStepParam && resumesRes.data && jdRes.data && resumesRes.data.status === "parsed") {
          setCurrentStep(3);
        }
      } catch (err) {
        console.error("Error fetching intake data:", err);
      } finally {
        if (!ignore) {
          setLoadingExisting(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase, user.id, initialStepParam]);

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Validate file selection
  const validateFile = (file: File): string | null => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return "Only PDF documents are supported. Please upload a .pdf file.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 10MB.`;
    }

    return null;
  };

  // Handle file selection from picker or drop
  const handleFileSelection = (file: File) => {
    setResumeError(null);
    setResumeSuccessMessage(null);
    setParseStage("idle");
    const error = validateFile(file);
    if (error) {
      setResumeError(error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResumeError(null);
    setUploadProgress(0);
    setParseStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger server-side parsing of an existing resume record
  const triggerParseResume = async (resumeRecord: ResumeRecord): Promise<boolean> => {
    setParsingResume(true);
    setParseStage("parsing");
    setResumeError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      const response = await fetch(`${getBackendUrl()}/api/resumes/${resumeRecord.id}/parse`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        let errorDetail = "Failed to extract text from resume.";
        if (errJson) {
          if (typeof errJson.detail === "string") {
            errorDetail = errJson.detail;
          } else if (errJson.detail?.parsing_error) {
            errorDetail = errJson.detail.parsing_error;
          } else if (errJson.parsing_error) {
            errorDetail = errJson.parsing_error;
          }
        }

        const failedRecord: ResumeRecord = {
          ...resumeRecord,
          status: "failed",
          parsing_error: errorDetail,
        };
        setExistingResume(failedRecord);
        setParseStage("failed");
        setResumeError(errorDetail);
        return false;
      }

      const parseResult: ParseResumeResponse = await response.json();

      const updatedRecord: ResumeRecord = {
        ...resumeRecord,
        status: "parsed",
        word_count: parseResult.word_count,
        parsed_at: parseResult.parsed_at,
        parsing_error: null,
      };

      setExistingResume(updatedRecord);
      setParseStage("parsed");
      setResumeSuccessMessage(
        `Resume verified and parsed successfully (~${parseResult.word_count} words extracted).`
      );
      return true;
    } catch (err: unknown) {
      console.error("Resume parsing error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to parse resume text. Please retry.";
      setResumeError(message);
      setParseStage("failed");
      if (existingResume) {
        setExistingResume({
          ...existingResume,
          status: "failed",
          parsing_error: message,
        });
      }
      return false;
    } finally {
      setParsingResume(false);
    }
  };

  // Feature 1C: Trigger server-side resume understanding analysis via Groq
  const triggerAnalyzeResume = async (
    resumeRecord: ResumeRecord,
    forceReanalyze = false
  ): Promise<boolean> => {
    setAnalyzingResume(true);
    setAnalysisError(null);
    setResumeSuccessMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      const response = await fetch(
        `${getBackendUrl()}/api/resumes/${resumeRecord.id}/analyze?reanalyze=${forceReanalyze}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        let errorDetail = "Failed to extract candidate profile from resume.";
        if (errJson && typeof errJson.detail === "string") {
          errorDetail = errJson.detail;
        }

        setAnalysisError(errorDetail);
        if (existingAnalysis) {
          setExistingAnalysis({
            ...existingAnalysis,
            status: "failed",
            error: errorDetail,
          });
        }
        return false;
      }

      const analysisResult: ResumeAnalysisResponse = await response.json();

      const updatedAnalysis: ResumeAnalysisRecord = {
        id: analysisResult.id,
        resume_id: analysisResult.resume_id,
        user_id: user.id,
        status: analysisResult.status,
        summary: analysisResult.profile?.summary || null,
        skills: analysisResult.profile?.skills || {
          programming_languages: [],
          frameworks_tools: [],
          databases_cloud: [],
          other: [],
        },
        experience: analysisResult.profile?.experience || [],
        education: analysisResult.profile?.education || [],
        projects: analysisResult.profile?.projects || [],
        error: analysisResult.error,
        analysis_version: analysisResult.analysis_version,
        created_at: analysisResult.created_at,
        updated_at: analysisResult.updated_at,
      };

      setExistingAnalysis(updatedAnalysis);
      setResumeSuccessMessage("Candidate profile understood and extracted successfully!");
      return true;
    } catch (err: unknown) {
      console.error("Resume analysis error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to analyze resume. Please try again.";
      setAnalysisError(message);
      return false;
    } finally {
      setAnalyzingResume(false);
    }
  };

  // Feature 2A: Trigger personalised interview question generation via Groq
  const triggerGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    setGenerationError(null);
    setGenerationPhase(1);

    const phaseTimer1 = setTimeout(() => setGenerationPhase(2), 1800);
    const phaseTimer2 = setTimeout(() => setGenerationPhase(3), 4500);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      const res = await fetch(`${getBackendUrl()}/api/interviews/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_id: existingResume?.id,
          job_description_id: existingJob?.id,
          num_questions: 6,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to generate interview questions.");
      }

      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err: unknown) {
      console.error("Question generation error:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate interview questions. Please try again."
      );
      setGeneratingQuestions(false);
    } finally {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
    }
  };

  // Upload Resume to Supabase Storage and create database record, then parse
  const handleUploadAndParseResume = async () => {
    if (uploadingResume || parsingResume) return;

    if (!selectedFile) {
      // If user already has an existing parsed resume and didn't select a new one, proceed to step 2
      if (existingResume && existingResume.status === "parsed") {
        setCurrentStep(2);
        return;
      }
      if (existingResume && existingResume.status === "failed") {
        // Retry parsing existing
        await triggerParseResume(existingResume);
        return;
      }
      setResumeError("Please choose a PDF resume to upload.");
      return;
    }

    setUploadingResume(true);
    setParseStage("uploading");
    setResumeError(null);
    setResumeSuccessMessage(null);
    setUploadProgress(20);

    let createdRecord: ResumeRecord | null = null;

    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}_${sanitizedName}`;

      setUploadProgress(50);

      // 1. Upload to Supabase Storage 'resumes' bucket
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, selectedFile, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) {
        throw new Error(
          storageError.message.includes("Bucket not found")
            ? "Storage bucket not yet provisioned. Please apply the migration first."
            : storageError.message
        );
      }

      setUploadProgress(85);

      // 2. Insert record into resumes table
      const { data: dbData, error: dbError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          original_filename: selectedFile.name,
          mime_type: selectedFile.type || "application/pdf",
          size_bytes: selectedFile.size,
          status: "uploaded",
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(
          dbError.message.includes('relation "public.resumes" does not exist')
            ? "Database schema not yet applied. Please run the Supabase migration."
            : dbError.message
        );
      }

      setUploadProgress(100);
      createdRecord = dbData as ResumeRecord;
      setExistingResume(createdRecord);
      setSelectedFile(null);
    } catch (err: unknown) {
      console.error("Resume upload error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to upload resume. Please try again.";
      setResumeError(message);
      setParseStage("failed");
      setUploadProgress(0);
      setUploadingResume(false);
      return;
    } finally {
      setUploadingResume(false);
    }

    // 3. Immediately trigger server-side parsing
    if (createdRecord) {
      await triggerParseResume(createdRecord);
    }
  };

  // Job Description form validation
  const validateJobForm = (): boolean => {
    const errors: Partial<Record<keyof JobDescriptionFormData, string>> = {};

    if (!formData.role_title.trim()) {
      errors.role_title = "Role title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Job description is required";
    } else if (formData.description.trim().length < 30) {
      errors.description =
        "Please provide a more detailed job description (at least 30 characters).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Job Description to database
  const handleSaveJobDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingJob) return;
    setJobError(null);

    if (!validateJobForm()) {
      return;
    }

    setSavingJob(true);

    try {
      const { data, error } = await supabase
        .from("job_descriptions")
        .insert({
          user_id: user.id,
          role_title: formData.role_title.trim(),
          company_name: formData.company_name?.trim() || null,
          seniority: formData.seniority,
          description: formData.description.trim(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          error.message.includes('relation "public.job_descriptions" does not exist')
            ? "Database schema not yet applied. Please run the Supabase migration."
            : error.message
        );
      }

      setExistingJob(data as JobDescriptionRecord);
      setCurrentStep(3);
    } catch (err: unknown) {
      console.error("Job description save error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save job description. Please try again.";
      setJobError(message);
    } finally {
      setSavingJob(false);
    }
  };

  const isResumeReady = existingResume && existingResume.status === "parsed";

  // Render Stepper Header
  const renderStepper = () => (
    <nav aria-label="Intake progress" className="mb-8">
      <ol className="flex items-center justify-between w-full max-w-2xl mx-auto">
        <li className="flex-1 flex items-center">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            aria-current={currentStep === 1 ? "step" : undefined}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                currentStep === 1
                  ? "bg-electric-blue text-white ring-4 ring-blue-100"
                  : isResumeReady || currentStep > 1
                  ? "bg-green-600 text-white"
                  : "bg-navy-200 text-navy-600 group-hover:bg-navy-300"
              }`}
            >
              {isResumeReady || currentStep > 1 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                "1"
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep === 1 ? "text-navy-900 font-semibold" : "text-navy-500"
              }`}
            >
              Resume Upload
            </span>
          </button>
          <div
            className={`flex-1 h-0.5 mx-4 transition-colors ${
              isResumeReady || currentStep > 1 ? "bg-green-500" : "bg-navy-200"
            }`}
            aria-hidden="true"
          />
        </li>

        <li className="flex-1 flex items-center">
          <button
            type="button"
            onClick={() => {
              if (isResumeReady || selectedFile) setCurrentStep(2);
            }}
            disabled={!isResumeReady && !selectedFile}
            className={`flex items-center gap-2 group focus:outline-none ${
              !isResumeReady && !selectedFile
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
            aria-current={currentStep === 2 ? "step" : undefined}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                currentStep === 2
                  ? "bg-electric-blue text-white ring-4 ring-blue-100"
                  : existingJob || currentStep > 2
                  ? "bg-green-600 text-white"
                  : "bg-navy-200 text-navy-600 group-hover:bg-navy-300"
              }`}
            >
              {existingJob || currentStep > 2 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                "2"
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep === 2 ? "text-navy-900 font-semibold" : "text-navy-500"
              }`}
            >
              Target Job
            </span>
          </button>
          <div
            className={`flex-1 h-0.5 mx-4 transition-colors ${
              existingJob || currentStep > 2 ? "bg-green-500" : "bg-navy-200"
            }`}
            aria-hidden="true"
          />
        </li>

        <li className="flex items-center">
          <div
            className="flex items-center gap-2"
            aria-current={currentStep === 3 ? "step" : undefined}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                currentStep === 3
                  ? "bg-green-600 text-white ring-4 ring-green-100"
                  : "bg-navy-200 text-navy-600"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep === 3 ? "text-navy-900 font-semibold" : "text-navy-500"
              }`}
            >
              Ready
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );

  return (
    <div className="portrait-frame py-6 animate-slide-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-navy-200">
        <div>
          <Logo size="md" withText />
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
            Interview Context Intake
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Upload your resume and target job profile to establish your private interview foundation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <LayoutDashboard className="h-4 w-4 mr-2 text-navy-500" />
            Dashboard
          </Button>
        </div>
      </div>

      {infoBanner && (
        <div
          className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm flex items-start gap-3"
          role="status"
        >
          <Sparkles className="h-5 w-5 text-electric-blue shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{infoBanner}</p>
          </div>
          <button
            onClick={() => setInfoBanner(null)}
            className="text-navy-400 hover:text-navy-700 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state while checking database */}
      {loadingExisting ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-8 w-8 text-electric-blue animate-spin mb-3" />
            <p className="text-sm text-navy-600 font-medium">
              Loading your interview profile...
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress Stepper */}
          {renderStepper()}

          {/* ========================================================================= */}
          {/* STEP 1: RESUME UPLOAD & PARSE */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-electric-blue">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Step 1: Upload Your Resume</CardTitle>
                      <CardDescription>
                        Provide your latest resume as a PDF. Only text-based PDF files up to 10MB are accepted.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Empty State Banner if no prior upload */}
                {!existingResume && !selectedFile && (
                  <div className="p-4 rounded-lg bg-navy-50 border border-navy-200/80 text-sm text-navy-700 flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-electric-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-navy-900">
                        No resume uploaded yet
                      </p>
                      <p className="text-navy-500 text-xs mt-1 leading-relaxed">
                        Upload your PDF resume to ground interview questions in your real-world experience and background.
                      </p>
                    </div>
                  </div>
                )}

                {/* Existing Parsed Resume Active Card / Candidate Profile */}
                {existingResume && !selectedFile && existingResume.status === "parsed" && (
                  <div className="space-y-4">
                    {/* Analyzing Loading State */}
                    {analyzingResume && (
                      <div
                        className="p-6 rounded-xl border border-blue-200 bg-blue-50/70 flex flex-col items-center justify-center text-center space-y-3 animate-pulse"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-electric-blue">
                          <RotateCw className="h-6 w-6 animate-spin" />
                        </div>
                        <div>
                          <h4 className="font-bold text-navy-900 text-sm sm:text-base">
                            Analyzing resume: extracting competencies, experience, and structured profile...
                          </h4>
                          <p className="text-xs text-navy-600 mt-1 max-w-md">
                            Using Groq AI server-side to extract grounded skills, work history, and education without speculation.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Analysis Failure State */}
                    {!analyzingResume && (analysisError || (existingAnalysis && existingAnalysis.status === "failed")) && (
                      <div className="p-4 rounded-lg border border-red-200 bg-red-50/70 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-red-900 text-sm">
                                Resume Understanding Notice
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-200 text-red-800">
                                Extraction Issue
                              </span>
                            </div>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                              {analysisError || existingAnalysis?.error || "Unable to extract structured profile from this resume."}
                            </p>
                            <p className="text-xs text-navy-500 mt-1">
                              File: {existingResume.original_filename} ({formatFileSize(existingResume.size_bytes)})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-red-200/60 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Replace File
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => triggerAnalyzeResume(existingResume, true)}
                            loading={analyzingResume}
                          >
                            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                            Retry Analysis
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Candidate Profile Ready State */}
                    {!analyzingResume && !analysisError && existingAnalysis && existingAnalysis.status === "ready" && (
                      <div className="space-y-4">
                        <div className="p-3.5 rounded-lg border border-navy-200 bg-navy-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-200 text-navy-700">
                              <FileCheck2 className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-navy-900 text-sm truncate max-w-xs sm:max-w-md">
                                  {existingResume.original_filename}
                                </p>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-200 text-green-800">
                                  Parsed PDF
                                </span>
                              </div>
                              <p className="text-xs text-navy-500 mt-0.5">
                                {formatFileSize(existingResume.size_bytes)}
                                {existingResume.word_count ? ` • ~${existingResume.word_count} words extracted` : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Replace Resume
                          </Button>
                        </div>

                        <CandidateProfileView
                          profile={{
                            summary: existingAnalysis.summary,
                            skills: existingAnalysis.skills,
                            experience: existingAnalysis.experience || [],
                            education: existingAnalysis.education || [],
                            projects: existingAnalysis.projects || [],
                          }}
                          onReanalyze={() => triggerAnalyzeResume(existingResume, true)}
                          onReplace={() => fileInputRef.current?.click()}
                          onContinue={() => setCurrentStep(2)}
                          isReanalyzing={analyzingResume}
                        />
                      </div>
                    )}

                    {/* Parsed but not yet analyzed State */}
                    {!analyzingResume && !analysisError && (!existingAnalysis || existingAnalysis.status === "analyzing") && (
                      <div className="p-4 rounded-lg border border-green-200 bg-green-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 text-green-700">
                            <FileCheck2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-navy-900 truncate max-w-xs sm:max-w-md">
                                {existingResume.original_filename}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-green-200 text-green-800">
                                Parsed & Ready
                              </span>
                            </div>
                            <p className="text-xs text-navy-500 mt-0.5">
                              {formatFileSize(existingResume.size_bytes)}
                              {existingResume.word_count
                                ? ` • ~${existingResume.word_count} words extracted`
                                : ""}
                              {" • Uploaded on "}
                              {new Date(existingResume.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Replace
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => triggerAnalyzeResume(existingResume)}
                            loading={analyzingResume}
                            className="bg-electric-blue hover:bg-blue-600 text-white"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Analyse Resume
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentStep(2)}
                            className="text-navy-600"
                          >
                            Skip to Job
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing Failed Resume Card */}
                {existingResume && !selectedFile && existingResume.status === "failed" && (
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50/60 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-red-900 text-sm">
                            Resume Preparation Failed
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-200 text-red-800">
                            Failed
                          </span>
                        </div>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                          {existingResume.parsing_error ||
                            "Could not extract text from this document. Please ensure it is an unlocked, text-based PDF."}
                        </p>
                        <p className="text-xs text-navy-500 mt-1">
                          File: {existingResume.original_filename} ({formatFileSize(existingResume.size_bytes)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-red-200/60 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace File
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => triggerParseResume(existingResume)}
                        loading={parsingResume}
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Retry Parsing
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing Uploaded but Unparsed Resume Card */}
                {existingResume && !selectedFile && existingResume.status === "uploaded" && (
                  <div className="p-4 rounded-lg border border-navy-200 bg-navy-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-200 text-navy-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-navy-900 truncate max-w-xs sm:max-w-md">
                            {existingResume.original_filename}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-navy-200 text-navy-800">
                            Needs Preparation
                          </span>
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">
                          {formatFileSize(existingResume.size_bytes)} • Uploaded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => triggerParseResume(existingResume)}
                        loading={parsingResume}
                      >
                        Prepare Resume
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {resumeError && (
                  <div
                    className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fade-in"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                    <div className="flex-1">
                      <p className="font-medium">Preparation Notice</p>
                      <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{resumeError}</p>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {resumeSuccessMessage && (
                  <div
                    className="p-3.5 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-start gap-2.5 animate-fade-in"
                    role="status"
                  >
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                    <span>{resumeSuccessMessage}</span>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={uploadingResume || parsingResume}
                  aria-label="Upload PDF resume file"
                />

                {/* Drag and Drop Zone (or selected file display) */}
                {!selectedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-electric-blue focus:ring-offset-2 ${
                      dragOver
                        ? "border-electric-blue bg-blue-50/60 scale-[0.99]"
                        : "border-navy-200 hover:border-navy-400 bg-white hover:bg-navy-50/30"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-electric-blue">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">
                          Click to select a file{" "}
                          <span className="font-normal text-navy-500">
                            or drag and drop
                          </span>
                        </p>
                        <p className="text-xs text-navy-400 mt-1">
                          Text-based PDF only • Maximum file size 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-navy-200 bg-navy-50/40 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-navy-900 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-navy-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!uploadingResume && !parsingResume && (
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1.5 rounded-md text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove selected file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress States: Uploading or Preparing */}
                    {(uploadingResume || parsingResume) && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-navy-600">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-electric-blue" />
                            {parseStage === "uploading"
                              ? "Uploading PDF to your private room..."
                              : "Preparing resume: extracting and verifying text..."}
                          </span>
                          <span className="font-semibold">
                            {parseStage === "uploading" ? `${uploadProgress}%` : "Processing"}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-navy-200 rounded-full overflow-hidden">
                          {parseStage === "uploading" ? (
                            <div
                              className="h-full bg-electric-blue transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          ) : (
                            <div className="h-full bg-electric-blue animate-pulse w-full" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1 Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-navy-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Back to Dashboard
                  </Button>

                  <Button
                    type="button"
                    onClick={handleUploadAndParseResume}
                    loading={uploadingResume || parsingResume}
                    disabled={uploadingResume || parsingResume || (!selectedFile && !isResumeReady)}
                  >
                    {uploadingResume
                      ? "Uploading Resume..."
                      : parsingResume
                      ? "Preparing Resume..."
                      : selectedFile
                      ? "Upload & Prepare Resume"
                      : "Continue to Target Job"}
                    {!uploadingResume && !parsingResume && <ArrowRight className="h-4 w-4 ml-1.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: JOB DESCRIPTION */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-electric-blue">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Step 2: Add Target-Job Details</CardTitle>
                    <CardDescription>
                      Specify the target role details and paste the full job description.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSaveJobDescription} className="space-y-5" noValidate>
                  {/* Empty state tip */}
                  {!existingJob && (
                    <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-200/80 text-xs text-navy-600 flex items-start gap-2.5">
                      <Building2 className="h-4 w-4 text-electric-blue mt-0.5 shrink-0" />
                      <span>
                        Provide the job posting details so your interview questions align directly with required competencies, stack, and seniority expectations.
                      </span>
                    </div>
                  )}

                  {/* Error Banner */}
                  {jobError && (
                    <div
                      className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fade-in"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                      <div className="flex-1">
                        <p className="font-medium">Error saving job details</p>
                        <p className="text-xs text-red-600 mt-0.5">{jobError}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Role Title (Required) */}
                    <Input
                      label="Role Title *"
                      id="role_title"
                      name="role_title"
                      value={formData.role_title}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, role_title: e.target.value }));
                        if (formErrors.role_title) {
                          setFormErrors((prev) => ({ ...prev, role_title: undefined }));
                        }
                      }}
                      placeholder="e.g. Senior Frontend Engineer"
                      error={formErrors.role_title}
                      disabled={savingJob}
                      startIcon={<Briefcase className="h-4 w-4" />}
                    />

                    {/* Company Name (Optional) */}
                    <Input
                      label="Company Name (Optional)"
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                      }
                      placeholder="e.g. Stripe, Acme Corp"
                      disabled={savingJob}
                      startIcon={<Building2 className="h-4 w-4" />}
                    />
                  </div>

                  {/* Seniority Level */}
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-2">
                      Seniority Level *
                    </label>
                    <div
                      role="radiogroup"
                      aria-label="Seniority Level"
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
                    >
                      {SENIORITY_LEVELS.map((level) => {
                        const isSelected = formData.seniority === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, seniority: level }))
                            }
                            disabled={savingJob}
                            className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-electric-blue ${
                              isSelected
                                ? "border-electric-blue bg-blue-50/70 text-electric-blue font-semibold shadow-xs"
                                : "border-navy-200 bg-white text-navy-700 hover:border-navy-300 hover:bg-navy-50/50"
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full Job Description (Required) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="job-description-textarea"
                        className="block text-sm font-medium text-navy-900"
                      >
                        Full Job Description *
                      </label>
                      <span className="text-xs text-navy-400">
                        {formData.description.length} characters
                      </span>
                    </div>
                    <textarea
                      id="job-description-textarea"
                      name="description"
                      rows={8}
                      value={formData.description}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, description: e.target.value }));
                        if (formErrors.description) {
                          setFormErrors((prev) => ({ ...prev, description: undefined }));
                        }
                      }}
                      placeholder="Paste the complete job description, responsibilities, qualifications, and requirements..."
                      aria-invalid={formErrors.description ? "true" : "false"}
                      aria-describedby={
                        formErrors.description ? "job-description-error" : undefined
                      }
                      disabled={savingJob}
                      className={`w-full rounded-md border p-3 text-sm text-navy-900 placeholder:text-navy-400 transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent ${
                        formErrors.description
                          ? "border-red-500 focus:ring-red-500 bg-red-50/20"
                          : "border-navy-200 bg-white hover:border-navy-300"
                      }`}
                    />
                    {formErrors.description && (
                      <p
                        id="job-description-error"
                        role="alert"
                        className="mt-1.5 text-sm text-red-600"
                      >
                        {formErrors.description}
                      </p>
                    )}
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-navy-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      disabled={savingJob}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back to Resume
                    </Button>

                    <Button type="submit" loading={savingJob} disabled={savingJob}>
                      {savingJob ? "Saving Profile..." : "Save & Complete Intake"}
                      {!savingJob && <ArrowRight className="h-4 w-4 ml-1.5" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUCCESS & CONTEXT READY */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <Card className="animate-fade-in border-green-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold text-navy-900">
                  Your interview context is ready.
                </CardTitle>
                <CardDescription className="text-base text-navy-600 max-w-lg mx-auto mt-1">
                  Your resume has been parsed, understood, and your job requirements securely saved to your private room.
                </CardDescription>

                {/* Pipeline Flow Indicator */}
                <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-navy-50 border border-navy-200 text-xs font-medium text-navy-700 mx-auto">
                  <span className="text-green-700 font-semibold">Resume uploaded</span>
                  <span className="text-navy-300">→</span>
                  <span className="text-green-700 font-semibold">Parsed</span>
                  <span className="text-navy-300">→</span>
                  <span className={`font-semibold ${existingAnalysis?.status === "ready" ? "text-green-700" : "text-navy-500"}`}>
                    Understood
                  </span>
                  <span className="text-navy-300">→</span>
                  <span className="text-green-700 font-semibold">Target job saved</span>
                  <span className="text-navy-300">→</span>
                  <span className="text-electric-blue font-bold">Ready</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Summary Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Saved Resume Summary */}
                  <div className="p-4 rounded-lg border border-navy-200 bg-navy-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                        Uploaded Resume
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        existingAnalysis?.status === "ready"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {existingAnalysis?.status === "ready" ? "Understood & Ready" : "Parsed PDF"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <FileCheck2 className="h-5 w-5 text-electric-blue shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy-900 truncate">
                          {existingResume?.original_filename || "Resume Document"}
                        </p>
                        <p className="text-xs text-navy-500 mt-0.5">
                          {existingResume?.size_bytes
                            ? formatFileSize(existingResume.size_bytes)
                            : "Verified file"}
                          {existingResume?.word_count
                            ? ` • ~${existingResume.word_count} words extracted`
                            : ""}
                          {existingAnalysis?.status === "ready" ? " • Profile understood" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saved Job Summary */}
                  <div className="p-4 rounded-lg border border-navy-200 bg-navy-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                        Target Job Profile
                      </span>
                      <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {existingJob?.seniority || formData.seniority}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Briefcase className="h-5 w-5 text-electric-blue shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy-900 truncate">
                          {existingJob?.role_title || formData.role_title}
                        </p>
                        <p className="text-xs text-navy-500 mt-0.5 truncate">
                          {existingJob?.company_name || formData.company_name || "Company Unspecified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 2A: Personalised Question Generation */}
                <div className="p-5 sm:p-6 rounded-xl border border-electric-blue/30 bg-blue-50/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-navy-900 font-bold text-base">
                      <Sparkles className="h-5 w-5 text-electric-blue" />
                      <span>Feature 2A: Personalised Question Generation</span>
                    </div>
                    <span className="text-xs font-semibold text-electric-blue bg-white border border-blue-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      Ready to Generate
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                    Mocky will analyze your verified profile alongside this target role to synthesize grounded, seniority-calibrated interview questions covering technical depth, system design, and behavioral competencies.
                  </p>

                  {/* Generation Error Alert */}
                  {generationError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fade-in">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">Question Generation Failed</p>
                        <p className="mt-0.5">{generationError}</p>
                      </div>
                    </div>
                  )}

                  {/* Active Generation State */}
                  {generatingQuestions ? (
                    <div className="p-4 rounded-lg bg-white border border-electric-blue/30 space-y-3 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-electric-blue animate-spin shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-navy-900">
                            {generationPhase === 1 && "1/3: Reading candidate profile & role requirements..."}
                            {generationPhase === 2 && "2/3: Synthesizing role-aligned questions via Groq..."}
                            {generationPhase >= 3 && "3/3: Finalizing grounded questions for your room..."}
                          </p>
                          <p className="text-xs text-navy-500 mt-0.5">
                            Calibrating difficulty and extracting grounded rationales.
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-navy-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-electric-blue h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: generationPhase === 1 ? "35%" : generationPhase === 2 ? "70%" : "95%",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Button
                        onClick={triggerGenerateQuestions}
                        className="w-full sm:w-auto bg-electric-blue hover:bg-blue-600 text-white shadow-md font-semibold"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Tailored Questions
                      </Button>
                      <Link href="/interview">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto text-xs"
                        >
                          View Past Interviews
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Final Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-navy-200">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto"
                    >
                      Edit Resume
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(2)}
                      className="w-full sm:w-auto"
                    >
                      Edit Job Details
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="w-full sm:w-auto"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
