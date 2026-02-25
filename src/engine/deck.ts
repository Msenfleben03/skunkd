import type { Card } from './types';
import { RANKS, SUITS, createCard } from './types';

/** Create a standard 52-card deck in order. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle(cards: readonly Card[]): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Deal cards alternately to players. Returns hands and remaining deck. */
export function deal(
  deck: readonly Card[],
  playerCount: number,
  cardsPerPlayer: number,
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const totalCards = playerCount * cardsPerPlayer;

  for (let i = 0; i < totalCards; i++) {
    hands[i % playerCount].push(deck[i]);
  }

  return { hands, remaining: deck.slice(totalCards) as Card[] };
}
