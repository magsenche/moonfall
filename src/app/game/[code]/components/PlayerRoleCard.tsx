/**
 * PlayerRoleCard - Trading card style role display with 3D flip
 * 
 * Y2K aesthetic with:
 * - 3D flip animation using preserve-3d
 * - Sticker-style border and shadow
 * - Trading card look (Pokémon/Magic style)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoleDetailModal } from '@/components/game';
import { cn } from '@/lib/utils';
import { useGame } from '../context';
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
  const { game } = useGame();
  const [showDetail, setShowDetail] = useState(false);
  
  // Persist flip state across phase changes
  const storageKey = `role-revealed-${game?.id}-${role.id}`;
  const [isFlipped, setIsFlipped] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  // Save flip state to localStorage whenever it changes
  useEffect(() => {
    if (isFlipped) {
      localStorage.setItem(storageKey, 'true');
    }
  }, [isFlipped, storageKey]);

  const handleClick = () => {
    if (!isFlipped) {
      // First click: flip to reveal
      setIsFlipped(true);
    } else {
      // Already revealed: show detail modal
      setShowDetail(true);
    }
  };

  const teamColors = {
    loups: {
      border: 'border-red-500',
      glow: 'shadow-red-500/30',
      bg: 'from-red-950/80 via-red-900/50 to-zinc-900',
      accent: 'text-red-400',
      badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    },
    village: {
      border: 'border-blue-500',
      glow: 'shadow-blue-500/30',
      bg: 'from-blue-950/80 via-indigo-900/50 to-zinc-900',
      accent: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    },
    solo: {
      border: 'border-purple-500',
      glow: 'shadow-purple-500/30',
      bg: 'from-purple-950/80 via-purple-900/50 to-zinc-900',
      accent: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    },
  };

  const colors = teamColors[role.team as keyof typeof teamColors] || teamColors.village;

  return (
    <>
      <div 
        className="mb-6 perspective-1000"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative w-full cursor-pointer"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 15 }}
          onClick={handleClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Front - Mystery Card */}
          <motion.div
            className={cn(
              'w-full p-6 rounded-2xl',
              'border-3 border-white/40 bg-zinc-900',
              'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
              'backface-hidden'
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center py-8">
              {/* Mystery pattern */}
              <div className="relative">
                <div className={cn(
                  'w-28 h-28 mx-auto rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br from-indigo-600/30 to-purple-600/30',
                  'border-2 border-white/20'
                )}>
                  <motion.span 
                    className="text-6xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    🌙
                  </motion.span>
                </div>
                {/* Decorative corners */}
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-white/30 rounded-tr-lg" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-white/30 rounded-bl-lg" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
              </div>
              
              <h2 className="text-xl font-black text-white mt-6 tracking-wide">
                TON RÔLE
              </h2>
              <p className="text-sm text-zinc-400 mt-2">
                Appuie pour révéler
              </p>
              
              {/* Moonfall branding */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <span className="text-xs text-zinc-600 font-bold tracking-widest">
                  MOONFALL
                </span>
              </div>
            </div>
          </motion.div>

          {/* Back - Role Revealed */}
          <motion.div
            className={cn(
              'absolute inset-0 w-full p-6 rounded-2xl',
              'border-3 bg-gradient-to-b',
              colors.border,
              colors.bg,
              'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
              colors.glow,
              'backface-hidden'
            )}
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="text-center">
              {/* Role Icon */}
              <motion.div 
                className={cn(
                  'w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-5xl',
                  'border-2 border-white/30 bg-black/20',
                  'shadow-lg'
                )}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {roleConfig.assets.icon}
              </motion.div>
              
              {/* Role Name */}
              <motion.h2 
                className={cn('text-2xl font-black mt-4 tracking-tight', colors.accent)}
                style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {roleConfig.displayName}
              </motion.h2>
              
              {/* Description */}
              <motion.p 
                className="text-slate-300 mt-3 text-sm leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {roleConfig.description}
              </motion.p>
              
              {/* Team Badge - Sticker style */}
              <motion.div
                className={cn(
                  'inline-block mt-4 px-4 py-1.5 rounded-full',
                  'border-2 font-bold text-sm',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
                  colors.badge
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [-5, 0] }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                {role.team === 'loups' ? '🐺 Loups-Garous' : role.team === 'village' ? '🏘️ Village' : '👤 Solo'}
              </motion.div>
              
              {/* Tap for more hint */}
              <motion.p 
                className="mt-4 text-xs text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Appuie pour plus de détails
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <RoleDetailModal 
        roleName={role.name}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
