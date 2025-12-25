/**
 * CouncilPhaseLayout - Council voting phase layout
 * 
 * Players vote to eliminate a suspect.
 * Tense atmosphere with voting UI.
 */

'use client';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Role, PartialPlayer } from '../hooks';
import type { VoteResults as VoteResultsType } from '../hooks/useVoting';
import type { RoleConfig } from '@/config/roles';

import { PlayerRoleCard } from './PlayerRoleCard';
import { VotingPanel } from './VotingPanel';
import { VoteResults } from './VoteResults';

interface CouncilPhaseLayoutProps {
  // Player info
  currentPlayerId: string | null;
  currentPlayer: PartialPlayer | null | undefined;
  currentRole: Role | null | undefined;
  roleConfig: RoleConfig | null;
  
  // Alive players for voting
  alivePlayers: PartialPlayer[];
  
  // MJ & auto mode
  isMJ: boolean;
  isAutoMode: boolean;
  
  // Voting state
  selectedTarget: string | null;
  confirmedVoteTarget: string | null;
  hasVoted: boolean;
  isVoting: boolean;
  voteError: string | null;
  votesCount: number;
  totalVoters: number;
  onSelectTarget: (id: string | null) => void;
  onSubmitVote: () => void;
  
  // Vote results
  voteResults: VoteResultsType | null;
  onDismissResults: () => void;
}

export function CouncilPhaseLayout({
  currentPlayerId,
  currentPlayer,
  currentRole,
  roleConfig,
  alivePlayers,
  isMJ,
  isAutoMode,
  selectedTarget,
  confirmedVoteTarget,
  hasVoted,
  isVoting,
  voteError,
  votesCount,
  totalVoters,
  onSelectTarget,
  onSubmitVote,
  voteResults,
  onDismissResults,
}: CouncilPhaseLayoutProps) {
  const isAlive = currentPlayer?.is_alive !== false;
  const canVote = isAlive && (!isMJ || isAutoMode);

  return (
    <div className="space-y-4">
      {/* Council atmosphere instruction */}
      <Card className={cn(
        "border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-slate-900/50"
      )}>
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <p className="text-3xl mb-2">⚖️</p>
            <h3 className="font-bold text-white mb-2">Conseil du village</h3>
            <p className="text-slate-400 text-sm">
              {hasVoted
                ? `Vote enregistré ! (${votesCount}/${totalVoters})`
                : "Le moment est venu de désigner un suspect à éliminer."}
            </p>
            {!hasVoted && canVote && (
              <p className="text-xs text-purple-400 mt-2">
                Choisissez un joueur à éliminer ci-dessous
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player's Role Card */}
      {currentRole && roleConfig && (
        <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />
      )}

      {/* Voting Panel */}
      {canVote && (
        <VotingPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          selectedTarget={selectedTarget}
          confirmedVoteTarget={confirmedVoteTarget}
          hasVoted={hasVoted}
          isVoting={isVoting}
          voteError={voteError}
          votesCount={votesCount}
          totalVoters={totalVoters}
          onSelectTarget={onSelectTarget}
          onSubmitVote={onSubmitVote}
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
      {voteResults && (
        <VoteResults
          results={voteResults}
          onDismiss={onDismissResults}
        />
      )}
    </div>
  );
}
