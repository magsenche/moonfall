/**
 * PlayerRoleCard - Display current player's role
 */

'use client';

import { Card, CardContent } from '@/components/ui';
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
  return (
    <Card className={cn(
      "mb-6 border-2",
      roleConfig.assets.bgColor,
      role.team === 'loups' ? 'border-red-500/50' : 'border-blue-500/50'
    )}>
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
        </div>
      </CardContent>
    </Card>
  );
}
