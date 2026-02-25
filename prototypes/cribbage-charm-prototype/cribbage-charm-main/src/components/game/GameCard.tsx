import { Card, isRed } from '@/engine/types';

interface GameCardProps {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  mini?: boolean;
}

export function GameCard({ card, faceDown, selected, dimmed, onClick, className = '', style, mini }: GameCardProps) {
  if (faceDown || !card) {
    return (
      <div
        className={`card-back ${mini ? 'card-mini' : ''} ${className}`}
        style={style}
        onClick={onClick}
      />
    );
  }

  const colorClass = isRed(card) ? 'card-red' : 'card-black';

  return (
    <div
      className={`playing-card ${colorClass} ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${mini ? 'card-mini' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      <div className="absolute top-0.5 left-1 leading-none" style={{ fontSize: mini ? '0.5rem' : '0.6rem' }}>
        <div className="font-bold">{card.rank}</div>
        <div className="-mt-0.5">{card.suit}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: mini ? '1rem' : '1.75rem' }}>
        {card.suit}
      </div>
      <div className="absolute bottom-0.5 right-1 leading-none rotate-180" style={{ fontSize: mini ? '0.5rem' : '0.6rem' }}>
        <div className="font-bold">{card.rank}</div>
        <div className="-mt-0.5">{card.suit}</div>
      </div>
    </div>
  );
}
