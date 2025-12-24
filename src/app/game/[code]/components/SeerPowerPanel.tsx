/**
 * SeerPowerPanel - Voyante power usage UI
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer, SeerResult } from '../hooks/types';

interface SeerPowerPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  seerTarget: string | null;
  seerResult: SeerResult | null;
  hasUsedSeerPower: boolean;
  isUsingSeerPower: boolean;
  seerError: string | null;
  onSelectTarget: (playerId: string) => void;
  onUsePower: () => void;
}

export function SeerPowerPanel({
  alivePlayers,
  currentPlayerId,
  seerTarget,
  seerResult,
  hasUsedSeerPower,
  isUsingSeerPower,
  seerError,
  onSelectTarget,
  onUsePower,
}: SeerPowerPanelProps) {
  // Filter out self
  const targets = alivePlayers.filter(p => p.id !== currentPlayerId);

  return (
    <Card className="mb-6 border border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-purple-400">👁️ Votre don de voyance</CardTitle>
      </CardHeader>
      <CardContent>
        {seerResult ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🔮</p>
            <p className="text-white text-lg font-bold mb-2">
              {seerResult.targetName}
            </p>
            <p className="text-slate-300 mb-2">
              est <span className={cn(
                "font-bold",
                seerResult.team === 'loups' ? "text-red-400" : "text-blue-400"
              )}>
                {seerResult.roleName === 'loup_garou' ? 'Loup-Garou' :
                 seerResult.roleName === 'villageois' ? 'Villageois' :
                 seerResult.roleName}
              </span>
            </p>
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-sm",
              seerResult.team === 'loups'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-blue-500/20 text-blue-400'
            )}>
              Équipe {seerResult.team === 'loups' ? 'Loups-Garous' : 'Village'}
            </span>
          </div>
        ) : hasUsedSeerPower ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-slate-300">Pouvoir utilisé cette nuit</p>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4 text-center">
              Choisissez un joueur pour découvrir son rôle
            </p>
            <ul className="space-y-2 mb-4">
              {targets.map((player) => (
                <li key={player.id}>
                  <button
                    onClick={() => onSelectTarget(player.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                      seerTarget === player.id
                        ? "bg-purple-500/30 border-2 border-purple-500"
                        : "bg-slate-800/50 hover:bg-purple-900/20 border-2 border-transparent"
                    )}
                  >
                    <PlayerAvatar
                      playerId={player.id}
                      pseudo={player.pseudo}
                      size="sm"
                    />
                    <span className="font-medium text-white">{player.pseudo}</span>
                    {seerTarget === player.id && (
                      <span className="ml-auto text-purple-400">👁️</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={onUsePower}
              disabled={!seerTarget || isUsingSeerPower}
            >
              {isUsingSeerPower ? '⏳ Vision en cours...' : '🔮 Sonder cette âme'}
            </Button>
            {seerError && (
              <p className="text-sm text-red-400 text-center mt-2">{seerError}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
