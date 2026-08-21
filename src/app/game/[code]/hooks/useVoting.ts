/**
 * useVoting - Day vote (conseil) logic
 * 
 * Handles:
 * - Target selection
 * - Vote submission
 * - Vote resolution (MJ)
 * - State reset on phase change
 * - Vote results display (who voted for whom)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { submitVote as apiSubmitVote, resolveVote as apiResolveVote, ApiError, VoteDetail, VoteResolveResponse } from '@/lib/api';

interface UseVotingOptions {
  gameCode: string;
  gameId: string;
  currentPlayerId: string | null;
  gameStatus: string;
}

export interface VoteResults {
  eliminated: { id: string; pseudo: string; role: string; team: string } | null;
  voteDetails: VoteDetail[];
  voteCounts: Record<string, number>;
  immunityUsed?: boolean;
  tie?: boolean;
  gameOver?: boolean;
  winner?: string;
}

export function useVoting({ gameCode, gameId, currentPlayerId, gameStatus }: UseVotingOptions) {
  // Vote state — la cible en cours de sélection vit dans VotingPanel
  // (la hisser ici faisait re-render tout l'écran à chaque tap)
  const [confirmedVoteTarget, setConfirmedVoteTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votesCount, setVotesCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  // Vote results (after resolution)
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null);

  // Phase change state
  const [isChangingPhase, setIsChangingPhase] = useState(false);

  // Reset vote state when phase changes
  const previousStatusRef = useRef<string>(gameStatus);
  useEffect(() => {
    if (gameStatus !== previousStatusRef.current) {
      setHasVoted(false);
      setConfirmedVoteTarget(null);
      setVotesCount(0);
      // Clear vote results when leaving conseil phase
      if (previousStatusRef.current === 'conseil' || gameStatus === 'conseil') {
        setVoteResults(null);
      }
      previousStatusRef.current = gameStatus;
    }
  }, [gameStatus]);

  // Submit vote — optimiste : le tap est confirmé immédiatement, rollback
  // avec erreur affichée si l'API refuse (pas de fallback silencieux)
  const submitVote = useCallback(async (targetId: string) => {
    if (!currentPlayerId || !targetId) return;

    const previousTarget = confirmedVoteTarget;
    const hadVoted = hasVoted;
    setConfirmedVoteTarget(targetId);
    setHasVoted(true);
    setIsVoting(true);
    setVoteError(null);

    try {
      const data = await apiSubmitVote(gameCode, currentPlayerId, targetId);
      setVotesCount(data.votesCount);
      setTotalVoters(data.totalPlayers);
    } catch (err) {
      setConfirmedVoteTarget(previousTarget);
      setHasVoted(hadVoted);
      setVoteError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsVoting(false);
    }
  }, [currentPlayerId, gameCode, confirmedVoteTarget, hasVoted]);

  // Resolve vote (MJ only)
  const resolveVote = useCallback(async () => {
    setIsChangingPhase(true);
    
    try {
      const result = await apiResolveVote(gameCode);
      // Store vote results for display
      setVoteResults({
        eliminated: result.eliminated,
        voteDetails: result.voteDetails,
        voteCounts: result.voteCounts,
        immunityUsed: result.immunityUsed,
        tie: result.tie,
        gameOver: result.gameOver,
        winner: result.winner,
      });
      // Le realtime propage le nouveau statut : pas de router.refresh, il
      // re-exécutait toute la page serveur au pire moment
    } catch (err) {
      console.error('Vote resolution error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  }, [gameCode]);

  // Clear vote results (called when transitioning away)
  const clearVoteResults = useCallback(() => {
    setVoteResults(null);
  }, []);

  // Realtime subscription for vote count updates
  useEffect(() => {
    // Only subscribe during conseil phase and when not voted yet
    if (gameStatus !== 'conseil') return;
    
    const supabase = createClient();
    
    // Fetch current vote count on mount/status change
    const fetchVoteCount = async () => {
      try {
        // current_phase et settings peuvent bouger : lecture par id (indexée)
        const { data: gameData } = await supabase
          .from('games')
          .select('current_phase, settings')
          .eq('id', gameId)
          .single();

        if (!gameData) return;

        // Count votes for current phase only
        const { count: voteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .eq('phase', gameData.current_phase ?? 0)
          .eq('vote_type', 'jour');

        // Count alive non-MJ players (or MJ in auto mode)
        const { data: players } = await supabase
          .from('players')
          .select('is_mj, is_alive')
          .eq('game_id', gameId);

        const settings = gameData.settings as { autoMode?: boolean } | null;
        const isAutoMode = settings?.autoMode === true;
        const totalVoters = players?.filter(p =>
          p.is_alive && (!p.is_mj || isAutoMode)
        ).length || 0;

        setVotesCount(voteCount || 0);
        setTotalVoters(totalVoters);
      } catch (err) {
        console.error('Error fetching vote count:', err);
      }
    };

    fetchVoteCount();

    // Subscribe to vote changes — filtré par partie : sans le filtre, chaque
    // client recevait les votes de TOUTES les parties du serveur et relançait
    // trois requêtes à chacun
    const channel = supabase
      .channel(`votes:${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchVoteCount();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode, gameId, gameStatus]);

  return {
    // State
    confirmedVoteTarget,
    hasVoted,
    isVoting,
    voteError,
    votesCount,
    totalVoters,
    isChangingPhase,
    voteResults,
    
    // Actions
    submitVote,
    resolveVote,
    clearVoteResults,
  };
}
