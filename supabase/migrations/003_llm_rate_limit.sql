-- SKUNK'D Migration 003: LLM rate-limit tracking
-- Tracks per-user LLM calls to enforce hourly limits in the llm-proxy Edge Function

CREATE TABLE IF NOT EXISTS public.llm_calls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task       TEXT NOT NULL,
  called_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_calls_user_time
  ON public.llm_calls(user_id, called_at DESC);

-- RLS: users can only see their own call history
ALTER TABLE public.llm_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own llm calls"
  ON public.llm_calls FOR SELECT USING (user_id = auth.uid());

-- Cleanup: auto-delete records older than 2 hours (keep table small)
CREATE OR REPLACE FUNCTION public.cleanup_old_llm_calls()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.llm_calls WHERE called_at < NOW() - INTERVAL '2 hours';
END;
$$;
