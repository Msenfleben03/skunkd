import { useEffect, useRef, useState } from 'react';
import { type PeggingPlayScore } from '@/engine/pegging';
import { cn } from '@/lib/utils';

export interface PeggingScoreProps {
  /**
   * The most recent pegging play score. Set to null / zero-total to hide.
   * When this changes to a non-zero score, the toast auto-shows then fades.
   */
  score: PeggingPlayScore | null;
  /** Extra points from "Go" or "Last card" (not in PeggingPlayScore) */
  goOrLastCard?: number;
  /** Additional context label, e.g. "Go!" or "Last card" */
  extraLabel?: string;
  className?: string;
}

/** Build a human-readable label from the pegging score */
function buildLabel(score: PeggingPlayScore, goOrLastCard = 0, extraLabel?: string): string {
  const parts: string[] = [];

  if (score.thirtyone === 2) parts.push('Thirty-one for 2!');
  if (score.fifteen === 2) parts.push('Fifteen for 2!');
  if (score.pairs > 0) {
    if (score.pairs === 12) parts.push('Double pair royal for 12!');
    else if (score.pairs === 6) parts.push('Pair royal for 6!');
    else parts.push('Pair for 2!');
  }
  if (score.runs > 0) parts.push(`Run of ${score.runs} for ${score.runs}!`);
  if (goOrLastCard > 0) parts.push(extraLabel ?? `Go for ${goOrLastCard}!`);

  return parts.join('  ');
}

/**
 * Animated pegging score toast. Self-dismisses after ~2.2 seconds.
 * Fades in on mount, fades out before unmount.
 */
export function PeggingScore({
  score,
  goOrLastCard = 0,
  extraLabel,
  className,
}: PeggingScoreProps) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [total, setTotal] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveTotal = (score?.total ?? 0) + goOrLastCard;

  useEffect(() => {
    if (effectiveTotal === 0) {
      setVisible(false);
      return;
    }

    // Update content immediately
    if (score) setLabel(buildLabel(score, goOrLastCard, extraLabel));
    else if (extraLabel) setLabel(extraLabel);
    setTotal(effectiveTotal);
    setVisible(true);

    // Auto-dismiss after 2.2s
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [score, goOrLastCard, extraLabel, effectiveTotal]);

  if (!label && !visible) return null;

  const isBig = effectiveTotal >= 8;
  const isThirtyone = score?.thirtyone === 2;

  return (
    <div
      className={cn(
        'pointer-events-none select-none transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
        className,
      )}
      aria-live="assertive"
      aria-atomic="true"
      data-testid="pegging-score"
      role="status"
    >
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-2 rounded-2xl shadow-xl',
          'border backdrop-blur-sm',
          isThirtyone
            ? 'bg-skunk-green/20 border-skunk-green/40'
            : 'bg-gold/15 border-gold/30',
        )}
      >
        {/* Points badge */}
        <span
          className={cn(
            'font-black tabular-nums leading-none',
            isBig ? 'text-3xl' : 'text-2xl',
            isThirtyone ? 'text-skunk-green' : 'text-gold',
            'font-display',
          )}
          aria-label={`${total} points`}
        >
          +{total}
        </span>

        {/* Label */}
        <span
          className={cn(
            'text-sm font-medium leading-tight',
            isThirtyone ? 'text-skunk-green/90' : 'text-gold/90',
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
