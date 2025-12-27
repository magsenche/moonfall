/**
 * SeerHistoryPanel - Display past seer visions
 * Visible in all phases for the Voyante player
 * Y2K Sticker aesthetic
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getRoleDisplayName, getRoleIcon } from '@/config/roles';
import type { SeerResult } from '../hooks/types';

// Helper to format role name with icon
function formatRoleName(roleName: string | undefined): string {
  if (!roleName) return 'Inconnu';
  const icon = getRoleIcon(roleName);
  const displayName = getRoleDisplayName(roleName);
  return `${icon} ${displayName}`;
}

interface SeerHistoryPanelProps {
  seerHistory: SeerResult[];
  compact?: boolean;
}

export function SeerHistoryPanel({ seerHistory, compact = false }: SeerHistoryPanelProps) {
  if (seerHistory.length === 0) return null;

  return (
    <MotionCard
      variant="sticker"
      rotation={-0.5}
      className="border-purple-500/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="text-purple-300 text-sm flex items-center gap-2">
          📜 Vos visions passées
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : undefined}>
        <div className="space-y-2">
          {seerHistory.map((vision, index) => (
            <motion.div
              key={`${vision.targetName}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-3 rounded-lg border',
                'bg-zinc-800/50',
                vision.team === 'loups' 
                  ? 'border-red-500/30' 
                  : 'border-blue-500/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">{vision.targetName}</p>
                  <p className={cn(
                    "text-xs",
                    vision.team === 'loups' ? "text-red-400" : "text-blue-400"
                  )}>
                    {formatRoleName(vision.roleName)}
                  </p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  vision.team === 'loups'
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                )}>
                  {vision.team === 'loups' ? '🐺' : '🏘️'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </MotionCard>
  );
}
