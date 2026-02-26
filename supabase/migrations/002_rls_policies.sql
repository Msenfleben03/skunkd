-- SKUNK'D RLS Policies
-- Migration 002: Row Level Security
-- Card security model: players NEVER see opponent hands until Show phase

-- ── Enable RLS on all tables ──────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── Users ─────────────────────────────────────────────────────────────────────
-- Users can read any profile (display names are public)
CREATE POLICY "Profiles are publicly readable"
  ON public.users FOR SELECT USING (TRUE);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (id = auth.uid());

-- ── Games ─────────────────────────────────────────────────────────────────────
-- Games are visible to all players in that game
CREATE POLICY "Game participants can view game"
  ON public.games FOR SELECT USING (
    id IN (
      SELECT game_id FROM public.game_players WHERE user_id = auth.uid()
    )
  );

-- Games can be created by any authenticated user
CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only the creator can update (status changes, etc.)
CREATE POLICY "Creator can update game"
  ON public.games FOR UPDATE USING (created_by = auth.uid());

-- ── Game Players ──────────────────────────────────────────────────────────────
-- All participants in a game can see who else is in it
CREATE POLICY "Participants can view game roster"
  ON public.game_players FOR SELECT USING (
    game_id IN (
      SELECT game_id FROM public.game_players WHERE user_id = auth.uid()
    )
  );

-- Players can join a game (insert themselves)
CREATE POLICY "Players can join games"
  ON public.game_players FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Hands ─────────────────────────────────────────────────────────────────────
-- Participants can view hands for their games
CREATE POLICY "Participants can view hands"
  ON public.hands FOR SELECT USING (
    game_id IN (
      SELECT game_id FROM public.game_players WHERE user_id = auth.uid()
    )
  );

-- ── Hand Cards ────────────────────────────────────────────────────────────────
-- SECURITY CRITICAL: Players ONLY see their OWN cards
-- Opponent hands are revealed server-side during Show phase via Edge Function
-- This prevents any client-side enumeration of opponent cards
CREATE POLICY "Players see only own hand cards"
  ON public.hand_cards FOR SELECT USING (user_id = auth.uid());

-- Only the deal-hand Edge Function (service role) inserts cards
-- Client cannot insert hand cards directly
-- (INSERT policy intentionally omitted — use service role in Edge Function)

-- Players can update their own card destinations (discard to crib, play in pegging)
CREATE POLICY "Players can move own cards"
  ON public.hand_cards FOR UPDATE USING (user_id = auth.uid());

-- ── Scores ────────────────────────────────────────────────────────────────────
-- All participants can see all scores in the game (scores are public knowledge)
CREATE POLICY "Participants can view scores"
  ON public.scores FOR SELECT USING (
    hand_id IN (
      SELECT h.id FROM public.hands h
      JOIN public.game_players gp ON gp.game_id = h.game_id
      WHERE gp.user_id = auth.uid()
    )
  );

-- ── Decisions ─────────────────────────────────────────────────────────────────
-- Users can see only their own decisions (coaching is private)
CREATE POLICY "Users see own decisions"
  ON public.decisions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own decisions"
  ON public.decisions FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Stats ─────────────────────────────────────────────────────────────────────
-- Stats are publicly readable (leaderboard support)
CREATE POLICY "Stats are publicly readable"
  ON public.stats FOR SELECT USING (TRUE);

-- Users can only update their own stats
CREATE POLICY "Users manage own stats"
  ON public.stats FOR UPDATE USING (user_id = auth.uid());

-- ── Messages ──────────────────────────────────────────────────────────────────
-- All game participants can read messages in their game
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT USING (
    game_id IN (
      SELECT game_id FROM public.game_players WHERE user_id = auth.uid()
    )
  );

-- Participants can send messages in their games
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    game_id IN (
      SELECT game_id FROM public.game_players WHERE user_id = auth.uid()
    )
  );
