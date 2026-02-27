// Task 6.2: LLM-powered score explanation inline in Show scoring
import { useState } from 'react';
import { callLLM } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import type { Card, ScoreBreakdown } from '@/engine/types';

interface ScoreExplanationProps {
  label: string;
  cards: readonly Card[];
  starter: Card;
  scoring: ScoreBreakdown;
  className?: string;
}

export function ScoreExplanation({ label, cards, starter, scoring, className }: ScoreExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  const handleExplain = async () => {
    if (used) return;
    setLoading(true);
    setError(null);
    try {
      const { text } = await callLLM('score_explanation', {
        label,
        total: scoring.total,
        cards: cards.map(c => `${c.rank}${c.suit}`),
        starter: `${starter.rank}${starter.suit}`,
        breakdown: {
          fifteens: scoring.fifteens,
          pairs: scoring.pairs,
          runs: scoring.runs,
          flush: scoring.flush,
          nobs: scoring.nobs,
        },
      });
      setExplanation(text);
      setUsed(true);
    } catch (e) {
      setError('Explanation unavailable. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Explain button — only shown before first use */}
      {!explanation && !loading && (
        <button
          onClick={handleExplain}
          className={cn(
            'w-full py-2 rounded-xl text-xs font-semibold',
            'border border-white/[0.08] text-cream/40',
            'hover:border-gold/20 hover:text-cream/70 transition-all duration-150',
          )}
          data-testid="explain-score-btn"
        >
          {error ? '⚠ ' + error : 'Explain this score'}
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3">
          <div className="w-3 h-3 rounded-full bg-gold/60 animate-pulse" />
          <span className="text-cream/40 text-xs italic">Thinking…</span>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div
          className={cn(
            'mt-1 px-4 py-3 rounded-xl',
            'border border-gold/15 bg-gold/5',
          )}
          data-testid="score-explanation"
          aria-live="polite"
        >
          <p className="text-cream/70 text-xs leading-relaxed italic">
            <span className="text-gold/80 not-italic font-semibold">Coach: </span>
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
