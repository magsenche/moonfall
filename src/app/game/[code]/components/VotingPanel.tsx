/**
 * VotingPanel - Day vote (conseil) UI
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
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
    <Card className="mb-6 border border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-amber-400">🗳️ Votre vote</CardTitle>
      </CardHeader>
      <CardContent>
        {hasVoted ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-slate-300">Vote enregistré</p>
            {confirmedVoteTarget && (
              <p className="text-sm text-amber-400 mt-2">
                🗳️ Vous avez voté contre : <span className="font-bold">
                  {alivePlayers.find(p => p.id === confirmedVoteTarget)?.pseudo || 'Inconnu'}
                </span>
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              En attente des autres joueurs... ({votesCount}/{totalVoters})
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {targets.map((player) => (
                <li key={player.id}>
                  <button
                    onClick={() => onSelectTarget(player.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                      selectedTarget === player.id
                        ? "bg-red-500/30 border-2 border-red-500"
                        : "bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent"
                    )}
                  >
                    <PlayerAvatar
                      playerId={player.id}
                      pseudo={player.pseudo}
                      size="sm"
                    />
                    <span className="font-medium text-white">{player.pseudo}</span>
                    {selectedTarget === player.id && (
                      <span className="ml-auto text-red-400">☠️</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={onSubmitVote}
              disabled={!selectedTarget || isVoting}
            >
              {isVoting ? '⏳ Vote en cours...' : '🗳️ Confirmer le vote'}
            </Button>
            {voteError && (
              <p className="text-sm text-red-400 text-center mt-2">{voteError}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
