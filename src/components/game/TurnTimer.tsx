// Task 5.5: Configurable turn timer for real-time games
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TurnTimerProps {
  /** Duration in seconds */
  durationSecs: number;
  /** Called when timer reaches 0 */
  onExpire: () => void;
  /** Whether timer is active (paused when not your turn) */
  active: boolean;
  className?: string;
}

export function TurnTimer({ durationSecs, onExpire, active, className }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(durationSecs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset when activated
  useEffect(() => {
    if (active) setRemaining(durationSecs);
  }, [active, durationSecs]);

  // Tick
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const pct = remaining / durationSecs;
  const isUrgent = pct <= 0.25;
  const isCritical = pct <= 0.1;

  // SVG arc for circular countdown
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      aria-label={`${remaining} seconds remaining`}
      role="timer"
    >
      {/* Circular arc */}
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        {/* Track */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        {/* Progress */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={isCritical ? '#ef4444' : isUrgent ? '#f59e0b' : '#D4A843'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
      </svg>

      {/* Numeric */}
      <span
        className={cn(
          'text-2xl font-black tabular-nums w-8',
          isCritical ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gold',
          isCritical && 'animate-pulse',
          'font-display',
        )}
      >
        {remaining}
      </span>
    </div>
  );
}
