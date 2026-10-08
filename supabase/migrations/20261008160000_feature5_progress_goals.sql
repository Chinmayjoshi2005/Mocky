-- Feature 5C: Personal improvement goals

CREATE TABLE IF NOT EXISTS public.improvement_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
    target_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own improvement goals"
    ON public.improvement_goals;
CREATE POLICY "Users can view their own improvement goals"
    ON public.improvement_goals FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own improvement goals"
    ON public.improvement_goals;
CREATE POLICY "Users can insert their own improvement goals"
    ON public.improvement_goals FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own improvement goals"
    ON public.improvement_goals;
CREATE POLICY "Users can update their own improvement goals"
    ON public.improvement_goals FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own improvement goals"
    ON public.improvement_goals;
CREATE POLICY "Users can delete their own improvement goals"
    ON public.improvement_goals FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_improvement_goals_user_created
    ON public.improvement_goals(user_id, created_at DESC);

DROP TRIGGER IF EXISTS set_improvement_goals_updated_at
    ON public.improvement_goals;
CREATE TRIGGER set_improvement_goals_updated_at
    BEFORE UPDATE ON public.improvement_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
