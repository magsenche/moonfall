/**
 * VotingPanel - Y2K styled day vote (conseil) UI
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface VotingPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  selectedTarget: string | null;
  confirmedVoteTarget: string | null;
  hasVoted: boolean;
  isVoting: boolean;
  voteError: string | null;
  votesCount: number;
  totalVoters: number;
  onSelectTarget: (playerId: string) => void;
  onSubmitVote: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function VotingPanel({
  alivePlayers,
  currentPlayerId,
  selectedTarget,
  confirmedVoteTarget,
  hasVoted,
  isVoting,
  voteError,
  votesCount,
  totalVoters,
  onSelectTarget,
  onSubmitVote,
}: VotingPanelProps) {
  // Filter out self
  const targets = alivePlayers.filter(p => p.id !== currentPlayerId);

  return (
    <MotionCard 
      variant="sticker" 
      rotation={0.5}
      className="mb-6 border-amber-500/50"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <span className="text-2xl">🗳️</span>
          Votre vote
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {hasVoted ? (
            <motion.div
              key="voted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className={cn(
                  'inline-block px-4 py-2 rounded-xl mb-4',
                  'bg-emerald-600 border-2 border-white text-white font-bold',
                  'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]'
                )}
              >
                ✅ Vote enregistré !
              </motion.div>
              
              {confirmedVoteTarget && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-amber-400 mt-3"
                >
                  🗳️ Vous avez voté contre : 
                  <span className="font-bold ml-1">
                    {alivePlayers.find(p => p.id === confirmedVoteTarget)?.pseudo || 'Inconnu'}
                  </span>
                </motion.p>
              )}
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-xs text-slate-400"
              >
                <span className="inline-block px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
                  En attente... ({votesCount}/{totalVoters})
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="voting"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <div className="grid grid-cols-2 gap-2 mb-4">
                {targets.map((player, i) => (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onSelectTarget(player.id)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                      selectedTarget === player.id
                        ? "bg-red-500/30 border-2 border-red-500 shadow-[3px_3px_0px_0px_rgba(220,38,38,0.5)]"
                        : "bg-zinc-800/50 hover:bg-red-900/30 border-2 border-transparent"
                    )}
                  >
                    <div className="relative">
                      <PlayerAvatar
                        playerId={player.id}
                        pseudo={player.pseudo}
                        size="sm"
                        showDeadSticker={false}
                      />
                      {selectedTarget === player.id && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            'absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full',
                            'bg-red-600 border border-white text-white font-bold',
                            'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                          )}
                        >
                          ☠️
                        </motion.span>
                      )}
                    </div>
                    <span className="font-medium text-white text-sm truncate w-full text-center">
                      {player.pseudo}
                    </span>
                  </motion.button>
                ))}
              </div>
              
              <MotionButton
                variant="sticker"
                className={cn(
                  "w-full",
                  selectedTarget 
                    ? "bg-red-600 border-red-400 hover:bg-red-500" 
                    : "bg-zinc-700"
                )}
                onClick={onSubmitVote}
                disabled={!selectedTarget || isVoting}
              >
                {isVoting ? '⏳ Vote en cours...' : '🗳️ Confirmer le vote'}
              </MotionButton>
              
              <AnimatePresence>
                {voteError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      'text-sm text-center mt-3 px-3 py-2 rounded-lg',
                      'bg-red-900/50 border border-red-500/50 text-red-400'
                    )}
                  >
                    {voteError}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
