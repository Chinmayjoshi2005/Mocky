-- Feature 1C: Resume Understanding Schema Migration
-- Version-controlled migration for Mocky

-- ==============================================================================
-- 1. Resume Analyses Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL UNIQUE REFERENCES public.resumes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'ready', 'failed')),
    summary TEXT,
    skills JSONB NOT NULL DEFAULT '{"programming_languages": [], "frameworks_tools": [], "databases_cloud": [], "other": []}'::jsonb,
    experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    error TEXT,
    analysis_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- Resume Analyses Table RLS Policies (strictly scoped to auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can view their own resume analyses"
ON public.resume_analyses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can insert their own resume analyses"
ON public.resume_analyses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can update their own resume analyses"
ON public.resume_analyses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can delete their own resume analyses"
ON public.resume_analyses FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON public.resume_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON public.resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created_at ON public.resume_analyses(created_at DESC);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_resume_analyses_updated_at ON public.resume_analyses;
CREATE TRIGGER set_resume_analyses_updated_at
    BEFORE UPDATE ON public.resume_analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
