// Persists the active multiplayer game session to localStorage so users can
// return to a game after navigating away without needing to manually record
// the invite code.

const KEY = 'skunkd_active_game';

export interface ActiveGameSession {
  gameId: string;
  inviteCode: string;
  seat: 0 | 1;
}

export function saveActiveGame(session: ActiveGameSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadActiveGame(): ActiveGameSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveGameSession) : null;
  } catch {
    return null;
  }
}

export function clearActiveGame(): void {
  localStorage.removeItem(KEY);
}
