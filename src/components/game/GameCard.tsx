import type { CSSProperties } from 'react';
import { isRed, type Card } from '@/engine/types';
import { cn } from '@/lib/utils';
import { useCardSize } from '@/hooks/useCardSize';

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
  const sz = useCardSize();
  const d = mini ? sz.mini : sz;

  const cardStyle: CSSProperties = {
    width: d.w,
    height: d.h,
    borderRadius: d.r,
    flexShrink: 0,
  };

  // --- Face-down / back of card ---
  if (faceDown || !card) {
    return (
      <div
        className={cn('relative', className)}
        style={{
          ...cardStyle,
          backgroundColor: '#722F37',
          backgroundImage: CARD_BACK_PATTERN,
          boxShadow: '0 2px 8px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06)',
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
            style={{ fontFamily: "'Playfair Display', serif", fontSize: d.watermarkFont, letterSpacing: '0.18em' }}
          >
            SKUNK'D
          </span>
        </div>
        {/* Inner border for premium card feel */}
        <div className="absolute inset-[3px] rounded-[3px] border border-white/10" />
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
        'relative select-none bg-white',
        selected && 'ring-2 ring-gold ring-offset-1 ring-offset-felt',
        dimmed && 'opacity-40 grayscale pointer-events-none',
        'transition-all duration-200',
        className,
      )}
      style={{
        ...cardStyle,
        boxShadow: selected ? selectedShadow : defaultShadow,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid #e5e7eb',
        ...style,
        ...(selected ? { transform: 'translateY(-12px)' } : {}),
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      {/* Top-left guard */}
      <div
        className="absolute leading-none"
        style={{ top: d.guardTop, left: d.guardLeft, color: textColor, fontFamily: "'Playfair Display', serif" }}
      >
        <div style={{ fontSize: d.rankFont, fontWeight: 700 }}>{card.rank}</div>
        <div style={{ fontSize: d.suitFont, marginTop: -1 }}>{suitSym}</div>
      </div>

      {/* Center suit symbol */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: textColor, fontSize: d.centerFont, lineHeight: 1 }}
      >
        {suitSym}
      </div>

      {/* Bottom-right guard (rotated 180°) */}
      <div
        className="absolute leading-none rotate-180"
        style={{ bottom: d.guardTop, right: d.guardLeft, color: textColor, fontFamily: "'Playfair Display', serif" }}
      >
        <div style={{ fontSize: d.rankFont, fontWeight: 700 }}>{card.rank}</div>
        <div style={{ fontSize: d.suitFont, marginTop: -1 }}>{suitSym}</div>
      </div>
    </div>
  );
}
