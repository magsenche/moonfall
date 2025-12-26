/**
 * WolfNightVote - Wolf pack night vote UI
 * Y2K Sticker aesthetic
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface WolfNightVoteProps {
  alivePlayers: PartialPlayer[];
  wolves: PartialPlayer[];
  nightTarget: string | null;
  confirmedNightTarget: string | null;
  hasNightVoted: boolean;
  isNightVoting: boolean;
  nightVoteError: string | null;
  onSelectTarget: (playerId: string) => void;
  onSubmitVote: () => void;
}

export function WolfNightVote({
  alivePlayers,
  wolves,
  nightTarget,
  confirmedNightTarget,
  hasNightVoted,
  isNightVoting,
  nightVoteError,
  onSelectTarget,
  onSubmitVote,
}: WolfNightVoteProps) {
  // Filter out wolves from targets
  const targets = alivePlayers.filter(p => !wolves.some(w => w.id === p.id));

  return (
    <MotionCard 
      variant="sticker" 
      rotation={-1}
      className="mb-6 border-red-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🩸
          </motion.span>
          Choisir une victime
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {hasNightVoted ? (
            <motion.div 
              key="voted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.p 
                className="text-2xl mb-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                ✅
              </motion.p>
              <p className="text-red-300 font-bold">Vote enregistré</p>
              {confirmedNightTarget && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'inline-block mt-3 px-4 py-2 rounded-xl',
                    'bg-red-900/50 border border-red-500/50'
                  )}
                >
                  <span className="text-red-400">🩸 Cible :</span>{' '}
                  <span className="font-bold text-white">
                    {alivePlayers.find(p => p.id === confirmedNightTarget)?.pseudo || 'Inconnu'}
                  </span>
                </motion.div>
              )}
              <p className="text-xs text-slate-500 mt-3">
                En attente de la meute...
              </p>
            </motion.div>
          ) : (
            <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                      nightTarget === player.id
                        ? "bg-red-500/30 border-2 border-red-500 shadow-[3px_3px_0px_0px_rgba(220,38,38,0.5)]"
                        : "bg-zinc-800/50 hover:bg-red-900/30 border-2 border-transparent"
                    )}
                  >
                    <div className="relative">
                      <PlayerAvatar
                        playerId={player.id}
                        pseudo={player.pseudo}
                        size="sm"
                      />
                      {nightTarget === player.id && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            'absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full',
                            'bg-red-600 border border-white text-white font-bold',
                            'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                          )}
                        >
                          🩸
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
                className="w-full bg-red-600 border-red-400 hover:bg-red-500"
                onClick={onSubmitVote}
                disabled={!nightTarget || isNightVoting}
              >
                {isNightVoting ? '⏳ Vote en cours...' : '🐺 Dévorer cette proie'}
              </MotionButton>
              <AnimatePresence>
                {nightVoteError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-400 text-center mt-2"
                  >
                    {nightVoteError}
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
