/**
 * useVoting - Day vote (conseil) logic
 * 
 * Handles:
 * - Target selection
 * - Vote submission
 * - Vote resolution (MJ)
 * - State reset on phase change
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { submitVote as apiSubmitVote, resolveVote as apiResolveVote, ApiError } from '@/lib/api';

interface UseVotingOptions {
  gameCode: string;
  currentPlayerId: string | null;
  gameStatus: string;
}

export function useVoting({ gameCode, currentPlayerId, gameStatus }: UseVotingOptions) {
  const router = useRouter();
  
  // Vote state
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmedVoteTarget, setConfirmedVoteTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votesCount, setVotesCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  // Phase change state
  const [isChangingPhase, setIsChangingPhase] = useState(false);

  // Reset vote state when phase changes
  const previousStatusRef = useRef<string>(gameStatus);
  useEffect(() => {
    if (gameStatus !== previousStatusRef.current) {
      setHasVoted(false);
      setSelectedTarget(null);
      setConfirmedVoteTarget(null);
      setVotesCount(0);
      previousStatusRef.current = gameStatus;
    }
  }, [gameStatus]);

  // Submit vote
  const submitVote = useCallback(async () => {
    if (!currentPlayerId || !selectedTarget) return;
    
    setIsVoting(true);
    setVoteError(null);
    
    try {
      const data = await apiSubmitVote(gameCode, currentPlayerId, selectedTarget);
      setConfirmedVoteTarget(selectedTarget);
      setHasVoted(true);
      setVotesCount(data.votesCount);
      setTotalVoters(data.totalPlayers);
    } catch (err) {
      setVoteError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsVoting(false);
    }
  }, [currentPlayerId, selectedTarget, gameCode]);

  // Resolve vote (MJ only)
  const resolveVote = useCallback(async () => {
    setIsChangingPhase(true);
    
    try {
      await apiResolveVote(gameCode);
      router.refresh();
    } catch (err) {
      console.error('Vote resolution error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  }, [gameCode, router]);

  return {
    // State
    selectedTarget,
    confirmedVoteTarget,
    hasVoted,
    isVoting,
    voteError,
    votesCount,
    totalVoters,
    isChangingPhase,
    
    // Actions
    setSelectedTarget,
    submitVote,
    resolveVote,
  };
}
