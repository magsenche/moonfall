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
import { useRouter } from 'next/navigation';
import { submitVote as apiSubmitVote, resolveVote as apiResolveVote, ApiError, VoteDetail, VoteResolveResponse } from '@/lib/api';

interface UseVotingOptions {
  gameCode: string;
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

  // Vote results (after resolution)
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null);

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
      // Clear vote results when leaving conseil phase
      if (previousStatusRef.current === 'conseil' || gameStatus === 'conseil') {
        setVoteResults(null);
      }
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
      router.refresh();
    } catch (err) {
      console.error('Vote resolution error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  }, [gameCode, router]);

  // Clear vote results (called when transitioning away)
  const clearVoteResults = useCallback(() => {
    setVoteResults(null);
  }, []);

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
    voteResults,
    
    // Actions
    setSelectedTarget,
    submitVote,
    resolveVote,
    clearVoteResults,
  };
}
