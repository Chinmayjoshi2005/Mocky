-- Feature 2A: Personalised Question Generation Schema Migration
-- Version-controlled migration for Mocky

-- ==============================================================================
-- 1. Interviews Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
    role_title TEXT NOT NULL,
    company_name TEXT,
    seniority TEXT NOT NULL CHECK (seniority IN ('Intern', 'Junior', 'Mid', 'Senior')),
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed', 'in_progress', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Interviews Table RLS Policies (strictly scoped to auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view their own interviews" ON public.interviews;
CREATE POLICY "Users can view their own interviews"
ON public.interviews FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interviews" ON public.interviews;
CREATE POLICY "Users can insert their own interviews"
ON public.interviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interviews" ON public.interviews;
CREATE POLICY "Users can update their own interviews"
ON public.interviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interviews" ON public.interviews;
CREATE POLICY "Users can delete their own interviews"
ON public.interviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON public.interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_resume_id ON public.interviews(resume_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON public.interviews(job_description_id);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_interviews_updated_at ON public.interviews;
CREATE TRIGGER set_interviews_updated_at
    BEFORE UPDATE ON public.interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 2. Interview Questions Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    question_text TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'system_design', 'behavioral', 'problem_solving', 'experience')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    competency TEXT NOT NULL,
    context_source TEXT NOT NULL CHECK (context_source IN ('resume', 'job_description', 'both')),
    rationale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Interview Questions Table RLS Policies (strictly scoped to auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view their own interview questions" ON public.interview_questions;
CREATE POLICY "Users can view their own interview questions"
ON public.interview_questions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interview questions" ON public.interview_questions;
CREATE POLICY "Users can insert their own interview questions"
ON public.interview_questions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interview questions" ON public.interview_questions;
CREATE POLICY "Users can update their own interview questions"
ON public.interview_questions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interview questions" ON public.interview_questions;
CREATE POLICY "Users can delete their own interview questions"
ON public.interview_questions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON public.interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_user_id ON public.interview_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_order ON public.interview_questions(interview_id, order_index ASC);
