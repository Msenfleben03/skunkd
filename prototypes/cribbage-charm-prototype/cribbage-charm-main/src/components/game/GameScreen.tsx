import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import skunkLogo from '@/assets/skunk-logo.png';
import { PlayerHand } from './PlayerHand';
import { PlayArea } from './PlayArea';
import { AIAvatar } from './AIAvatar';
import { ScorePanel } from './ScorePanel';
import { CribbageBoard } from './CribbageBoard';
import { ActionBar } from './ActionBar';
import { TauntSheet } from './TauntSheet';
import { ShowScoring } from './ShowScoring';
import { getRetort } from '@/engine/trashTalk';
import { Button } from '@/components/ui/button';

export function GameScreen() {
  const navigate = useNavigate();
  const { state, newGame, toggleSelect, confirmDiscard, playCard, declareGo, advanceShow, nextHand, dispatch } = useGame();
  const [showBoard, setShowBoard] = useState(false);
  const [showTaunts, setShowTaunts] = useState(false);
  const [floatingGif, setFloatingGif] = useState<string | null>(null);

  const {
    phase, playerHand, pegging, starter, crib, selectedCards,
    aiSpeech, playerSpeech, showScoring, showCards, showLabel,
    winner, playerScore, aiScore, pegPositions, dealer, message,
  } = state;

  const isShow = ['SHOW_NONDEALER', 'SHOW_DEALER', 'SHOW_CRIB'].includes(phase);
  const handCards = phase === 'PEGGING' ? pegging.playerCards : playerHand;
  const showHand = ['DEALING', 'DISCARD_TO_CRIB', 'CUT_STARTER', 'PEGGING'].includes(phase) && handCards.length > 0;
  const handDisabled = phase === 'DEALING' || phase === 'CUT_STARTER' || (phase === 'PEGGING' && pegging.turn !== 'player');

  const handlePlay = () => { if (selectedCards.length === 1) playCard(selectedCards[0]); };

  const handleTaunt = (text: string) => {
    dispatch({ type: 'SET_PLAYER_SPEECH', message: text });
    setTimeout(() => dispatch({ type: 'SET_AI_SPEECH', message: getRetort() }), 1200);
  };

  const handleGif = (url: string) => {
    setFloatingGif(url);
    setTimeout(() => setFloatingGif(null), 4000);
    setTimeout(() => dispatch({ type: 'SET_AI_SPEECH', message: getRetort() }), 1500);
  };

  // Start screen
  if (phase === 'GAME_START') {
    return (
      <div className="felt-surface h-screen flex flex-col items-center justify-center">
        <div className="relative z-10 text-center px-8">
          <img src={skunkLogo} alt="Skunk'd! - Cribbage logo" className="w-64 h-64 mx-auto mb-4 object-contain drop-shadow-[0_0_30px_hsl(var(--felt))]" />
          <h1 className="font-display text-5xl text-primary mb-1 tracking-tight">Cribbage</h1>
          <p className="font-display text-xl text-muted-foreground italic mb-2">Get Pegged!</p>
          <p className="text-muted-foreground/70 text-xs max-w-[280px] mx-auto mb-6 leading-relaxed">
            Since 1630 — invented by a cheating poet, perfected on submarines, and the only card game you can legally play for money in English pubs.
          </p>
          <div className="flex items-center gap-2 justify-center mb-6">
            <span className="text-3xl">🦨</span>
            <div className="text-left">
              <span className="text-muted-foreground text-lg block leading-tight">vs. Muggins McGee</span>
              <span className="text-muted-foreground/50 text-[10px] italic">Card shark. Scoundrel. Descendant of Sir John Suckling.</span>
            </div>
          </div>
          <Button onClick={newGame} size="lg" className="px-12 text-lg font-display">Deal Me In</Button>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button onClick={() => navigate('/history')} className="text-muted-foreground/60 text-xs underline underline-offset-2 hover:text-primary transition-colors">
              The 400-Year Story
            </button>
          </div>
          <p className="text-muted-foreground/40 text-[10px] mt-3 italic">First to 121 wins. Get skunked below 91 and you'll never live it down.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="felt-surface h-screen flex flex-col overflow-hidden">
      <ScorePanel playerScore={playerScore} aiScore={aiScore} dealer={dealer}
        showBoard={showBoard} onToggleBoard={() => setShowBoard(!showBoard)} />

      {showBoard && (
        <div className="bg-walnut/40 border-b border-border relative z-10 overflow-y-auto"
          style={{ maxHeight: '60vh' }}>
          <CribbageBoard pegPositions={pegPositions} />
        </div>
      )}

      <AIAvatar speech={aiSpeech} isThinking={phase === 'PEGGING' && pegging.turn === 'ai'} />

      {playerSpeech && (
        <div className="flex justify-end px-4 relative z-10 -mt-1 mb-1">
          <div className="speech-bubble text-right">{playerSpeech}</div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isShow && showScoring && showCards && starter ? (
          <ShowScoring label={showLabel} cards={showCards} starter={starter} scoring={showScoring} />
        ) : (
          <PlayArea phase={phase} starter={starter} pegging={pegging} crib={crib} message={message} />
        )}
      </div>

      {showHand && (
        <div className="relative z-10 flex-shrink-0">
          <PlayerHand cards={handCards} selectedCards={selectedCards} onSelect={toggleSelect}
            disabled={handDisabled} peggingCount={phase === 'PEGGING' && pegging.turn === 'player' ? pegging.count : undefined}
            dealing={phase === 'DEALING'} />
        </div>
      )}

      <ActionBar phase={phase} selectedCards={selectedCards} pegging={pegging}
        onDiscard={confirmDiscard} onPlay={handlePlay} onGo={declareGo}
        onAdvance={advanceShow} onNextHand={nextHand} onNewGame={newGame}
        onTaunt={() => setShowTaunts(true)} />

      {/* Game over overlay */}
      {phase === 'GAME_OVER' && (() => {
        const loserScore = winner === 'player' ? aiScore : playerScore;
        return (
          <div className="absolute inset-0 bg-black/65 flex items-center justify-center z-50">
            <div className="text-center animate-fade-up">
              <div className="text-6xl mb-4">{winner === 'player' ? '🏆' : '🦨'}</div>
              <h2 className="font-display text-4xl text-primary">
                {winner === 'player' ? 'You Win!' : 'Skunk\'d!'}
              </h2>
              <p className="text-foreground mt-3 text-xl tabular-nums">{playerScore} – {aiScore}</p>
              {loserScore < 61 && <p className="text-primary mt-2 font-bold text-lg">Double Skunk! 🦨🦨 Left in the lurch!</p>}
              {loserScore >= 61 && loserScore < 91 && <p className="text-primary mt-2 font-bold text-lg">Skunk! 🦨 Below 91 — that's double stakes since 1674!</p>}
              {winner === 'player' && loserScore >= 91 && <p className="text-muted-foreground mt-2 text-sm italic">No skunk, but a win's a win. O'Kane would approve.</p>}
              {winner !== 'player' && loserScore >= 91 && <p className="text-muted-foreground mt-2 text-sm italic">Sir John Suckling sends his regards.</p>}
              {aiSpeech && <div className="speech-bubble mt-4 mx-auto">{aiSpeech}</div>}
            </div>
          </div>
        );
      })()}

      {/* Floating GIF */}
      {floatingGif && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <img src={floatingGif} alt="" className="animate-float-gif max-h-[200px] rounded-xl shadow-2xl" />
        </div>
      )}

      <TauntSheet open={showTaunts} onClose={() => setShowTaunts(false)}
        onSendTaunt={handleTaunt} onSendGif={handleGif} />
    </div>
  );
}
