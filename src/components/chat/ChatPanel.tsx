// Task 6.5: LLM-assisted in-game chat panel
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { SuggestionBar } from './SuggestionBar';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_ai_suggested: boolean;
  created_at: string;
  displayName?: string;
}

interface ChatPanelProps {
  gameId: string;
  userId: string;
  displayName: string;
  gameContext?: string;   // brief game state description for suggestions
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ChatPanel({
  gameId,
  userId,
  gameContext,
  isOpen,
  onClose,
  className,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!gameId) return;

    // Load existing messages
    supabase
      .from('messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at')
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Real-time new messages
    const channel = supabase
      .channel(`chat:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${gameId}` },
        payload => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (text: string, isAiSuggested = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setDraft('');
    try {
      await supabase.from('messages').insert({
        game_id: gameId,
        user_id: userId,
        content: trimmed,
        is_ai_suggested: isAiSuggested,
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'flex flex-col max-h-[60vh]',
        'bg-skunk-darker border-t border-white/10',
        'shadow-2xl',
        className,
      )}
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span
          className="text-sm font-bold text-cream/80 font-display"
        >
          Trash Talk
        </span>
        <button
          onClick={onClose}
          className="text-cream/40 hover:text-cream/80 transition-colors text-lg leading-none"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-cream/25 text-xs text-center italic py-4">
            No trash talk yet. Be the villain.
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.user_id === userId ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                msg.user_id === userId
                  ? 'bg-gold/20 border border-gold/20 text-cream rounded-br-sm'
                  : 'bg-white/5 border border-white/10 text-cream/80 rounded-bl-sm',
                msg.is_ai_suggested && 'border-skunk-green/20',
              )}
            >
              {msg.is_ai_suggested && (
                <span className="text-[9px] text-skunk-green/60 block mb-0.5">AI suggested</span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {gameContext && (
        <SuggestionBar
          gameContext={gameContext}
          draft={draft}
          onSelect={text => sendMessage(text, true)}
          className="flex-shrink-0"
        />
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(draft)}
          placeholder="Say something…"
          maxLength={120}
          className={cn(
            'flex-1 px-3 py-2 rounded-xl text-sm',
            'bg-white/5 border border-white/10 text-cream placeholder-cream/25',
            'focus:outline-none focus:border-gold/40 transition-colors',
          )}
          data-testid="chat-input"
        />
        <button
          onClick={() => sendMessage(draft)}
          disabled={!draft.trim() || sending}
          className={cn(
            'px-3 py-2 rounded-xl text-sm font-bold',
            'bg-gold text-skunk-dark',
            'hover:bg-gold-bright transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          data-testid="chat-send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
}
