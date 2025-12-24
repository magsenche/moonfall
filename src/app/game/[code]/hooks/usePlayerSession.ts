/**
 * usePlayerSession - Player identification and session recovery
 * 
 * Handles:
 * - Loading player ID from localStorage
 * - Session recovery by pseudo
 * - Migration from old session format
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getPlayerIdForGame, 
  savePlayerSession, 
  migrateOldSession 
} from '@/lib/utils/player-session';
import type { GameWithPlayers } from './types';

interface UsePlayerSessionOptions {
  game: GameWithPlayers;
}

// Get initial session state synchronously
function getInitialSessionState(gameCode: string, gameStatus: string | null) {
  if (typeof window === 'undefined') {
    return { playerId: null, needsRecovery: false };
  }
  migrateOldSession();
  const playerId = getPlayerIdForGame(gameCode);
  const needsRecovery = !playerId && gameStatus !== 'lobby';
  return { playerId, needsRecovery };
}

export function usePlayerSession({ game }: UsePlayerSessionOptions) {
  // Compute initial state synchronously to avoid hydration mismatch
  const initialState = useMemo(
    () => getInitialSessionState(game.code, game.status),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once on mount
  );
  
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(initialState.playerId);
  const [showRecovery, setShowRecovery] = useState(initialState.needsRecovery);
  const [recoveryPseudo, setRecoveryPseudo] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Re-check session when game code changes (shouldn't happen normally)
  useEffect(() => {
    const { playerId, needsRecovery } = getInitialSessionState(game.code, game.status);
    if (playerId !== currentPlayerId) {
      setCurrentPlayerId(playerId);
      setShowRecovery(needsRecovery);
    }
    // Only run when game.code changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.code]);

  // Recover session by pseudo
  const recoverSession = useCallback(async () => {
    if (!recoveryPseudo.trim()) {
      setRecoveryError('Entre ton pseudo');
      return;
    }
    
    setIsRecovering(true);
    setRecoveryError(null);
    
    // Find player by pseudo (case-insensitive)
    const foundPlayer = game.players.find(
      p => p.pseudo.toLowerCase() === recoveryPseudo.trim().toLowerCase()
    );
    
    if (!foundPlayer) {
      setRecoveryError(`Aucun joueur "${recoveryPseudo}" dans cette partie`);
      setIsRecovering(false);
      return;
    }
    
    // Save session and restore
    savePlayerSession({
      playerId: foundPlayer.id,
      gameCode: game.code,
      pseudo: foundPlayer.pseudo,
    });
    
    setCurrentPlayerId(foundPlayer.id);
    setShowRecovery(false);
    setIsRecovering(false);
  }, [recoveryPseudo, game.players, game.code]);

  return {
    currentPlayerId,
    showRecovery,
    recoveryPseudo,
    recoveryError,
    isRecovering,
    setCurrentPlayerId,
    setRecoveryPseudo,
    recoverSession,
  };
}
