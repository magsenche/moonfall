/**
 * WolfNightVote - Wolf pack night vote UI
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
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
    <Card className="mb-6 border border-red-500/30">
      <CardHeader>
        <CardTitle className="text-red-400">🩸 Choisir une victime</CardTitle>
      </CardHeader>
      <CardContent>
        {hasNightVoted ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-red-300">Vote enregistré</p>
            {confirmedNightTarget && (
              <p className="text-sm text-red-400 mt-2">
                🩸 Vous avez voté pour : <span className="font-bold">
                  {alivePlayers.find(p => p.id === confirmedNightTarget)?.pseudo || 'Inconnu'}
                </span>
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              En attente de la meute...
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
                      nightTarget === player.id
                        ? "bg-red-500/30 border-2 border-red-500"
                        : "bg-slate-800/50 hover:bg-red-900/30 border-2 border-transparent"
                    )}
                  >
                    <PlayerAvatar
                      playerId={player.id}
                      pseudo={player.pseudo}
                      size="sm"
                    />
                    <span className="font-medium text-white">{player.pseudo}</span>
                    {nightTarget === player.id && (
                      <span className="ml-auto text-red-400">🩸</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={onSubmitVote}
              disabled={!nightTarget || isNightVoting}
            >
              {isNightVoting ? '⏳ Vote en cours...' : '🐺 Dévorer cette proie'}
            </Button>
            {nightVoteError && (
              <p className="text-sm text-red-400 text-center mt-2">{nightVoteError}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
