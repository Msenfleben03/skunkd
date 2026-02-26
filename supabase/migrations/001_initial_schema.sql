-- SKUNK'D Initial Schema
-- Migration 001: Core tables

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────────────────────
-- Mirrors Supabase auth.users; stores game-specific profile data
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT 'Player',
  avatar_url    TEXT,
  cribbage_grade TEXT NOT NULL DEFAULT 'F',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Games ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode        TEXT NOT NULL CHECK (mode IN ('vs_ai', 'vs_human')),
  status      TEXT NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'active', 'complete', 'abandoned')),
  created_by  UUID NOT NULL REFERENCES public.users(id),
  invite_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6)),
  is_async    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Game Players ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_players (
  game_id   UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id),
  seat      INT NOT NULL CHECK (seat IN (0, 1)),   -- 0 = first dealer
  is_dealer BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai     BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (game_id, user_id)
);

-- ── Hands ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hands (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  hand_number    INT NOT NULL,
  dealer_user_id UUID REFERENCES public.users(id),
  starter_card   JSONB,                        -- {rank, suit} — set after cut
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, hand_number)
);

-- ── Hand Cards ────────────────────────────────────────────────────────────────
-- Security-critical: destination controls visibility
-- 'hand' = kept in hand, 'crib' = discarded to crib, 'pegging' = played during pegging
CREATE TABLE IF NOT EXISTS public.hand_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id     UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id),
  card        JSONB NOT NULL,                  -- {rank, suit}
  destination TEXT NOT NULL DEFAULT 'hand'
              CHECK (destination IN ('hand', 'crib', 'pegging')),
  play_order  INT                              -- set when played during pegging
);

-- ── Scores ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id        UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id),
  source         TEXT NOT NULL CHECK (source IN ('pegging', 'hand', 'crib', 'heels')),
  points         INT NOT NULL DEFAULT 0,
  breakdown_json JSONB,                        -- ScoreBreakdown from engine
  scored_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Decisions ─────────────────────────────────────────────────────────────────
-- Feeds coaching engine and Cribbage Grade computation
CREATE TABLE IF NOT EXISTS public.decisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id        UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id),
  phase          TEXT NOT NULL CHECK (phase IN ('discard', 'pegging')),
  action         JSONB NOT NULL,               -- card(s) played/discarded
  was_optimal    BOOLEAN,
  optimal_action JSONB,                        -- what engine recommends
  ev_delta       NUMERIC(6,3),                 -- EV loss vs optimal
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stats ─────────────────────────────────────────────────────────────────────
-- Denormalized for fast profile reads; updated via trigger after each game
CREATE TABLE IF NOT EXISTS public.stats (
  user_id               UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  games_played          INT NOT NULL DEFAULT 0,
  wins                  INT NOT NULL DEFAULT 0,
  losses                INT NOT NULL DEFAULT 0,
  skunks_given          INT NOT NULL DEFAULT 0,
  skunks_received       INT NOT NULL DEFAULT 0,
  double_skunks_given   INT NOT NULL DEFAULT 0,
  double_skunks_received INT NOT NULL DEFAULT 0,
  highest_hand          INT NOT NULL DEFAULT 0,
  best_streak           INT NOT NULL DEFAULT 0,
  current_streak        INT NOT NULL DEFAULT 0,
  avg_cribbage_grade    NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create stats row when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_user_created_stats
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id),
  content         TEXT NOT NULL,
  is_ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_hands_game_id ON public.hands(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_cards_hand_id ON public.hand_cards(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_cards_user_id ON public.hand_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_hand_id ON public.scores(hand_id);
CREATE INDEX IF NOT EXISTS idx_decisions_hand_id ON public.decisions(hand_id);
CREATE INDEX IF NOT EXISTS idx_messages_game_id ON public.messages(game_id);

-- Enable Realtime for live game updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hand_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
