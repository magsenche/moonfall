// Player session management using localStorage
// This is a simple solution for the prototype - will be replaced by proper auth later

const PLAYER_SESSION_KEY = 'moonfall_player_session';

interface PlayerSession {
  playerId: string;
  gameCode: string;
  pseudo: string;
}

export function savePlayerSession(session: PlayerSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
}

export function getPlayerSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(PLAYER_SESSION_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAYER_SESSION_KEY);
}

export function getPlayerIdForGame(gameCode: string): string | null {
  const session = getPlayerSession();
  if (!session) return null;
  
  // Only return playerId if it's for the same game
  if (session.gameCode.toUpperCase() === gameCode.toUpperCase()) {
    return session.playerId;
  }
  
  return null;
}
