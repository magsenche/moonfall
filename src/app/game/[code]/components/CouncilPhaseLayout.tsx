/**
 * CouncilPhaseLayout - Council voting phase layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';
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
      <MotionCard
        variant="sticker"
        rotation={-0.5}
        className="border-purple-500/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <motion.p 
              className="text-4xl mb-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⚖️
            </motion.p>
            <h3 className="font-black text-white text-lg mb-2" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
              Conseil du village
            </h3>
            <p className="text-slate-300 text-sm">
              {voting.hasVoted
                ? `✅ Vote enregistré ! (${voting.votesCount}/${voting.totalVoters})`
                : '⚡ Le moment est venu de désigner un suspect à éliminer.'}
            </p>
            {!voting.hasVoted && canVote && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium',
                  'bg-purple-600/50 border border-purple-400/50 text-purple-200'
                )}
              >
                👇 Choisissez un joueur à éliminer ci-dessous
              </motion.p>
            )}
          </div>
        </CardContent>
      </MotionCard>

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
        <MotionCard 
          variant="sticker" 
          rotation={1}
          className="border-zinc-600"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CardContent className="py-6 text-center">
            <motion.p 
              className="text-4xl mb-2"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              👻
            </motion.p>
            <p className="text-slate-400 text-sm">
              Vous êtes mort... Observez le vote en silence.
            </p>
          </CardContent>
        </MotionCard>
      )}

      {/* Vote Results - Show after resolution */}
      {voting.voteResults && (
        <VoteResults results={voting.voteResults} onDismiss={voting.clearVoteResults} />
      )}
    </div>
  );
}
