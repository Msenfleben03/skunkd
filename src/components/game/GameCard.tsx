import type { CSSProperties } from 'react';
import { isRed, type Card } from '@/engine/types';
import { cn } from '@/lib/utils';

// Unicode suit symbols
const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥',
  D: '♦',
  S: '♠',
  C: '♣',
};

// Card back crosshatch SVG as data URI
const CARD_BACK_PATTERN =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 9px), " +
  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 9px)";

export interface GameCardProps {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  mini?: boolean;
}

export function GameCard({
  card,
  faceDown = false,
  selected = false,
  dimmed = false,
  onClick,
  className,
  style,
  mini = false,
}: GameCardProps) {
  const sizeClass = mini
    ? 'w-8 h-[2.8rem] rounded-[3px]'
    : 'w-14 h-[4.9rem] rounded-[5px]';

  // --- Face-down / back of card ---
  if (faceDown || !card) {
    return (
      <div
        className={cn('relative flex-shrink-0', sizeClass, className)}
        style={{
          backgroundColor: '#722F37',
          backgroundImage: CARD_BACK_PATTERN,
          boxShadow:
            '0 2px 8px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06)',
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        onClick={onClick}
        aria-label="Face-down card"
      >
        {/* SKUNK'D watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tracking-widest select-none text-white/20 rotate-90"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: mini ? 6 : 9,
              letterSpacing: '0.18em',
            }}
          >
            SKUNK'D
          </span>
        </div>
        {/* Inner border for premium card feel */}
        <div
          className="absolute inset-[3px] rounded-[3px] border border-white/10"
        />
      </div>
    );
  }

  // --- Face-up card ---
  const red = isRed(card.suit);
  const suitSym = SUIT_SYMBOLS[card.suit];
  const textColor = red ? '#C41E1E' : '#111827';

  const selectedShadow = '0 8px 28px rgba(212,168,67,0.45), 0 4px 12px rgba(0,0,0,0.45)';
  const defaultShadow = '0 2px 8px rgba(0,0,0,0.35)';

  return (
    <div
      className={cn(
        'relative flex-shrink-0 select-none bg-white',
        sizeClass,
        selected && 'ring-2 ring-gold ring-offset-1 ring-offset-felt',
        dimmed && 'opacity-40 grayscale pointer-events-none',
        'transition-all duration-200',
        className,
      )}
      style={{
        boxShadow: selected ? selectedShadow : defaultShadow,
        transform: selected
          ? `translateY(-12px)${style?.transform ? ` ${style.transform}` : ''}`
          : style?.transform,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid #e5e7eb',
        ...style,
        // override transform above so we set it correctly
        ...(selected ? { transform: `translateY(-12px)` } : {}),
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      {/* Top-left corner */}
      <div
        className="absolute leading-none"
        style={{
          top: mini ? 2 : 3,
          left: mini ? 3 : 4,
          color: textColor,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        <div style={{ fontSize: mini ? 7 : 11, fontWeight: 700 }}>{card.rank}</div>
        <div style={{ fontSize: mini ? 6 : 9, marginTop: -1 }}>{suitSym}</div>
      </div>

      {/* Center suit symbol */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: textColor,
          fontSize: mini ? 16 : 26,
          lineHeight: 1,
        }}
      >
        {suitSym}
      </div>

      {/* Bottom-right corner (rotated 180°) */}
      <div
        className="absolute leading-none rotate-180"
        style={{
          bottom: mini ? 2 : 3,
          right: mini ? 3 : 4,
          color: textColor,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        <div style={{ fontSize: mini ? 7 : 11, fontWeight: 700 }}>{card.rank}</div>
        <div style={{ fontSize: mini ? 6 : 9, marginTop: -1 }}>{suitSym}</div>
      </div>
    </div>
  );
}
