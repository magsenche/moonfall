/**
 * PlayerRoleCard - Display current player's role
 * Clickable to show detailed role information
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { RoleDetailModal } from '@/components/game';
import { cn } from '@/lib/utils';
import type { Role } from '../hooks/types';

interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  assets: {
    icon: string;
    color: string;
    bgColor: string;
  };
}

interface PlayerRoleCardProps {
  role: Role;
  roleConfig: RoleConfig;
}

export function PlayerRoleCard({ role, roleConfig }: PlayerRoleCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card 
        className={cn(
          "mb-6 border-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]",
          roleConfig.assets.bgColor,
          role.team === 'loups' ? 'border-red-500/50' : 'border-blue-500/50'
        )}
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="pt-6">
          <div className="text-center">
            <div className={cn(
              "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4",
              roleConfig.assets.bgColor
            )}>
              {roleConfig.assets.icon}
            </div>
            <h2 className={cn("text-2xl font-bold mb-2", roleConfig.assets.color)}>
              {roleConfig.displayName}
            </h2>
            <p className="text-slate-300 mb-4">
              {roleConfig.description}
            </p>
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-sm font-medium",
              role.team === 'loups'
                ? 'bg-red-500/20 text-red-400'
                : role.team === 'village'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            )}>
              Équipe {role.team === 'loups' ? 'Loups-Garous' : role.team === 'village' ? 'Village' : 'Solo'}
            </span>
            <p className="mt-3 text-xs text-zinc-500">
              Appuie pour plus de détails
            </p>
          </div>
        </CardContent>
      </Card>

      <RoleDetailModal 
        roleName={role.name}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
