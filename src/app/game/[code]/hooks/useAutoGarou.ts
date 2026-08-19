/**
 * useAutoGarou - Automatic game progression (no MJ mode)
 * 
 * Handles:
 * - Auto phase transitions when timer expires
 * - Auto vote resolution
 * - Next phase determination
 */

import { useEffect, useRef, useCallback } from 'react';
import { changePhase as apiChangePhase, resolveVote as apiResolveVote, resolveNightVote as apiResolveNightVote } from '@/lib/api';

type GameStatus = 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';

// Phase progression in auto mode
const NEXT_PHASE: Record<GameStatus, GameStatus | null> = {
  lobby: 'nuit',       // Start with night (wolves select target)
  nuit: 'jour',        // After night → day discussion
  jour: 'conseil',     // After day → council vote
  conseil: 'nuit',     // After council → next night
  terminee: null,      // Game over
};

interface UseAutoGarouOptions {
  gameCode: string;
  gameStatus: GameStatus;
  isAutoMode: boolean;
  isExpired: boolean;
  currentPlayerId: string | null;
  /**
   * Position de ce client dans l'ordre de secours (0 = premier à déclencher).
   * Chaque client attend fallbackIndex × 3s de plus avant de résoudre : le
   * premier éveillé fait avancer la partie, les autres restent des secours si
   * son téléphone est verrouillé — sans que 8 clients résolvent en même temps.
   */
  fallbackIndex: number;
}

const FALLBACK_STAGGER_MS = 3000;

export function useAutoGarou({
  gameCode,
  gameStatus,
  isAutoMode,
  isExpired,
  currentPlayerId,
  fallbackIndex,
}: UseAutoGarouOptions) {
  // Track if we've already triggered transition for this expiry
  const hasTriggeredRef = useRef(false);
  const previousStatusRef = useRef<GameStatus>(gameStatus);

  // Reset trigger when phase changes
  useEffect(() => {
    if (gameStatus !== previousStatusRef.current) {
      hasTriggeredRef.current = false;
      previousStatusRef.current = gameStatus;
    }
  }, [gameStatus]);

  // Auto-transition when timer expires
  const triggerAutoTransition = useCallback(async () => {
    if (!isAutoMode || !currentPlayerId) return;
    if (gameStatus === 'terminee' || gameStatus === 'lobby') return;
    if (hasTriggeredRef.current) return;

    const nextPhase = NEXT_PHASE[gameStatus];
    if (!nextPhase) return;

    hasTriggeredRef.current = true;

    try {
      // Resolve votes/actions (these endpoints also handle phase transitions)
      if (gameStatus === 'conseil') {
        // Resolve vote also transitions to 'nuit'
        await apiResolveVote(gameCode);
      } else if (gameStatus === 'nuit') {
        // Resolve night also transitions to 'jour' (force in auto mode)
        await apiResolveNightVote(gameCode, true);
      } else if (gameStatus === 'jour') {
        // Day → Council: just change phase (no resolution needed)
        await apiChangePhase(gameCode, nextPhase);
      }
      // Note: conseil → nuit and nuit → jour transitions are handled by their resolve endpoints
    } catch (err) {
      console.error('[AutoGarou] Transition error:', err);
      hasTriggeredRef.current = false; // Allow retry
    }
  }, [isAutoMode, currentPlayerId, gameStatus, gameCode]);

  // Watch for timer expiration
  useEffect(() => {
    if (!isAutoMode || !isExpired) return;
    if (hasTriggeredRef.current) return;

    // Small delay so all clients see 0:00, then staggered fallback order:
    // if the phase advances in the meantime (realtime), the cleanup cancels us.
    const timeout = setTimeout(() => {
      triggerAutoTransition();
    }, 1000 + fallbackIndex * FALLBACK_STAGGER_MS);

    return () => clearTimeout(timeout);
  }, [isAutoMode, isExpired, fallbackIndex, triggerAutoTransition]);

  return {
    isAutoMode,
    triggerAutoTransition,
  };
}
