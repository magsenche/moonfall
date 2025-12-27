// Player session management using localStorage
// Supports multiple game sessions simultaneously
// Uses game code as key for easy multi-game support

const SESSIONS_STORAGE_KEY = 'moonfall_sessions';

export interface PlayerSession {
  playerId: string;
  gameCode: string;
  pseudo: string;
  joinedAt: number; // timestamp for sorting
}

interface SessionStore {
  sessions: Record<string, PlayerSession>; // keyed by uppercase game code
}

function getStore(): SessionStore {
  if (typeof window === 'undefined') return { sessions: {} };
  
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!stored) return { sessions: {} };
    return JSON.parse(stored) as SessionStore;
  } catch {
    return { sessions: {} };
  }
}

function saveStore(store: SessionStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(store));
}

export function savePlayerSession(session: Omit<PlayerSession, 'joinedAt'> & { joinedAt?: number }): void {
  const store = getStore();
  const key = session.gameCode.toUpperCase();
  
  store.sessions[key] = {
    ...session,
    gameCode: key,
    joinedAt: session.joinedAt || Date.now(),
  };
  
  saveStore(store);
}

export function getPlayerSession(): PlayerSession | null {
  // For backwards compatibility, return the most recent session
  const store = getStore();
  const sessions = Object.values(store.sessions);
  
  if (sessions.length === 0) return null;
  
  // Return the most recently joined
  return sessions.sort((a, b) => b.joinedAt - a.joinedAt)[0];
}

export function getPlayerIdForGame(gameCode: string): string | null {
  const store = getStore();
  const session = store.sessions[gameCode.toUpperCase()];
  return session?.playerId ?? null;
}

export function getSessionForGame(gameCode: string): PlayerSession | null {
  const store = getStore();
  return store.sessions[gameCode.toUpperCase()] ?? null;
}

export function getAllSessions(): PlayerSession[] {
  const store = getStore();
  return Object.values(store.sessions).sort((a, b) => b.joinedAt - a.joinedAt);
}

export function clearPlayerSession(): void {
  // Clear most recent session only (backwards compat)
  const session = getPlayerSession();
  if (session) {
    clearSessionForGame(session.gameCode);
  }
}

export function clearSessionForGame(gameCode: string): void {
  const store = getStore();
  delete store.sessions[gameCode.toUpperCase()];
  saveStore(store);
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
}

// Migration: import old single-session format if present
export function migrateOldSession(): void {
  if (typeof window === 'undefined') return;
  
  const OLD_KEY = 'moonfall_player_session';
  const oldStored = localStorage.getItem(OLD_KEY);
  
  if (oldStored) {
    try {
      const old = JSON.parse(oldStored) as { playerId: string; gameCode: string; pseudo: string };
      savePlayerSession({
        playerId: old.playerId,
        gameCode: old.gameCode,
        pseudo: old.pseudo,
        joinedAt: Date.now(),
      });
      localStorage.removeItem(OLD_KEY);
    } catch {
      localStorage.removeItem(OLD_KEY);
    }
  }
}
