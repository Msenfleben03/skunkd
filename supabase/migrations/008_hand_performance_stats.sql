-- Migration 008: Add hand-level performance tracking to stats table
-- Extends record_game_result RPC with hand performance params

ALTER TABLE public.stats
  ADD COLUMN IF NOT EXISTS total_pegging_points   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hand_points      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_crib_points      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hands_played     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_pegging           INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_hand_score        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_crib_score        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimal_discards       INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discards         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ev_deficit       REAL NOT NULL DEFAULT 0;

-- Replace record_game_result with enhanced version accepting hand performance data.
-- All new params have defaults so existing callers (without stats) still work.
CREATE OR REPLACE FUNCTION public.record_game_result(
  p_won              BOOLEAN,
  p_player_score     INT,
  p_opponent_score   INT,
  p_total_pegging    INT DEFAULT 0,
  p_total_hand       INT DEFAULT 0,
  p_total_crib       INT DEFAULT 0,
  p_hands_played     INT DEFAULT 0,
  p_best_pegging     INT DEFAULT 0,
  p_best_hand        INT DEFAULT 0,
  p_best_crib        INT DEFAULT 0,
  p_optimal_discards INT DEFAULT 0,
  p_total_discards   INT DEFAULT 0,
  p_ev_deficit       REAL DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_new_streak INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT CASE WHEN p_won THEN COALESCE(current_streak, 0) + 1 ELSE 0 END
    INTO v_new_streak
    FROM public.stats WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO public.stats (user_id, games_played, wins, losses, current_streak, best_streak,
      skunks_given, skunks_received, double_skunks_given, double_skunks_received,
      total_pegging_points, total_hand_points, total_crib_points, total_hands_played,
      best_pegging, best_hand_score, best_crib_score, optimal_discards, total_discards, total_ev_deficit)
    VALUES (v_uid, 1,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 0 ELSE 1 END,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won AND p_opponent_score < 91 THEN 1 ELSE 0 END,
      CASE WHEN NOT p_won AND p_player_score < 91 THEN 1 ELSE 0 END,
      CASE WHEN p_won AND p_opponent_score < 61 THEN 1 ELSE 0 END,
      CASE WHEN NOT p_won AND p_player_score < 61 THEN 1 ELSE 0 END,
      p_total_pegging, p_total_hand, p_total_crib, p_hands_played,
      p_best_pegging, p_best_hand, p_best_crib,
      p_optimal_discards, p_total_discards, p_ev_deficit);
    RETURN;
  END IF;

  UPDATE public.stats SET
    games_played           = games_played + 1,
    wins                   = wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    losses                 = losses + CASE WHEN p_won THEN 0 ELSE 1 END,
    current_streak         = v_new_streak,
    best_streak            = GREATEST(best_streak, v_new_streak),
    skunks_given           = skunks_given + CASE WHEN p_won AND p_opponent_score < 91 THEN 1 ELSE 0 END,
    skunks_received        = skunks_received + CASE WHEN NOT p_won AND p_player_score < 91 THEN 1 ELSE 0 END,
    double_skunks_given    = double_skunks_given + CASE WHEN p_won AND p_opponent_score < 61 THEN 1 ELSE 0 END,
    double_skunks_received = double_skunks_received + CASE WHEN NOT p_won AND p_player_score < 61 THEN 1 ELSE 0 END,
    total_pegging_points   = total_pegging_points + p_total_pegging,
    total_hand_points      = total_hand_points + p_total_hand,
    total_crib_points      = total_crib_points + p_total_crib,
    total_hands_played     = total_hands_played + p_hands_played,
    best_pegging           = GREATEST(best_pegging, p_best_pegging),
    best_hand_score        = GREATEST(best_hand_score, p_best_hand),
    best_crib_score        = GREATEST(best_crib_score, p_best_crib),
    optimal_discards       = optimal_discards + p_optimal_discards,
    total_discards         = total_discards + p_total_discards,
    total_ev_deficit       = total_ev_deficit + p_ev_deficit,
    updated_at             = NOW()
  WHERE user_id = v_uid;
END;
$$;
