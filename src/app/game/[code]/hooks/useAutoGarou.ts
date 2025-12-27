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
}

export function useAutoGarou({
  gameCode,
  gameStatus,
  isAutoMode,
  isExpired,
  currentPlayerId,
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
        // Resolve night also transitions to 'jour'
        await apiResolveNightVote(gameCode, false);
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

    // Small delay to ensure all clients see 0:00
    const timeout = setTimeout(() => {
      triggerAutoTransition();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isAutoMode, isExpired, triggerAutoTransition]);

  return {
    isAutoMode,
    triggerAutoTransition,
  };
}
