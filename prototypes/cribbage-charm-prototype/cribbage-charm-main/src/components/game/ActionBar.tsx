import { Phase, PeggingState, cardValue } from '@/engine/types';
import { Button } from '@/components/ui/button';

interface Props {
  phase: Phase;
  selectedCards: string[];
  pegging: PeggingState;
  onDiscard: () => void;
  onPlay: () => void;
  onGo: () => void;
  onAdvance: () => void;
  onNextHand: () => void;
  onNewGame: () => void;
  onTaunt: () => void;
}

export function ActionBar({
  phase, selectedCards, pegging, onDiscard, onPlay, onGo,
  onAdvance, onNextHand, onNewGame, onTaunt
}: Props) {
  const canPlay = pegging.playerCards.some(c => cardValue(c) + pegging.count <= 31);

  let main: React.ReactNode = null;

  switch (phase) {
    case 'DEALING':
    case 'CUT_STARTER':
      main = <Button disabled size="lg" className="w-full opacity-50">
        {phase === 'DEALING' ? 'Dealing...' : 'Cutting starter...'}
      </Button>;
      break;
    case 'DISCARD_TO_CRIB':
      main = <Button onClick={onDiscard} disabled={selectedCards.length !== 2} size="lg" className="w-full">
        Discard ({selectedCards.length}/2)
      </Button>;
      break;
    case 'PEGGING':
      if (pegging.turn !== 'player') {
        main = <Button disabled size="lg" className="w-full opacity-50">Muggins is thinking…</Button>;
      } else if (!canPlay) {
        main = <Button onClick={onGo} size="lg" variant="secondary" className="w-full">Say "Go!"</Button>;
      } else if (selectedCards.length === 1) {
        main = <Button onClick={onPlay} size="lg" className="w-full">Play Card</Button>;
      } else {
        main = <Button disabled size="lg" className="w-full opacity-60">Tap a card to play</Button>;
      }
      break;
    case 'SHOW_NONDEALER':
    case 'SHOW_DEALER':
    case 'SHOW_CRIB':
      main = <Button onClick={onAdvance} size="lg" className="w-full">Continue →</Button>;
      break;
    case 'HAND_COMPLETE':
      main = <Button onClick={onNextHand} size="lg" className="w-full">Next Hand</Button>;
      break;
    case 'GAME_OVER':
      main = <Button onClick={onNewGame} size="lg" className="w-full">Play Again</Button>;
      break;
    default:
      main = <Button onClick={onNewGame} size="lg" className="w-full">Deal Me In</Button>;
  }

  return (
    <div className="flex gap-2 px-4 py-3 bg-walnut relative z-20 border-t border-border">
      <div className="flex-1">{main}</div>
      {!['GAME_START', 'GAME_OVER'].includes(phase) && (
        <Button onClick={onTaunt} variant="outline" size="lg" className="px-3 text-base">
          🎤
        </Button>
      )}
    </div>
  );
}
