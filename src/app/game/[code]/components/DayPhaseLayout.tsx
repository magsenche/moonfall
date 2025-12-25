/**
 * DayPhaseLayout - Day discussion phase layout
 * 
 * Players discuss and try to identify wolves.
 * Bright themed with sun atmosphere.
 */

'use client';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Role } from '../hooks';
import type { RoleConfig } from '@/config/roles';

import { PlayerRoleCard } from './PlayerRoleCard';

interface DayPhaseLayoutProps {
  // Player info
  currentRole: Role | null | undefined;
  roleConfig: RoleConfig | null;
  
  // Role booleans
  isWolf: boolean;
}

export function DayPhaseLayout({
  currentRole,
  roleConfig,
  isWolf,
}: DayPhaseLayoutProps) {
  return (
    <div className="space-y-4">
      {/* Day atmosphere instruction */}
      <Card className={cn(
        "border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-orange-950/20"
      )}>
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <p className="text-3xl mb-2">☀️</p>
            <h3 className="font-bold text-white mb-2">Le jour se lève</h3>
            <p className="text-slate-400 text-sm">
              {isWolf
                ? "Mêlez-vous aux villageois et détournez les soupçons..."
                : "Discutez avec les autres villageois et trouvez les loups-garous !"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Player's Role Card */}
      {currentRole && roleConfig && (
        <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />
      )}

      {/* Discussion tips */}
      <Card className="border-slate-700/50">
        <CardContent className="py-6">
          <div className="text-center space-y-3">
            <p className="text-2xl">💬</p>
            <div>
              <h4 className="font-semibold text-white mb-1">Phase de discussion</h4>
              <p className="text-slate-400 text-sm">
                Échangez avec les autres joueurs, partagez vos suspicions,
                et préparez-vous pour le conseil du village.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="px-2 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
                🎭 Observez les comportements
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
                🔍 Posez des questions
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
                🤝 Formez des alliances
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
