/**
 * CouncilPhaseLayout - Council voting phase layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { useGame } from '../context';

import { PhaseHint } from './PhaseHint';
import { PlayerRoleCard } from './PlayerRoleCard';
import { VotingPanel } from './VotingPanel';
import { VoteResults } from './VoteResults';

export function CouncilPhaseLayout() {
  const {
    currentPlayerId,
    currentRole,
    roleConfig,
    alivePlayers,
    isMJ,
    isAutoMode,
    isAlive,
    voting,
  } = useGame();

  const canVote = isAlive && (!isMJ || isAutoMode);

  return (
    <div className="space-y-4">
      {/* Consigne du conseil : une ligne — le panneau de vote juste dessous
          porte déjà l'état « vote enregistré » et le compteur */}
      <PhaseHint emoji="⚖️" className="border-village-400/50">
        {canVote
          ? 'Le moment est venu de désigner un suspect à éliminer.'
          : 'Le village vote... Observez en silence.'}
      </PhaseHint>

      {/* Rôle : grande carte tant qu'il n'est pas révélé, pilule ensuite */}
      {currentRole && roleConfig && <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />}

      {/* Voting Panel - l'action du conseil, au-dessus du fold */}
      {canVote && (
        <VotingPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          confirmedVoteTarget={voting.confirmedVoteTarget}
          hasVoted={voting.hasVoted}
          isVoting={voting.isVoting}
          voteError={voting.voteError}
          votesCount={voting.votesCount}
          totalVoters={voting.totalVoters}
          onSubmitVote={voting.submitVote}
        />
      )}

      {/* Vote Results - Show after resolution */}
      {voting.voteResults && (
        <VoteResults results={voting.voteResults} onDismiss={voting.clearVoteResults} />
      )}
    </div>
  );
}
