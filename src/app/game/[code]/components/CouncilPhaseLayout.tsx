/**
 * CouncilPhaseLayout - Council voting phase layout
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

import { PlayerRoleCard } from './PlayerRoleCard';
import { VotingPanel } from './VotingPanel';
import { VoteResults } from './VoteResults';

export function CouncilPhaseLayout() {
  const {
    currentPlayerId,
    currentPlayer,
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
      {/* Council atmosphere instruction */}
      <Card
        className={cn(
          'border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-slate-900/50'
        )}
      >
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <p className="text-3xl mb-2">⚖️</p>
            <h3 className="font-bold text-white mb-2">Conseil du village</h3>
            <p className="text-slate-400 text-sm">
              {voting.hasVoted
                ? `Vote enregistré ! (${voting.votesCount}/${voting.totalVoters})`
                : 'Le moment est venu de désigner un suspect à éliminer.'}
            </p>
            {!voting.hasVoted && canVote && (
              <p className="text-xs text-purple-400 mt-2">
                Choisissez un joueur à éliminer ci-dessous
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player's Role Card */}
      {currentRole && roleConfig && <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />}

      {/* Voting Panel */}
      {canVote && (
        <VotingPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          selectedTarget={voting.selectedTarget}
          confirmedVoteTarget={voting.confirmedVoteTarget}
          hasVoted={voting.hasVoted}
          isVoting={voting.isVoting}
          voteError={voting.voteError}
          votesCount={voting.votesCount}
          totalVoters={voting.totalVoters}
          onSelectTarget={voting.setSelectedTarget}
          onSubmitVote={voting.submitVote}
        />
      )}

      {/* Dead player message */}
      {!isAlive && (
        <Card className="border-slate-700/50">
          <CardContent className="py-6 text-center">
            <p className="text-3xl mb-2">👻</p>
            <p className="text-slate-400 text-sm">
              Vous êtes mort... Observez le vote en silence.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vote Results - Show after resolution */}
      {voting.voteResults && (
        <VoteResults results={voting.voteResults} onDismiss={voting.clearVoteResults} />
      )}
    </div>
  );
}
