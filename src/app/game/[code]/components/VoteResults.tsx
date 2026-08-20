/**
 * VoteResults - Display vote results after council resolution
 * Y2K Sticker aesthetic
 * 
 * Shows:
 * - Who voted for whom (with anonymous votes hidden as "???")
 * - Vote counts per target
 * - Eliminated player (or tie/immunity info)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { VoteResults as VoteResultsType } from '../hooks/useVoting';

interface VoteResultsProps {
  results: VoteResultsType;
  onDismiss?: () => void;
}

export function VoteResults({ results, onDismiss }: VoteResultsProps) {
  const { eliminated, voteDetails, voteCounts, immunityUsed, tie, gameOver, winner } = results;

  // Group votes by target for better display
  const votesByTarget: Record<string, typeof voteDetails> = {};
  for (const vote of voteDetails) {
    if (!votesByTarget[vote.targetId]) {
      votesByTarget[vote.targetId] = [];
    }
    votesByTarget[vote.targetId].push(vote);
  }

  // Sort targets by vote count (descending)
  const sortedTargets = Object.entries(votesByTarget)
    .sort(([a], [b]) => (voteCounts[b] ?? 0) - (voteCounts[a] ?? 0));

  return (
    <MotionCard 
      variant="sticker" 
      rotation={-0.5}
      className="border-village-400/50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <CardHeader>
        <CardTitle className="text-village-300 flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
          >
            📊
          </motion.span>
          Résultats du vote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Result summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "p-4 rounded-xl text-center border-2",
            "shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]",
            eliminated ? "bg-blood-700/30 border-blood-500" :
            immunityUsed ? "bg-yellow-900/30 border-yellow-500" :
            tie ? "bg-night-800 border-night-600" :
            "bg-night-800 border-night-600"
          )}
        >
          {eliminated ? (
            <>
              <motion.p 
                className="text-3xl mb-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                ☠️
              </motion.p>
              <p className="text-lg font-black text-blood-400">
                {eliminated.pseudo} a été éliminé(e)
              </p>
              <span className={cn(
                "inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium",
                "border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                eliminated.team === 'village' ? "bg-village-600 border-village-400 text-white" : "bg-blood-500 border-blood-400 text-white"
              )}>
                {eliminated.role} ({eliminated.team})
              </span>
            </>
          ) : immunityUsed ? (
            <>
              <motion.p 
                className="text-3xl mb-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                🛡️
              </motion.p>
              <p className="text-lg font-bold text-yellow-400">
                Un joueur a utilisé son immunité !
              </p>
              <p className="text-sm text-moon-100/60 mt-1">
                Personne n&apos;est éliminé ce tour
              </p>
            </>
          ) : tie ? (
            <>
              <motion.p 
                className="text-3xl mb-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                ⚖️
              </motion.p>
              <p className="text-lg font-bold text-moon-100/70">
                Égalité !
              </p>
              <p className="text-sm text-moon-100/60 mt-1">
                Personne n&apos;est éliminé ce tour
              </p>
            </>
          ) : (
            <p className="text-lg text-moon-100/70">
              Aucun vote ou pas d&apos;élimination
            </p>
          )}
        </motion.div>

        {/* Game over announcement */}
        <AnimatePresence>
          {gameOver && winner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-4 rounded-xl text-center border-2",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]",
                winner === 'village' ? "bg-night-700/50 border-village-400" : "bg-blood-700/50 border-blood-500"
              )}
            >
              <motion.p 
                className="text-4xl mb-2"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {winner === 'village' ? '🏆' : '🐺'}
              </motion.p>
              <p className="text-xl font-black" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
                {winner === 'village' ? 'Le Village a gagné !' : 'Les Loups ont gagné !'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vote details */}
        {sortedTargets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-moon-100/60 uppercase tracking-wider">
              Détail des votes
            </h4>
            {sortedTargets.map(([targetId, votes], i) => {
              const targetPseudo = votes[0]?.targetPseudo ?? 'Inconnu';
              const voteCount = voteCounts[targetId] ?? votes.length;
              const isEliminated = eliminated?.id === targetId;

              return (
                <motion.div
                  key={targetId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={cn(
                    "p-3 rounded-xl border",
                    isEliminated 
                      ? "bg-blood-700/30 border-blood-500/50 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.3)]" 
                      : "bg-night-800/50 border-night-600/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "font-bold",
                      isEliminated ? "text-blood-400" : "text-white"
                    )}>
                      {isEliminated && "☠️ "}{targetPseudo}
                    </span>
                    <span className={cn(
                      "text-sm px-2.5 py-0.5 rounded-full font-bold",
                      "border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                      isEliminated ? "bg-blood-500 border-blood-400 text-white" : "bg-night-700 border-night-600 text-moon-100/80"
                    )}>
                      {voteCount} vote{voteCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {votes.map((vote, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg font-medium",
                          "border shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]",
                          vote.isAnonymous
                            ? "bg-night-700/50 border-village-400/50 text-village-300 italic"
                            : "bg-night-700/50 border-night-600/50 text-moon-100/70"
                        )}
                        title={vote.isDouble ? "Vote double" : undefined}
                      >
                        {vote.isAnonymous ? "???" : vote.voterPseudo}
                        {vote.isDouble && !vote.isAnonymous && " ✌️"}
                        {vote.isAnonymous && vote.isDouble && " (×2)"}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-moon-100/40 pt-2 border-t border-night-700">
          <span>✌️ = Vote double</span>
          <span className="text-village-300">??? = Vote anonyme</span>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <MotionButton
            variant="ghost"
            className="w-full mt-2"
            onClick={onDismiss}
          >
            Fermer
          </MotionButton>
        )}
      </CardContent>
    </MotionCard>
  );
}
