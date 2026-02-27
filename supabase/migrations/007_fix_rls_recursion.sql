-- SKUNK'D Migration 007: Fix RLS infinite recursion
-- The game_players SELECT policy was self-referencing, causing infinite recursion.
-- The games SELECT policy queried game_players which queried itself → same issue.
-- Fix: use a SECURITY DEFINER helper function to break the recursion chain.

-- ── Helper function (runs as definer, bypasses RLS) ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_game_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT game_id FROM public.game_players WHERE user_id = uid;
$$;

-- ── Fix game_players SELECT policy ──────────────────────────────────────────
-- Old: self-referencing subquery → infinite recursion
-- New: direct check — you can see rows for any game you're part of
DROP POLICY IF EXISTS "Participants can view game roster" ON public.game_players;
CREATE POLICY "Participants can view game roster"
  ON public.game_players FOR SELECT USING (
    game_id IN (SELECT public.get_user_game_ids(auth.uid()))
  );

-- ── Fix games SELECT policy ────────────────────────────────────────────────
-- Old: subquery on game_players triggered the recursive game_players SELECT policy
-- New: uses the security definer function to bypass RLS on the lookup
DROP POLICY IF EXISTS "Game participants can view game" ON public.games;
CREATE POLICY "Game participants can view game"
  ON public.games FOR SELECT USING (
    id IN (SELECT public.get_user_game_ids(auth.uid()))
  );

-- ── Fix games SELECT for join flow ─────────────────────────────────────────
-- Users need to SELECT a game by invite_code BEFORE they've joined it.
-- Add a policy that allows reading waiting games by invite code.
CREATE POLICY "Anyone can view waiting games"
  ON public.games FOR SELECT USING (status = 'waiting');

-- ── Fix hands SELECT policy (same recursion pattern) ────────────────────────
DROP POLICY IF EXISTS "Participants can view hands" ON public.hands;
CREATE POLICY "Participants can view hands"
  ON public.hands FOR SELECT USING (
    game_id IN (SELECT public.get_user_game_ids(auth.uid()))
  );

-- ── Fix messages SELECT policy (same pattern) ──────────────────────────────
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT USING (
    game_id IN (SELECT public.get_user_game_ids(auth.uid()))
  );

-- ── Fix messages INSERT policy (same pattern) ──────────────────────────────
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    game_id IN (SELECT public.get_user_game_ids(auth.uid()))
  );
