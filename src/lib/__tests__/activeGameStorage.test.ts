import { describe, it, expect, beforeEach, vi } from 'vitest';

// activeGameStorage uses localStorage which is available in jsdom.
// Wipe it before each test to avoid cross-test pollution.

// Note: this import will fail RED until activeGameStorage.ts is created.
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
} from '../activeGameStorage';

describe('activeGameStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveActiveGame', () => {
    it('persists the session to localStorage', () => {
      saveActiveGame({ gameId: 'g1', inviteCode: 'ABC123', seat: 0 });
      const raw = localStorage.getItem('skunkd_active_game');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toEqual({ gameId: 'g1', inviteCode: 'ABC123', seat: 0 });
    });

    it('overwrites a previously saved session', () => {
      saveActiveGame({ gameId: 'g1', inviteCode: 'OLD111', seat: 0 });
      saveActiveGame({ gameId: 'g2', inviteCode: 'NEW222', seat: 1 });
      const parsed = JSON.parse(localStorage.getItem('skunkd_active_game')!);
      expect(parsed.inviteCode).toBe('NEW222');
      expect(parsed.seat).toBe(1);
    });
  });

  describe('loadActiveGame', () => {
    it('returns null when nothing has been saved', () => {
      expect(loadActiveGame()).toBeNull();
    });

    it('returns the saved session after saveActiveGame', () => {
      saveActiveGame({ gameId: 'g1', inviteCode: 'ABC123', seat: 1 });
      expect(loadActiveGame()).toEqual({ gameId: 'g1', inviteCode: 'ABC123', seat: 1 });
    });

    it('returns null when localStorage contains invalid JSON', () => {
      localStorage.setItem('skunkd_active_game', '{bad json');
      expect(loadActiveGame()).toBeNull();
    });
  });

  describe('clearActiveGame', () => {
    it('removes the saved session from localStorage', () => {
      saveActiveGame({ gameId: 'g1', inviteCode: 'ABC123', seat: 0 });
      clearActiveGame();
      expect(localStorage.getItem('skunkd_active_game')).toBeNull();
    });

    it('is safe to call when nothing is saved', () => {
      expect(() => clearActiveGame()).not.toThrow();
    });
  });
});
