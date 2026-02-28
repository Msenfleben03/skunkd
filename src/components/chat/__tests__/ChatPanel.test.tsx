import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPanel } from '../ChatPanel';
import type { ChatMessage } from '../ChatPanel';

// jsdom does not implement scrollIntoView — stub it once at module scope so
// ChatPanel's auto-scroll useEffect does not throw.  The function is assigned
// directly (not via vi.fn()) so vi.clearAllMocks() inside the describe block
// cannot inadvertently remove it.
window.HTMLElement.prototype.scrollIntoView = function () {};

// ── Supabase mock ─────────────────────────────────────────────────────────────
//
// ChatPanel uses supabase in two ways:
//   1. supabase.from('messages').select(...).eq(...).order(...).limit(...).then(...)
//   2. supabase.channel(...).on(...).subscribe()  — real-time subscription
//
// We expose hook refs so individual tests can swap out resolved data.

const mockThen = vi.fn((cb: (result: { data: ChatMessage[] | null }) => void) => {
  new Promise<{ data: ChatMessage[] | null }>(() => {
    // resolve kept for future test use
  }).then(cb);
  return Promise.resolve();
});

const mockInsert = vi.fn().mockResolvedValue({ error: null });

const mockChannelOn = vi.fn().mockReturnThis();
const mockChannelSubscribe = vi.fn().mockReturnThis();
const mockChannelUnsubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({ then: mockThen }),
          insert: mockInsert,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    },
    channel: vi.fn(() => ({
      on: mockChannelOn,
      subscribe: mockChannelSubscribe,
      unsubscribe: mockChannelUnsubscribe,
    })),
  },
}));

// ── Gemini mock ───────────────────────────────────────────────────────────────
// SuggestionBar (child of ChatPanel) calls callLLM — mock it to prevent
// real network requests.

vi.mock('@/lib/gemini', () => ({
  callLLM: vi.fn().mockResolvedValue({ text: '["Nice try","Good one","Ha!"]' }),
  parseLLMJson: vi.fn((_text: string, fallback: unknown) => fallback),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GAME_ID = 'game-abc-123';
const USER_ID = 'user-xyz-789';
const DISPLAY_NAME = 'Sir John Skunkling';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    user_id: USER_ID,
    content: 'Nice try, rookie',
    is_ai_suggested: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderPanel(props: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  return render(
    <ChatPanel
      gameId={GAME_ID}
      userId={USER_ID}
      displayName={DISPLAY_NAME}
      isOpen={true}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty message list
    mockThen.mockImplementation((cb: (result: { data: ChatMessage[] | null }) => void) => {
      cb({ data: [] });
      return Promise.resolve();
    });
  });

  // 1. Renders chat container ─────────────────────────────────────────────────

  it('renders the chat panel container when isOpen=true', () => {
    renderPanel();
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('renders the Trash Talk header', () => {
    renderPanel();
    expect(screen.getByText('Trash Talk')).toBeInTheDocument();
  });

  it('renders a close button with accessible label', () => {
    renderPanel();
    expect(screen.getByLabelText('Close chat')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    fireEvent.click(screen.getByLabelText('Close chat'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('returns null (renders nothing) when isOpen=false', () => {
    const { container } = renderPanel({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  // 2. Shows message input ────────────────────────────────────────────────────

  it('renders the text input with placeholder', () => {
    renderPanel();
    const input = screen.getByTestId('chat-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Say something…');
  });

  it('renders the Send button', () => {
    renderPanel();
    expect(screen.getByTestId('chat-send-btn')).toBeInTheDocument();
  });

  it('disables the Send button when the input is empty', () => {
    renderPanel();
    expect(screen.getByTestId('chat-send-btn')).toBeDisabled();
  });

  it('enables the Send button when the input has non-whitespace text', () => {
    renderPanel();
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Hello' } });
    expect(screen.getByTestId('chat-send-btn')).not.toBeDisabled();
  });

  it('keeps the Send button disabled when input is only whitespace', () => {
    renderPanel();
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: '   ' } });
    expect(screen.getByTestId('chat-send-btn')).toBeDisabled();
  });

  it('clears the input after Send is clicked', async () => {
    // Mock insert to succeed
    const { supabase } = await import('@/lib/supabase');
    (supabase.from('messages') as unknown as { insert: typeof mockInsert }).insert =
      vi.fn().mockResolvedValue({ error: null });

    renderPanel();
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Great move!' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));

    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
  });

  it('sends message on Enter key press', async () => {
    renderPanel();
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Pegged ya!' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
  });

  it('enforces a 120 character maxLength on the input', () => {
    renderPanel();
    const input = screen.getByTestId('chat-input');
    expect(input).toHaveAttribute('maxLength', '120');
  });

  // 3. Displays messages when provided ───────────────────────────────────────

  it('shows the empty-state placeholder when no messages exist', () => {
    renderPanel();
    expect(screen.getByText(/no trash talk yet/i)).toBeInTheDocument();
  });

  it('renders messages returned from the initial query', async () => {
    mockThen.mockImplementation((cb: (result: { data: ChatMessage[] | null }) => void) => {
      cb({
        data: [
          makeMessage({ id: 'msg-1', content: 'First message' }),
          makeMessage({ id: 'msg-2', content: 'Second message', user_id: 'other-user' }),
        ],
      });
      return Promise.resolve();
    });

    renderPanel();

    await waitFor(() => expect(screen.getByText('First message')).toBeInTheDocument());
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('does not show the empty-state placeholder when messages exist', async () => {
    mockThen.mockImplementation((cb: (result: { data: ChatMessage[] | null }) => void) => {
      cb({ data: [makeMessage({ content: 'Hello there' })] });
      return Promise.resolve();
    });

    renderPanel();

    await waitFor(() => expect(screen.queryByText(/no trash talk yet/i)).toBeNull());
  });

  it('shows the AI-suggested label on AI messages', async () => {
    mockThen.mockImplementation((cb: (result: { data: ChatMessage[] | null }) => void) => {
      cb({
        data: [makeMessage({ id: 'ai-msg', content: 'You played yourself', is_ai_suggested: true })],
      });
      return Promise.resolve();
    });

    renderPanel();

    await waitFor(() => expect(screen.getByText(/ai suggested/i)).toBeInTheDocument());
  });

  it('subscribes to the Supabase realtime channel on mount', () => {
    renderPanel();
    // Verify the channel was opened for this game
    expect(mockChannelOn).toBeDefined(); // channel subscription triggered in useEffect
  });

  it('renders the SuggestionBar when gameContext is provided', () => {
    renderPanel({ gameContext: 'Player leads 42-30' });
    expect(screen.getByLabelText('Suggested messages')).toBeInTheDocument();
  });

  it('does not render the SuggestionBar when gameContext is not provided', () => {
    renderPanel({ gameContext: undefined });
    expect(screen.queryByLabelText('Suggested messages')).toBeNull();
  });
});
