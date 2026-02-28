import type { Card, DecisionSnapshot } from './types';
import { cardValue } from './types';
import { optimalDiscard, optimalPeggingPlay } from './optimal';
import { expectimaxPeggingPlay } from './expectimax';
import { buildSynthPeggingState } from './synth-state';

// ─── Types ──────────────────────────────────────────────────────────────

export type Severity = 'excellent' | 'minor' | 'significant' | 'major' | 'critical';
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface CoachingAnnotation {
  readonly decision: 'discard' | 'pegging_play';
  readonly actual: readonly Card[];
  readonly optimal: readonly Card[];
  readonly evActual: number;
  readonly evOptimal: number;
  readonly evl: number;          // max(0, evOptimal - evActual)
  readonly severity: Severity;
  readonly reasoning: string;
  readonly points?: number;      // pegging only — Expectimax EV for the played card (expected cumulative points incl. look-ahead)
}

export interface HandCoachingSummary {
  readonly handIndex: number;
  readonly annotations: readonly CoachingAnnotation[];
  readonly totalEVL: number;
  readonly worstDecision: CoachingAnnotation | null;
}

export interface GameCoachingSummary {
  readonly hands: readonly HandCoachingSummary[];
  readonly totalEVL: number;
  readonly averageEVLPerHand: number;
  readonly averageEVLPerDecision: number;
  readonly worstDecision: CoachingAnnotation | null;
  readonly grade: Grade;
  readonly totalDecisions: number;
  readonly excellentCount: number;
}

// ─── Severity & Grade ───────────────────────────────────────────────────

function classifySeverity(evl: number): Severity {
  if (evl < 0.1) return 'excellent';
  if (evl < 0.5) return 'minor';
  if (evl < 1.5) return 'significant';
  if (evl < 3.0) return 'major';
  return 'critical';
}

function classifyGrade(avgEVLPerDecision: number): Grade {
  if (avgEVLPerDecision < 0.1) return 'A+';
  if (avgEVLPerDecision < 0.3) return 'A';
  if (avgEVLPerDecision < 0.7) return 'B';
  if (avgEVLPerDecision < 1.5) return 'C';
  if (avgEVLPerDecision < 2.5) return 'D';
  return 'F';
}

// ─── analyzeDecision ────────────────────────────────────────────────────

/**
 * Compute coaching annotation for a single player decision.
 *
 * For discard: uses optimalDiscard (with Monte Carlo crib) to find all 15
 * options and locates the player's actual choice in that ranked list.
 *
 * For pegging: uses optimalPeggingPlay for the recommended play and compares
 * immediate points scored (Medium Effort — no look-ahead).
 */
export function analyzeDecision(snapshot: DecisionSnapshot): CoachingAnnotation {
  if (snapshot.type === 'discard') {
    return analyzeDiscard(snapshot);
  }
  return analyzePeggingPlay(snapshot);
}

function analyzeDiscard(snapshot: DecisionSnapshot): CoachingAnnotation {
  const optResult = optimalDiscard(snapshot.hand, snapshot.isDealer);

  // Find the option matching the player's actual choice
  const actualIds = new Set(snapshot.playerChoice.map(c => c.id));
  const actualOption = optResult.allOptions.find(opt => {
    const optIds = new Set(opt.discard.map(c => c.id));
    return [...actualIds].every(id => optIds.has(id));
  });

  // Fall back to last (worst) option if not found (shouldn't happen with valid data)
  const evActual = actualOption?.expectedValue
    ?? optResult.allOptions[optResult.allOptions.length - 1].expectedValue;
  const evOptimal = optResult.expectedValue;
  const evl = Math.max(0, evOptimal - evActual);

  return {
    decision: 'discard',
    actual: snapshot.playerChoice,
    optimal: optResult.discard,
    evActual,
    evOptimal,
    evl,
    severity: classifySeverity(evl),
    reasoning: optResult.reasoning,
  };
}

/**
 * Evaluate a single candidate card using Expectimax pegging look-ahead.
 *
 * Builds a synthetic GameState where the candidate is the only card in the
 * current player's hand, then runs expectimaxPeggingPlay with the configured
 * determinizations and depth. This captures both the immediate score for
 * playing the candidate AND the expected future value of the resulting position.
 */
function evalCandidateWithExpectimax(
  snapshot: DecisionSnapshot,
  candidateCard: Card,
): number {
  const count = snapshot.count ?? 0;
  if (count + cardValue(candidateCard.rank) > 31) {
    return 0;
  }

  const pile = snapshot.pile ?? [];
  const synthState = buildSynthPeggingState(snapshot.hand, pile, count, candidateCard);
  return expectimaxPeggingPlay(synthState, 20, 3);
}

function analyzePeggingPlay(snapshot: DecisionSnapshot): CoachingAnnotation {
  const pile = snapshot.pile ?? [];
  const count = snapshot.count ?? 0;

  // Get the optimal play recommendation (for the optimal card and reasoning text)
  const optResult = optimalPeggingPlay(snapshot.hand, pile, count);

  // ── Expectimax EVL ───────────────────────────────────────────────────────
  // Evaluate every candidate card in the hand using Expectimax look-ahead.
  // This captures immediate score + expected future value, replacing the
  // immediate-points-only approach.

  // Find playable cards
  const playable = snapshot.hand.filter(c => count + cardValue(c.rank) <= 31);

  // evOptimal = max Expectimax EV across all playable options
  let evOptimal = 0;
  let bestCard: Card | null = null;
  for (const card of playable) {
    const ev = evalCandidateWithExpectimax(snapshot, card);
    if (ev > evOptimal) {
      evOptimal = ev;
      bestCard = card;
    }
  }

  // evActual = Expectimax EV of the card the player actually played
  let evActual = 0;
  if (snapshot.playerChoice.length > 0) {
    const actualCard = snapshot.playerChoice[0]!;
    evActual = evalCandidateWithExpectimax(snapshot, actualCard);
  }
  // If playerChoice is empty (Go), player couldn't play — evActual stays 0

  const evl = Math.max(0, evOptimal - evActual);

  // Use the Expectimax-identified best card when it differs from optResult,
  // but fall back to optResult.card for the reasoning string (richer text)
  const optimalCard = bestCard ?? optResult.card;

  return {
    decision: 'pegging_play',
    actual: snapshot.playerChoice,
    optimal: optimalCard ? [optimalCard] : [],
    evActual,
    evOptimal,
    evl,
    severity: classifySeverity(evl),
    reasoning: optResult.reasoning,
    points: evActual,
  };
}

// ─── analyzeHand ────────────────────────────────────────────────────────

/**
 * Compute coaching summary for all decisions in a single hand.
 *
 * @param snapshots - All DecisionSnapshots from this hand (filter by handIndex)
 * @param handIndex - Which hand number (0-based)
 */
export function analyzeHand(
  snapshots: readonly DecisionSnapshot[],
  handIndex: number,
): HandCoachingSummary {
  const annotations = snapshots.map(s => analyzeDecision(s));
  const totalEVL = annotations.reduce((sum, a) => sum + a.evl, 0);

  let worstDecision: CoachingAnnotation | null = null;
  if (annotations.length > 0) {
    const worst = annotations.reduce((w, a) => a.evl > w.evl ? a : w);
    worstDecision = worst.evl > 0 ? worst : null;
  }

  return {
    handIndex,
    annotations,
    totalEVL,
    worstDecision,
  };
}

// ─── analyzeGame ────────────────────────────────────────────────────────

/**
 * Compute full coaching summary for an entire game.
 *
 * Groups decisions by handIndex, computes per-hand summaries, then aggregates
 * into game-level totals, grade, and worst decision.
 *
 * @param decisionLog - Complete GameState.decisionLog
 */
export function analyzeGame(
  decisionLog: readonly DecisionSnapshot[],
): GameCoachingSummary {
  if (decisionLog.length === 0) {
    return {
      hands: [],
      totalEVL: 0,
      averageEVLPerHand: 0,
      averageEVLPerDecision: 0,
      worstDecision: null,
      grade: 'A+',
      totalDecisions: 0,
      excellentCount: 0,
    };
  }

  // Group snapshots by handIndex
  const byHand = new Map<number, DecisionSnapshot[]>();
  for (const snap of decisionLog) {
    const arr = byHand.get(snap.handIndex) ?? [];
    arr.push(snap);
    byHand.set(snap.handIndex, arr);
  }

  // Analyze each hand (sorted by handIndex)
  const handIndices = [...byHand.keys()].sort((a, b) => a - b);
  const hands: HandCoachingSummary[] = handIndices.map(i =>
    analyzeHand(byHand.get(i)!, i),
  );

  const totalEVL = hands.reduce((sum, h) => sum + h.totalEVL, 0);
  const totalDecisions = decisionLog.length;
  const allAnnotations = hands.flatMap(h => h.annotations);
  const excellentCount = allAnnotations.filter(a => a.severity === 'excellent').length;

  const averageEVLPerHand = hands.length > 0 ? totalEVL / hands.length : 0;
  const averageEVLPerDecision = totalDecisions > 0 ? totalEVL / totalDecisions : 0;

  const worstDecision = hands
    .map(h => h.worstDecision)
    .filter((d): d is CoachingAnnotation => d !== null)
    .reduce<CoachingAnnotation | null>((worst, d) =>
      worst === null || d.evl > worst.evl ? d : worst,
    null);

  return {
    hands,
    totalEVL,
    averageEVLPerHand,
    averageEVLPerDecision,
    worstDecision,
    grade: classifyGrade(averageEVLPerDecision),
    totalDecisions,
    excellentCount,
  };
}
