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
import { createClient } from '@/lib/supabase/client';
import {
  submitNightVote as apiSubmitNightVote,
  resolveNightVote as apiResolveNightVote,
  getNightVoteStatus,
  useSeerPower as apiUseSeerPower,
  ApiError
} from '@/lib/api';
import type { SeerResult } from './types';

interface UseNightActionsOptions {
  gameCode: string;
  currentPlayerId: string | null;
  gameStatus: string;
  isSeer: boolean;
  isMJ: boolean;
}

export function useNightActions({
  gameCode,
  currentPlayerId,
  gameStatus,
  isSeer,
  isMJ,
}: UseNightActionsOptions) {
  // Wolf vote state — la cible en cours de sélection vit dans WolfNightVote
  // (la hisser ici faisait re-render tout l'écran à chaque tap)
  const [confirmedNightTarget, setConfirmedNightTarget] = useState<string | null>(null);
  const [hasNightVoted, setHasNightVoted] = useState(false);
  const [isNightVoting, setIsNightVoting] = useState(false);
  const [nightVoteError, setNightVoteError] = useState<string | null>(null);
  const [wolfVoteCount, setWolfVoteCount] = useState({ voted: 0, total: 0 });
  
  // Night vote resolution state (MJ)
  const [nightVoteResolveError, setNightVoteResolveError] = useState<string | null>(null);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [isChangingPhase, setIsChangingPhase] = useState(false);

  // Seer power state — la cible en cours de sélection vit dans SeerPowerPanel
  const [seerResult, setSeerResult] = useState<SeerResult | null>(null);
  const [seerHistory, setSeerHistory] = useState<SeerResult[]>([]);
  const [hasUsedSeerPower, setHasUsedSeerPower] = useState(false);
  const [isUsingSeerPower, setIsUsingSeerPower] = useState(false);
  const [seerError, setSeerError] = useState<string | null>(null);

  // Reset state on phase change
  const previousStatusRef = useRef<string>(gameStatus);
  useEffect(() => {
    if (gameStatus !== previousStatusRef.current) {
      // Wolf vote reset
      setHasNightVoted(false);
      setConfirmedNightTarget(null);
      setWolfVoteCount({ voted: 0, total: 0 });
      setNightVoteResolveError(null);
      setShowForceConfirm(false);
      // Seer power reset (for new night)
      setSeerResult(null);
      setHasUsedSeerPower(false);
      setSeerError(null);
      previousStatusRef.current = gameStatus;
    }
  }, [gameStatus]);

  // Submit wolf night vote — optimiste : le tap est confirmé immédiatement,
  // rollback avec erreur affichée si l'API refuse (pas de fallback silencieux)
  const submitNightVote = useCallback(async (targetId: string) => {
    if (!currentPlayerId || !targetId) return;

    const previousTarget = confirmedNightTarget;
    const hadVoted = hasNightVoted;
    setConfirmedNightTarget(targetId);
    setHasNightVoted(true);
    setIsNightVoting(true);
    setNightVoteError(null);

    try {
      await apiSubmitNightVote(gameCode, currentPlayerId, targetId);
    } catch (err) {
      setConfirmedNightTarget(previousTarget);
      setHasNightVoted(hadVoted);
      setNightVoteError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsNightVoting(false);
    }
  }, [currentPlayerId, gameCode, confirmedNightTarget, hasNightVoted]);

  // Resolve night vote (MJ)
  const resolveNightVote = useCallback(async (force = false) => {
    setIsChangingPhase(true);
    setNightVoteResolveError(null);
    
    try {
      await apiResolveNightVote(gameCode, force);
      // Reset state — le realtime propage le nouveau statut, pas besoin de
      // re-exécuter la page serveur (router.refresh doublonnait l'aller-retour)
      setHasNightVoted(false);
      setConfirmedNightTarget(null);
      setShowForceConfirm(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Check if we can force resolve
        try {
          const status = await getNightVoteStatus(gameCode);
          if (!status.canResolve && !force) {
            setNightVoteResolveError(`${status.voted}/${status.total} loups ont voté`);
            setShowForceConfirm(true);
            return;
          }
        } catch {
          // Ignore status check errors
        }
      }
      console.error('Night vote resolution error:', err);
      setNightVoteResolveError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsChangingPhase(false);
    }
  }, [gameCode]);

  // Fetch wolf vote count (MJ)
  const fetchWolfVoteCount = useCallback(async () => {
    try {
      const data = await getNightVoteStatus(gameCode);
      setWolfVoteCount({ voted: data.voted, total: data.total });
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

  // Use seer power (pas d'optimisme possible : on attend la vision)
  const useSeerPower = useCallback(async (targetId: string) => {
    if (!currentPlayerId || !targetId) return;

    setIsUsingSeerPower(true);
    setSeerError(null);

    try {
      const data = await apiUseSeerPower(gameCode, currentPlayerId, targetId);
      setSeerResult(data.result);
      setHasUsedSeerPower(true);
      // Add to history
      setSeerHistory(prev => [...prev, data.result]);
    } catch (err) {
      setSeerError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsUsingSeerPower(false);
    }
  }, [currentPlayerId, gameCode]);

  // Fetch seer power history — voyante uniquement : ces deux requêtes
  // partaient chez TOUS les joueurs à chaque changement de phase
  useEffect(() => {
    if (!isSeer || !currentPlayerId || gameStatus === 'lobby') return;
    
    const supabase = createClient();
    
    const fetchSeerHistory = async () => {
      try {
        // Get game id
        const { data: game } = await supabase
          .from('games')
          .select('id')
          .eq('code', gameCode)
          .single();
        
        if (!game) return;
        
        // Get all seer power uses for this player
        const { data: powerUses } = await supabase
          .from('power_uses')
          .select(`
            result,
            phase,
            target:target_id (
              id,
              pseudo
            )
          `)
          .eq('game_id', game.id)
          .eq('player_id', currentPlayerId)
          .order('phase', { ascending: true });
        
        if (powerUses) {
          const history = powerUses
            .filter(use => use.result)
            .map(use => {
              // DB stores snake_case, but SeerResult uses camelCase
              const result = use.result as Record<string, unknown>;
              return {
                targetName: (result.target_name ?? result.targetName) as string,
                roleName: (result.role_name ?? result.roleName) as string,
                team: result.team as string,
              };
            });
          setSeerHistory(history);
        }
      } catch (err) {
        console.error('Error fetching seer history:', err);
      }
    };
    
    fetchSeerHistory();
  }, [currentPlayerId, gameCode, gameStatus]);

  return {
    // Wolf vote state
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
    seerResult,
    seerHistory,
    hasUsedSeerPower,
    isUsingSeerPower,
    seerError,

    // Wolf actions
    submitNightVote,
    resolveNightVote,
    setShowForceConfirm,

    // Seer actions
    useSeerPower,
  };
}
