import { Card, cardValue, rankOrder, ScoreBreakdown } from './types';

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      result.push([arr[i], ...rest]);
    }
  }
  return result;
}

function isConsecutive(sorted: number[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

function scoreFifteens(cards: Card[]): number {
  let count = 0;
  for (let k = 2; k <= cards.length; k++) {
    for (const combo of combinations(cards, k)) {
      if (combo.reduce((s, c) => s + cardValue(c), 0) === 15) count++;
    }
  }
  return count * 2;
}

function scorePairs(cards: Card[]): number {
  let count = 0;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) count++;
    }
  }
  return count * 2;
}

function scoreRuns(cards: Card[]): number {
  for (let len = cards.length; len >= 3; len--) {
    let total = 0;
    for (const combo of combinations(cards, len)) {
      const orders = combo.map(c => rankOrder(c)).sort((a, b) => a - b);
      if (isConsecutive(orders)) total += len;
    }
    if (total > 0) return total;
  }
  return 0;
}

function scoreFlush(hand: Card[], starter: Card, isCrib: boolean): number {
  const suit = hand[0].suit;
  const allSame = hand.every(c => c.suit === suit);
  if (!allSame) return 0;
  if (isCrib) return starter.suit === suit ? 5 : 0;
  return starter.suit === suit ? 5 : 4;
}

function scoreNobs(hand: Card[], starter: Card): number {
  return hand.some(c => c.rank === 'J' && c.suit === starter.suit) ? 1 : 0;
}

export function scoreHand(hand: Card[], starter: Card, isCrib: boolean): ScoreBreakdown {
  const all = [...hand, starter];
  const fifteens = scoreFifteens(all);
  const pairs = scorePairs(all);
  const runs = scoreRuns(all);
  const flush = scoreFlush(hand, starter, isCrib);
  const nobs = scoreNobs(hand, starter);
  return { total: fifteens + pairs + runs + flush + nobs, fifteens, pairs, runs, flush, nobs };
}

export function scorePeggingPlay(sequence: Card[], count: number): { points: number; desc: string[] } {
  if (sequence.length === 0) return { points: 0, desc: [] };
  let points = 0;
  const desc: string[] = [];

  if (count === 15) { points += 2; desc.push('15 for 2'); }
  if (count === 31) { points += 2; desc.push('31 for 2'); }

  // Pairs: check consecutive same rank from end
  const last = sequence[sequence.length - 1];
  let pairCount = 0;
  for (let i = sequence.length - 2; i >= 0; i--) {
    if (sequence[i].rank === last.rank) pairCount++;
    else break;
  }
  if (pairCount === 1) { points += 2; desc.push('Pair for 2'); }
  else if (pairCount === 2) { points += 6; desc.push('Three of a kind for 6'); }
  else if (pairCount === 3) { points += 12; desc.push('Four of a kind for 12'); }

  // Runs: check last N cards
  if (pairCount === 0 && sequence.length >= 3) {
    for (let len = Math.min(sequence.length, 7); len >= 3; len--) {
      const lastN = sequence.slice(-len);
      const orders = lastN.map(c => rankOrder(c)).sort((a, b) => a - b);
      if (isConsecutive(orders)) {
        points += len;
        desc.push(`Run of ${len} for ${len}`);
        break;
      }
    }
  }

  return { points, desc };
}

// Quick hand score without starter (for AI evaluation)
export function quickScore(hand: Card[]): number {
  return scoreFifteens(hand) + scorePairs(hand) + scoreRuns(hand);
}
