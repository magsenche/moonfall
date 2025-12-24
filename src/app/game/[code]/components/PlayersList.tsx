/**
 * PlayersList - Display list of players with roles (for in-game view)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import type { PartialPlayer, Role } from '../hooks/types';

interface PlayersListProps {
  players: PartialPlayer[];
  roles: Role[];
  currentPlayerId: string | null;
  isMJ: boolean;
  isWolf: boolean;
  wolves: PartialPlayer[];
}

export function PlayersList({
  players,
  roles,
  currentPlayerId,
  isMJ,
  isWolf,
  wolves,
}: PlayersListProps) {
  const alivePlayers = players.filter(p => !p.is_mj && p.is_alive !== false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Joueurs</span>
          <span className="text-sm font-normal text-slate-400">
            {alivePlayers.length} en vie
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {players
            .filter(p => !p.is_mj)
            .map((player) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const playerRole = roles.find(r => r.id === player.role_id);
              const pRoleConfig = playerRole ? getRoleConfig(playerRole.name) : null;
              const isDead = player.is_alive === false;
              // MJ can see all roles, wolves can see other wolves
              const canSeeRole = isMJ || isCurrentPlayer || (isWolf && wolves.some(w => w.id === player.id));

              return (
                <li
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    isDead && "opacity-50",
                    isCurrentPlayer
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : isMJ && playerRole?.team === 'loups'
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-slate-800/50"
                  )}
                >
                  <PlayerAvatar
                    playerId={player.id}
                    pseudo={player.pseudo}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className={cn("font-medium", isDead ? "text-slate-500 line-through" : "text-white")}>
                      {player.pseudo}
                      {isCurrentPlayer && <span className="text-indigo-400 text-sm ml-2">(Vous)</span>}
                      {isDead && <span className="text-red-400 text-sm ml-2">☠️</span>}
                    </p>
                    {/* MJ sees role name for all players */}
                    {isMJ && pRoleConfig && !isDead && (
                      <p className={cn(
                        "text-xs",
                        playerRole?.team === 'loups' ? "text-red-400" : "text-blue-400"
                      )}>
                        {pRoleConfig.displayName}
                      </p>
                    )}
                    {isDead && pRoleConfig && (
                      <p className="text-xs text-slate-500">
                        était {pRoleConfig.displayName}
                      </p>
                    )}
                  </div>
                  {/* Show role icon for MJ, self, and wolves see other wolves */}
                  {!isDead && canSeeRole && pRoleConfig && (
                    <span className="text-lg">{pRoleConfig.assets.icon}</span>
                  )}
                </li>
              );
            })}
        </ul>
      </CardContent>
    </Card>
  );
}
