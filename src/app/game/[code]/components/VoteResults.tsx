/**
 * VoteResults - Display vote results after council resolution
 * 
 * Shows:
 * - Who voted for whom (with anonymous votes hidden as "???")
 * - Vote counts per target
 * - Eliminated player (or tie/immunity info)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
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
    <Card className="mb-6 border-2 border-purple-500/50 bg-purple-950/20">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          📊 Résultats du vote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Result summary */}
        <div className={cn(
          "p-4 rounded-xl text-center",
          eliminated ? "bg-red-900/30 border border-red-500/30" :
          immunityUsed ? "bg-yellow-900/30 border border-yellow-500/30" :
          tie ? "bg-slate-800/50 border border-slate-500/30" :
          "bg-slate-800/50"
        )}>
          {eliminated ? (
            <>
              <p className="text-2xl mb-2">☠️</p>
              <p className="text-lg font-bold text-red-400">
                {eliminated.pseudo} a été éliminé(e)
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Rôle révélé : {eliminated.role} ({eliminated.team})
              </p>
            </>
          ) : immunityUsed ? (
            <>
              <p className="text-2xl mb-2">🛡️</p>
              <p className="text-lg font-bold text-yellow-400">
                Un joueur a utilisé son immunité !
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Personne n&apos;est éliminé ce tour
              </p>
            </>
          ) : tie ? (
            <>
              <p className="text-2xl mb-2">⚖️</p>
              <p className="text-lg font-bold text-slate-300">
                Égalité !
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Personne n&apos;est éliminé ce tour
              </p>
            </>
          ) : (
            <>
              <p className="text-lg text-slate-300">
                Aucun vote ou pas d&apos;élimination
              </p>
            </>
          )}
        </div>

        {/* Game over announcement */}
        {gameOver && winner && (
          <div className={cn(
            "p-4 rounded-xl text-center",
            winner === 'village' ? "bg-blue-900/30 border border-blue-500/50" : "bg-red-900/30 border border-red-500/50"
          )}>
            <p className="text-2xl mb-2">{winner === 'village' ? '🏆' : '🐺'}</p>
            <p className="text-lg font-bold">
              {winner === 'village' ? 'Le Village a gagné !' : 'Les Loups ont gagné !'}
            </p>
          </div>
        )}

        {/* Vote details */}
        {sortedTargets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Détail des votes
            </h4>
            {sortedTargets.map(([targetId, votes]) => {
              const targetPseudo = votes[0]?.targetPseudo ?? 'Inconnu';
              const voteCount = voteCounts[targetId] ?? votes.length;
              const isEliminated = eliminated?.id === targetId;

              return (
                <div
                  key={targetId}
                  className={cn(
                    "p-3 rounded-lg",
                    isEliminated ? "bg-red-900/20 border border-red-500/30" : "bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "font-medium",
                      isEliminated ? "text-red-400" : "text-white"
                    )}>
                      {isEliminated && "☠️ "}{targetPseudo}
                    </span>
                    <span className={cn(
                      "text-sm px-2 py-0.5 rounded-full",
                      isEliminated ? "bg-red-500/30 text-red-300" : "bg-slate-700 text-slate-300"
                    )}>
                      {voteCount} vote{voteCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {votes.map((vote, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "text-xs px-2 py-1 rounded",
                          vote.isAnonymous
                            ? "bg-purple-900/50 text-purple-300 italic"
                            : "bg-slate-700/50 text-slate-300"
                        )}
                        title={vote.isDouble ? "Vote double" : undefined}
                      >
                        {vote.isAnonymous ? "???" : vote.voterPseudo}
                        {vote.isDouble && !vote.isAnonymous && " ✌️"}
                        {vote.isAnonymous && vote.isDouble && " (×2)"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-700">
          <span>✌️ = Vote double</span>
          <span className="text-purple-400">??? = Vote anonyme</span>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={onDismiss}
          >
            Fermer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
