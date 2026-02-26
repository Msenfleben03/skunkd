// Task 6.3: End-of-hand coaching review via LLM
import { useState } from 'react';
import { callLLM } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import type { HandStats } from '@/engine/types';

interface HandReviewProps {
  handNumber: number;
  playerStats: HandStats;
  opponentStats: HandStats;
  className?: string;
}

export function HandReview({ handNumber, playerStats, opponentStats, className }: HandReviewProps) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleReview = async () => {
    if (review) { setOpen(o => !o); return; }
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const { text } = await callLLM('coaching_review', {
        handNumber,
        pegging: playerStats.pegging,
        hand: playerStats.hand,
        crib: playerStats.crib,
        oppPegging: opponentStats.pegging,
        oppHand: opponentStats.hand,
        oppCrib: opponentStats.crib,
      });
      setReview(text);
    } catch (e) {
      setError('STINKY is off-duty. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <button
        onClick={handleReview}
        disabled={loading}
        className={cn(
          'w-full rounded-xl py-3 px-4 font-semibold text-sm',
          'border border-white/10 text-cream/60',
          'hover:border-gold/20 hover:text-cream/80 transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && review && 'border-gold/20 text-cream/80',
        )}
        data-testid="review-hand-btn"
      >
        {loading ? 'STINKY is coaching…' : review ? (open ? 'Hide Review' : 'Show Review') : 'Review My Plays'}
      </button>

      {open && (
        <div className="mt-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="w-3 h-3 rounded-full bg-gold/60 animate-pulse" />
              <span className="text-cream/40 text-xs italic">STINKY is reviewing…</span>
            </div>
          )}

          {error && !loading && (
            <p className="text-red-400/70 text-xs text-center py-2">{error}</p>
          )}

          {review && !loading && (
            <div
              className="px-4 py-3 rounded-xl border border-gold/15 bg-gold/5"
              data-testid="hand-review-content"
              aria-live="polite"
            >
              <p className="text-[10px] text-gold/60 uppercase tracking-widest mb-1">STINKY'S TAKE</p>
              <p className="text-cream/70 text-xs leading-relaxed">{review}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
