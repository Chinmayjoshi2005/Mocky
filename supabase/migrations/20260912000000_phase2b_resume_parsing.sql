-- Phase 2B: Resume Parsing Schema Update
-- Version-controlled migration for Mocky

-- Add columns for extracted text, parsing error details, and parsed timestamp
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS parsed_text TEXT,
  ADD COLUMN IF NOT EXISTS parsing_error TEXT,
  ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ;

-- Update status check constraint to include 'parsing' and 'parsed'
ALTER TABLE public.resumes
  DROP CONSTRAINT IF EXISTS resumes_status_check;

ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_status_check
  CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed'));
