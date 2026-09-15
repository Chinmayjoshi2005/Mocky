-- Phase 2A: Resume and Job Description Intake Schema
-- Version-controlled migration for Mocky

-- ==============================================================================
-- 1. Storage Bucket Configuration (resumes)
-- ==============================================================================

-- Create the private 'resumes' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- Storage RLS: Users can only manage files in their own folder (folder name matching user ID)
DROP POLICY IF EXISTS "Users can view their own resumes in storage" ON storage.objects;
CREATE POLICY "Users can view their own resumes in storage"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload their own resumes in storage" ON storage.objects;
CREATE POLICY "Users can upload their own resumes in storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own resumes in storage" ON storage.objects;
CREATE POLICY "Users can update their own resumes in storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own resumes in storage" ON storage.objects;
CREATE POLICY "Users can delete their own resumes in storage"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);


-- ==============================================================================
-- 2. Resumes Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Resumes Table RLS Policies (strictly scoped to auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;
CREATE POLICY "Users can view their own resumes"
ON public.resumes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resumes" ON public.resumes;
CREATE POLICY "Users can insert their own resumes"
ON public.resumes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;
CREATE POLICY "Users can update their own resumes"
ON public.resumes FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resumes" ON public.resumes;
CREATE POLICY "Users can delete their own resumes"
ON public.resumes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON public.resumes(created_at DESC);


-- ==============================================================================
-- 3. Job Descriptions Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_title TEXT NOT NULL,
    company_name TEXT,
    seniority TEXT NOT NULL CHECK (seniority IN ('Intern', 'Junior', 'Mid', 'Senior')),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;

-- Job Descriptions Table RLS Policies (strictly scoped to auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view their own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can view their own job descriptions"
ON public.job_descriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can insert their own job descriptions"
ON public.job_descriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can update their own job descriptions"
ON public.job_descriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own job descriptions" ON public.job_descriptions;
CREATE POLICY "Users can delete their own job descriptions"
ON public.job_descriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON public.job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON public.job_descriptions(created_at DESC);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_descriptions_updated_at ON public.job_descriptions;
CREATE TRIGGER set_job_descriptions_updated_at
    BEFORE UPDATE ON public.job_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
