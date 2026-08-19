/**
 * MJOverview - Game master overview panel (team counts, role distribution, victory condition)
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getRoleConfig } from '@/config/roles';
import type { PartialPlayer, Role } from '../hooks/types';

interface MJOverviewProps {
  players: PartialPlayer[];
  roles: Role[];
  alivePlayers: PartialPlayer[];
}

export function MJOverview({ players, roles, alivePlayers }: MJOverviewProps) {
  // Calculate team counts
  const aliveWolves = alivePlayers.filter(p => {
    const r = roles.find(role => role.id === p.role_id);
    return r?.team === 'loups';
  }).length;

  const aliveVillagers = alivePlayers.filter(p => {
    const r = roles.find(role => role.id === p.role_id);
    return r?.team !== 'loups';
  }).length;

  return (
    <Card className="mt-6 border border-village-400/30">
      <CardHeader>
        <CardTitle className="text-village-300">📊 Vue d&apos;ensemble MJ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-village-400/10 rounded-xl text-center">
            <p className="text-2xl font-bold text-village-400">{aliveVillagers}</p>
            <p className="text-xs text-village-300">Villageois en vie</p>
          </div>
          <div className="p-3 bg-blood-500/10 rounded-xl text-center">
            <p className="text-2xl font-bold text-blood-400">{aliveWolves}</p>
            <p className="text-xs text-blood-400">Loups en vie</p>
          </div>
        </div>

        {/* Role distribution */}
        <div>
          <h4 className="text-sm font-medium text-moon-100/70 mb-2">Distribution des rôles</h4>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => {
              const playersWithRole = players.filter(p => p.role_id === role.id);
              const aliveWithRole = playersWithRole.filter(p => p.is_alive !== false);
              if (playersWithRole.length === 0) return null;

              const roleConfig = getRoleConfig(role.name);
              return (
                <div
                  key={role.id}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm flex items-center gap-1",
                    role.team === 'loups'
                      ? "bg-blood-500/20 text-blood-400"
                      : "bg-village-400/20 text-village-300"
                  )}
                >
                  <span>{roleConfig?.assets.icon}</span>
                  <span>{aliveWithRole.length}/{playersWithRole.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Victory condition indicator */}
        <div className="p-3 bg-night-800/50 rounded-xl">
          <p className="text-xs text-moon-100/60 mb-1">Condition de victoire</p>
          {aliveWolves === 0 ? (
            <p className="text-green-400 font-medium">🏆 Village gagne (plus de loups)</p>
          ) : aliveWolves >= aliveVillagers ? (
            <p className="text-blood-400 font-medium">🏆 Loups gagnent (majorité)</p>
          ) : (
            <p className="text-moon-100/70">
              Les loups doivent éliminer <span className="text-amber-400 font-bold">{aliveVillagers - aliveWolves + 1}</span> villageois
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
