/**
 * PlayersList - Y2K Grid display of players with sticker avatars
 * 
 * Features:
 * - 3-4 column grid instead of list
 * - Sticker-style avatars with borders and shadows
 * - Dead players get a "MORT" sticker overlay instead of grayscale
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getRoleConfig } from '@/config/roles';
import { getDefaultAvatar, getDefaultColor } from '@/config/players';
import { cn } from '@/lib/utils';
import type { PartialPlayer, Role } from '../hooks/types';

interface PlayersListProps {
  players: PartialPlayer[];
  roles: Role[];
  currentPlayerId: string | null;
  isMJ: boolean;
  isWolf: boolean;
  wolves: PartialPlayer[];
  isAutoMode?: boolean;
}

export function PlayersList({
  players,
  roles,
  currentPlayerId,
  isMJ,
  isWolf,
  wolves,
  isAutoMode = false,
}: PlayersListProps) {
  // In Auto-Garou mode, MJ plays too - include them in the list
  const playersToShow = isAutoMode ? players : players.filter(p => !p.is_mj);
  const alivePlayers = playersToShow.filter(p => p.is_alive !== false);

  return (
    <MotionCard 
      variant="sticker" 
      rotation={-0.5}
      className="overflow-hidden"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            Joueurs
          </span>
          <span className={cn(
            'text-sm font-bold px-3 py-1 rounded-full',
            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          )}>
            {alivePlayers.length} en vie
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {playersToShow.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const playerRole = roles.find(r => r.id === player.role_id);
            const pRoleConfig = playerRole ? getRoleConfig(playerRole.name) : null;
            const isDead = player.is_alive === false;
            // MJ can see all roles, wolves can see other wolves
            const canSeeRole = isMJ || isCurrentPlayer || (isWolf && wolves.some(w => w.id === player.id));
            
            const avatar = getDefaultAvatar(player.id);
            const color = getDefaultColor(player.id);

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.05, rotate: 0 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'relative flex flex-col items-center p-3 rounded-xl',
                  'border-2 transition-all cursor-default',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
                  isCurrentPlayer
                    ? 'bg-indigo-900/50 border-indigo-400'
                    : isMJ && playerRole?.team === 'loups'
                      ? 'bg-red-900/30 border-red-500/50'
                      : 'bg-zinc-800/80 border-white/30'
                )}
                style={{ 
                  transform: `rotate(${(Math.random() - 0.5) * 4}deg)` 
                }}
              >
                {/* Avatar - Sticker style */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center text-3xl',
                    'border-3 border-white shadow-lg',
                    color.class,
                    isDead && 'opacity-60'
                  )}
                >
                  <span className="select-none">{avatar}</span>
                </div>

                {/* Dead Overlay - "MORT" sticker */}
                {isDead && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: -12 }}
                    className={cn(
                      'absolute top-1 right-0 px-2 py-0.5 rounded-md',
                      'bg-red-600 border-2 border-white text-white',
                      'text-[10px] font-black uppercase tracking-wider',
                      'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]',
                      'transform'
                    )}
                  >
                    MORT
                  </motion.div>
                )}

                {/* Current player indicator */}
                {isCurrentPlayer && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute -top-1 -left-1 px-1.5 py-0.5 rounded-md',
                      'bg-indigo-500 border-2 border-white text-white',
                      'text-[9px] font-bold uppercase',
                      'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                    )}
                  >
                    TOI
                  </motion.div>
                )}

                {/* Name */}
                <p className={cn(
                  'mt-2 text-xs font-bold truncate max-w-full text-center',
                  isDead ? 'text-slate-500' : 'text-white'
                )}>
                  {player.pseudo}
                </p>

                {/* Role indicator (for MJ, self, or wolves seeing wolves) */}
                {!isDead && canSeeRole && pRoleConfig && (
                  <div className={cn(
                    'mt-1 text-base',
                    playerRole?.team === 'loups' ? 'opacity-100' : 'opacity-70'
                  )}>
                    {pRoleConfig.assets.icon}
                  </div>
                )}

                {/* Dead role reveal */}
                {isDead && pRoleConfig && (
                  <p className="mt-1 text-[10px] text-slate-500 italic">
                    {pRoleConfig.displayName}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </MotionCard>
  );
}
