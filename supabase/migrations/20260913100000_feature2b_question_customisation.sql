-- Feature 2B: Question Review & Customisation Schema Migration
-- Version-controlled migration for Mocky

-- 1. Add is_selected column to interview_questions for practice toggling
ALTER TABLE public.interview_questions
  ADD COLUMN IF NOT EXISTS is_selected BOOLEAN NOT NULL DEFAULT true;

-- 2. Update context_source check constraint to allow 'user' authored questions
ALTER TABLE public.interview_questions
  DROP CONSTRAINT IF EXISTS interview_questions_context_source_check;

ALTER TABLE public.interview_questions
  ADD CONSTRAINT interview_questions_context_source_check
  CHECK (context_source IN ('resume', 'job_description', 'both', 'user'));

-- 3. Create index for fast practice set querying
CREATE INDEX IF NOT EXISTS idx_interview_questions_selected
  ON public.interview_questions(interview_id, is_selected);
