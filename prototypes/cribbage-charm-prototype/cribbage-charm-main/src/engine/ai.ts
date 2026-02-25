import { Card, cardValue, rankOrder } from './types';
import { quickScore } from './scoring';

function estimateCribValue(cards: Card[]): number {
  let v = 0;
  if (cardValue(cards[0]) + cardValue(cards[1]) === 15) v += 2;
  if (cards[0].rank === cards[1].rank) v += 2;
  if (cardValue(cards[0]) === 5) v += 1;
  if (cardValue(cards[1]) === 5) v += 1;
  if (Math.abs(rankOrder(cards[0]) - rankOrder(cards[1])) <= 2) v += 1;
  return v;
}

export function aiSelectDiscard(hand: Card[], isDealer: boolean): [string, string] {
  let bestScore = -Infinity;
  let bestPair: [number, number] = [0, 1];

  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const kept = hand.filter((_, idx) => idx !== i && idx !== j);
      const discarded = [hand[i], hand[j]];
      let score = quickScore(kept);
      const cribVal = estimateCribValue(discarded);
      score += isDealer ? cribVal * 0.6 : -cribVal * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestPair = [i, j];
      }
    }
  }
  return [hand[bestPair[0]].id, hand[bestPair[1]].id];
}

export function aiSelectPlay(cards: Card[], count: number, sequence: Card[]): Card | null {
  const playable = cards.filter(c => cardValue(c) + count <= 31);
  if (playable.length === 0) return null;

  // Make 31
  const m31 = playable.find(c => cardValue(c) + count === 31);
  if (m31) return m31;

  // Make 15
  const m15 = playable.find(c => cardValue(c) + count === 15);
  if (m15) return m15;

  // Try pair
  if (sequence.length > 0) {
    const lastRank = sequence[sequence.length - 1].rank;
    const pair = playable.find(c => c.rank === lastRank);
    if (pair) return pair;
  }

  // Avoid count 5 or 21
  const safe = playable.filter(c => {
    const nc = cardValue(c) + count;
    return nc !== 5 && nc !== 21;
  });

  if (safe.length > 0) {
    return safe.sort((a, b) => cardValue(a) - cardValue(b))[0];
  }

  return playable.sort((a, b) => cardValue(a) - cardValue(b))[0];
}
