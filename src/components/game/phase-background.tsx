'use client';

/**
 * PhaseBackground - Layered Y2K background with textures and floating elements
 * 
 * Creates an immersive background that changes based on the current game phase.
 * Uses noise overlays, grid patterns, and floating player avatars.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { getDefaultAvatar, getDefaultColor } from '@/config/players';
import type { PartialPlayer } from '@/app/game/[code]/hooks/types';

type GamePhase = 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';

interface PhaseBackgroundProps {
  phase: GamePhase;
  players?: PartialPlayer[];
  className?: string;
}

// Phase-specific color configurations
const phaseColors = {
  lobby: {
    primary: 'from-zinc-900 via-zinc-800 to-zinc-900',
    blob1: 'bg-indigo-600/20',
    blob2: 'bg-purple-600/15',
    accent: 'bg-indigo-500/10',
  },
  jour: {
    primary: 'from-amber-950/50 via-orange-950/30 to-zinc-900',
    blob1: 'bg-amber-500/20',
    blob2: 'bg-orange-500/15',
    accent: 'bg-yellow-500/10',
  },
  nuit: {
    primary: 'from-indigo-950 via-slate-900 to-zinc-950',
    blob1: 'bg-indigo-800/30',
    blob2: 'bg-purple-900/25',
    accent: 'bg-blue-600/10',
  },
  conseil: {
    primary: 'from-purple-950/50 via-red-950/30 to-zinc-900',
    blob1: 'bg-purple-700/25',
    blob2: 'bg-red-800/20',
    accent: 'bg-rose-500/10',
  },
  terminee: {
    primary: 'from-zinc-900 via-slate-800 to-zinc-900',
    blob1: 'bg-emerald-600/20',
    blob2: 'bg-teal-600/15',
    accent: 'bg-green-500/10',
  },
};

// Generate random positions for floating avatars
function generateFloatingPositions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: `${10 + (i * 23) % 80}%`,
    top: `${15 + (i * 31) % 70}%`,
    delay: i * 0.8,
    duration: 5 + (i % 4) * 2,
    rotation: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5)),
  }));
}

export function PhaseBackground({ phase, players = [], className }: PhaseBackgroundProps) {
  const colors = phaseColors[phase];
  
  // Memoize floating positions based on players
  const floatingPositions = useMemo(() => {
    const alivePlayers = players.filter(p => p.is_alive !== false && !p.is_mj).slice(0, 6);
    return generateFloatingPositions(alivePlayers.length);
  }, [players]);
  
  const alivePlayers = players.filter(p => p.is_alive !== false && !p.is_mj).slice(0, 6);

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Base Gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-b transition-colors duration-1000',
        colors.primary
      )} />
      
      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Animated Blobs */}
      <motion.div
        className={cn(
          'absolute w-[500px] h-[500px] rounded-full blur-3xl transition-colors duration-1000',
          colors.blob1
        )}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ top: '10%', left: '-10%' }}
      />
      
      <motion.div
        className={cn(
          'absolute w-[400px] h-[400px] rounded-full blur-3xl transition-colors duration-1000',
          colors.blob2
        )}
        animate={{
          x: [0, -40, 0],
          y: [0, 50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        style={{ bottom: '5%', right: '-5%' }}
      />
      
      <motion.div
        className={cn(
          'absolute w-[300px] h-[300px] rounded-full blur-3xl transition-colors duration-1000',
          colors.accent
        )}
        animate={{
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
        style={{ top: '50%', left: '30%' }}
      />
      
      {/* Floating Player Avatars */}
      {alivePlayers.map((player, i) => {
        const pos = floatingPositions[i];
        if (!pos) return null;
        
        const avatar = getDefaultAvatar(player.id);
        const color = getDefaultColor(player.id);
        
        return (
          <motion.div
            key={player.id}
            className={cn(
              'absolute w-12 h-12 rounded-full flex items-center justify-center',
              'border-2 border-white/30 shadow-lg',
              'opacity-20 select-none pointer-events-none',
              color.class
            )}
            style={{
              left: pos.left,
              top: pos.top,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 0.15,
              scale: 1,
              y: [0, -20, 0],
              rotate: [pos.rotation, -pos.rotation, pos.rotation],
            }}
            transition={{
              opacity: { delay: pos.delay * 0.3, duration: 0.5 },
              scale: { delay: pos.delay * 0.3, duration: 0.5 },
              y: { duration: pos.duration, repeat: Infinity, ease: 'easeInOut', delay: pos.delay },
              rotate: { duration: pos.duration * 1.5, repeat: Infinity, ease: 'easeInOut', delay: pos.delay },
            }}
          >
            <span className="text-xl">{avatar}</span>
          </motion.div>
        );
      })}
      
      {/* Vignette Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}
