/**
 * useNightActions - Wolf vote + Seer power
 * 
 * Handles:
 * - Wolf night vote (target selection, submission)
 * - Night vote resolution (MJ)
 * - Seer power usage
 * - Wolf vote count polling (MJ)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SeerResult } from './types';

interface UseNightActionsOptions {
  gameCode: string;
  currentPlayerId: string | null;
  gameStatus: string;
  isWolf: boolean;
  isSeer: boolean;
  isMJ: boolean;
}

export function useNightActions({
  gameCode,
  currentPlayerId,
  gameStatus,
  isMJ,
}: Omit<UseNightActionsOptions, 'isWolf' | 'isSeer'>) {
  const router = useRouter();

  // Wolf vote state
  const [nightTarget, setNightTarget] = useState<string | null>(null);
  const [confirmedNightTarget, setConfirmedNightTarget] = useState<string | null>(null);
  const [hasNightVoted, setHasNightVoted] = useState(false);
  const [isNightVoting, setIsNightVoting] = useState(false);
  const [nightVoteError, setNightVoteError] = useState<string | null>(null);
  const [wolfVoteCount, setWolfVoteCount] = useState({ voted: 0, total: 0 });
  
  // Night vote resolution state (MJ)
  const [nightVoteResolveError, setNightVoteResolveError] = useState<string | null>(null);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [isChangingPhase, setIsChangingPhase] = useState(false);

  // Seer power state
  const [seerTarget, setSeerTarget] = useState<string | null>(null);
  const [seerResult, setSeerResult] = useState<SeerResult | null>(null);
  const [hasUsedSeerPower, setHasUsedSeerPower] = useState(false);
  const [isUsingSeerPower, setIsUsingSeerPower] = useState(false);
  const [seerError, setSeerError] = useState<string | null>(null);

  // Reset state on phase change
  const previousStatusRef = useRef<string>(gameStatus);
  useEffect(() => {
    if (gameStatus !== previousStatusRef.current) {
      setHasNightVoted(false);
      setNightTarget(null);
      setConfirmedNightTarget(null);
      setWolfVoteCount({ voted: 0, total: 0 });
      setNightVoteResolveError(null);
      setShowForceConfirm(false);
      previousStatusRef.current = gameStatus;
    }
  }, [gameStatus]);

  // Submit wolf night vote
  const submitNightVote = useCallback(async () => {
    if (!currentPlayerId || !nightTarget) return;
    
    setIsNightVoting(true);
    setNightVoteError(null);
    
    try {
      const response = await fetch(`/api/games/${gameCode}/vote/night`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: currentPlayerId,
          targetId: nightTarget,
        }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du vote');
      }
      
      setConfirmedNightTarget(nightTarget);
      setHasNightVoted(true);
    } catch (err) {
      setNightVoteError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsNightVoting(false);
    }
  }, [currentPlayerId, nightTarget, gameCode]);

  // Resolve night vote (MJ)
  const resolveNightVote = useCallback(async (force = false) => {
    setIsChangingPhase(true);
    setNightVoteResolveError(null);
    
    try {
      const response = await fetch(`/api/games/${gameCode}/vote/night/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.canForce && !force) {
          setNightVoteResolveError(`${data.voted}/${data.total} loups ont voté`);
          setShowForceConfirm(true);
          return;
        }
        throw new Error(data.error || 'Erreur lors de la résolution');
      }
      
      // Reset state
      setHasNightVoted(false);
      setNightTarget(null);
      setConfirmedNightTarget(null);
      setShowForceConfirm(false);
      router.refresh();
    } catch (err) {
      console.error('Night vote resolution error:', err);
      setNightVoteResolveError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsChangingPhase(false);
    }
  }, [gameCode, router]);

  // Fetch wolf vote count (MJ)
  const fetchWolfVoteCount = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameCode}/vote/night/resolve`);
      const data = await response.json();
      if (response.ok) {
        setWolfVoteCount({ voted: data.voted, total: data.total });
      }
    } catch (err) {
      console.error('Error fetching wolf vote count:', err);
    }
  }, [gameCode]);

  // Poll wolf vote count during night (MJ only)
  useEffect(() => {
    if (!isMJ || gameStatus !== 'nuit') return;
    
    fetchWolfVoteCount();
    const interval = setInterval(fetchWolfVoteCount, 5000);
    return () => clearInterval(interval);
  }, [isMJ, gameStatus, fetchWolfVoteCount]);

  // Use seer power
  const useSeerPower = useCallback(async () => {
    if (!currentPlayerId || !seerTarget) return;
    
    setIsUsingSeerPower(true);
    setSeerError(null);
    
    try {
      const response = await fetch(`/api/games/${gameCode}/power/seer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          targetId: seerTarget,
        }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'utilisation du pouvoir");
      }
      
      setSeerResult(data.result);
      setHasUsedSeerPower(true);
    } catch (err) {
      setSeerError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsUsingSeerPower(false);
    }
  }, [currentPlayerId, seerTarget, gameCode]);

  return {
    // Wolf vote state
    nightTarget,
    confirmedNightTarget,
    hasNightVoted,
    isNightVoting,
    nightVoteError,
    wolfVoteCount,
    
    // Night resolution state (MJ)
    nightVoteResolveError,
    showForceConfirm,
    isChangingPhase,
    
    // Seer state
    seerTarget,
    seerResult,
    hasUsedSeerPower,
    isUsingSeerPower,
    seerError,
    
    // Wolf actions
    setNightTarget,
    submitNightVote,
    resolveNightVote,
    setShowForceConfirm,
    
    // Seer actions
    setSeerTarget,
    useSeerPower,
  };
}
