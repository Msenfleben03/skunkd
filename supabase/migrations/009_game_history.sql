-- Migration 009: Add per-game score columns and game history RPC

-- Part A: Add final_score and is_winner to game_players
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS final_score INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_winner   BOOLEAN NOT NULL DEFAULT FALSE;

-- Part B: Extend record_game_result with optional game_id and final_score params.
-- Full function body reproduced from migration 008 with two new trailing params added.
CREATE OR REPLACE FUNCTION public.record_game_result(
  p_won              BOOLEAN,
  p_player_score     INT,
  p_opponent_score   INT,
  p_total_pegging    INT  DEFAULT 0,
  p_total_hand       INT  DEFAULT 0,
  p_total_crib       INT  DEFAULT 0,
  p_hands_played     INT  DEFAULT 0,
  p_best_pegging     INT  DEFAULT 0,
  p_best_hand        INT  DEFAULT 0,
  p_best_crib        INT  DEFAULT 0,
  p_optimal_discards INT  DEFAULT 0,
  p_total_discards   INT  DEFAULT 0,
  p_ev_deficit       REAL DEFAULT 0,
  p_game_id          UUID DEFAULT NULL,
  p_final_score      INT  DEFAULT 0
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

    IF p_game_id IS NOT NULL THEN
      -- Update current user's game_players row with final score.
      -- For vs-AI games this silently writes zero rows (no AI row in game_players) — intentional.
      UPDATE public.game_players
      SET
        final_score = p_final_score,
        is_winner   = p_won
      WHERE game_id = p_game_id
        AND user_id = v_uid;
    END IF;

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

  IF p_game_id IS NOT NULL THEN
    -- Update current user's game_players row with final score.
    -- For vs-AI games this silently writes zero rows (no AI row in game_players) — intentional.
    UPDATE public.game_players
    SET
      final_score = p_final_score,
      is_winner   = p_won
    WHERE game_id = p_game_id
      AND user_id = v_uid;
  END IF;
END;
$$;

-- Part C: Create get_game_history RPC
CREATE OR REPLACE FUNCTION public.get_game_history(
  p_user_id UUID,
  p_limit   INT DEFAULT 50
)
RETURNS TABLE (
  game_id          UUID,
  played_at        TIMESTAMPTZ,
  my_score         INT,
  my_winner        BOOLEAN,
  opponent_id      UUID,
  opponent_name    TEXT,
  opponent_avatar  TEXT,
  opponent_score   INT,
  opponent_is_ai   BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    g.id                            AS game_id,
    g.created_at                    AS played_at,
    me.final_score                  AS my_score,
    me.is_winner                    AS my_winner,
    opp.user_id                     AS opponent_id,
    COALESCE(u.display_name, 'AI')  AS opponent_name,
    u.avatar_url                    AS opponent_avatar,
    opp.final_score                 AS opponent_score,
    opp.is_ai                       AS opponent_is_ai
  FROM public.games g
  JOIN public.game_players me
    ON me.game_id = g.id
   AND me.user_id = p_user_id
  LEFT JOIN public.game_players opp
    ON opp.game_id = g.id
   AND opp.user_id IS DISTINCT FROM p_user_id
  LEFT JOIN public.users u
    ON u.id = opp.user_id
  WHERE g.status = 'complete'
  ORDER BY g.created_at DESC
  LIMIT p_limit;
$$;
