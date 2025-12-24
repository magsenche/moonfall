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
    <Card className="mt-6 border border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-purple-400">📊 Vue d&apos;ensemble MJ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-center">
            <p className="text-2xl font-bold text-blue-400">{aliveVillagers}</p>
            <p className="text-xs text-blue-300">Villageois en vie</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">{aliveWolves}</p>
            <p className="text-xs text-red-300">Loups en vie</p>
          </div>
        </div>

        {/* Role distribution */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Distribution des rôles</h4>
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
                      ? "bg-red-500/20 text-red-300"
                      : "bg-blue-500/20 text-blue-300"
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
        <div className="p-3 bg-slate-800/50 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Condition de victoire</p>
          {aliveWolves === 0 ? (
            <p className="text-green-400 font-medium">🏆 Village gagne (plus de loups)</p>
          ) : aliveWolves >= aliveVillagers ? (
            <p className="text-red-400 font-medium">🏆 Loups gagnent (majorité)</p>
          ) : (
            <p className="text-slate-300">
              Les loups doivent éliminer <span className="text-amber-400 font-bold">{aliveVillagers - aliveWolves + 1}</span> villageois
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
