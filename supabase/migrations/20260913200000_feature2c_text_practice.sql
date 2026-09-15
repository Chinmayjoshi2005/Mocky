-- Feature 2C: Text Practice Interview Schema Migration
-- Version-controlled migration for Mocky

-- ==============================================================================
-- 1. Practice Sessions Table
-- Tracks one mock interview run (candidate selects an interview, starts practicing)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    -- Snapshot of which question IDs were active when session started (ordered)
    question_ids JSONB NOT NULL DEFAULT '[]',
    -- Index into question_ids: which question is currently being answered
    current_question_index INT NOT NULL DEFAULT 0,
    -- Aggregate score across all evaluated answers (0-100)
    overall_score NUMERIC(5, 2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can view their own practice sessions"
ON public.practice_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can insert their own practice sessions"
ON public.practice_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can update their own practice sessions"
ON public.practice_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can delete their own practice sessions"
ON public.practice_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id
    ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_interview_id
    ON public.practice_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status
    ON public.practice_sessions(user_id, status);

DROP TRIGGER IF EXISTS set_practice_sessions_updated_at ON public.practice_sessions;
CREATE TRIGGER set_practice_sessions_updated_at
    BEFORE UPDATE ON public.practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 2. Practice Answers Table
-- One row per question answered in a practice session, including AI evaluation
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.practice_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interview_question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
    -- Snapshot of the question at time of answer (in case it is edited later)
    question_text TEXT NOT NULL,
    -- Candidate's typed answer
    answer_text TEXT NOT NULL,
    -- AI evaluation results
    score INT CHECK (score >= 0 AND score <= 100),
    -- Rubric: Literal['poor', 'fair', 'good', 'excellent']
    rating TEXT CHECK (rating IN ('poor', 'fair', 'good', 'excellent')),
    -- Structured feedback fields
    strengths TEXT,
    improvements TEXT,
    model_answer TEXT,
    -- Full raw feedback blob for extensibility
    feedback_json JSONB,
    -- Whether AI evaluation completed
    evaluated BOOLEAN NOT NULL DEFAULT false,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own practice answers" ON public.practice_answers;
CREATE POLICY "Users can view their own practice answers"
ON public.practice_answers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own practice answers" ON public.practice_answers;
CREATE POLICY "Users can insert their own practice answers"
ON public.practice_answers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own practice answers" ON public.practice_answers;
CREATE POLICY "Users can update their own practice answers"
ON public.practice_answers FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_practice_answers_session_id
    ON public.practice_answers(practice_session_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_user_id
    ON public.practice_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id
    ON public.practice_answers(interview_question_id);
