'use client';

/**
 * PhaseBackground — décor "Nuit de village".
 *
 * Chaque phase a sa propre scène (lune et étoiles la nuit, halo de
 * soleil le jour, braises au conseil) et le changement de phase se
 * fait en fondu croisé : c'est LE moment de mise en scène du jeu.
 */

import { motion, AnimatePresence } from 'framer-motion';
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

const STARS = [
  { left: '10%', top: '8%', size: 2 },
  { left: '25%', top: '18%', size: 1 },
  { left: '38%', top: '6%', size: 1.5 },
  { left: '52%', top: '14%', size: 1 },
  { left: '67%', top: '5%', size: 2 },
  { left: '78%', top: '20%', size: 1 },
  { left: '90%', top: '10%', size: 1.5 },
  { left: '18%', top: '38%', size: 1 },
  { left: '85%', top: '34%', size: 1 },
  { left: '45%', top: '30%', size: 1 },
];

/* Dégradé de fond par phase */
const phaseGradients: Record<GamePhase, string> = {
  lobby: 'bg-gradient-to-b from-night-900 via-night-950 to-night-950',
  nuit: 'bg-gradient-to-b from-[#0d1730] via-night-950 to-black',
  jour: 'bg-gradient-to-b from-[#3a2c14] via-[#1f1a10] to-night-950',
  conseil: 'bg-gradient-to-b from-[#1a0d12] via-[#140a0e] to-night-950',
  terminee: 'bg-gradient-to-b from-[#0e1f1a] via-night-950 to-night-950',
};

/* Décor spécifique à chaque phase, rendu au-dessus du dégradé */
function PhaseScene({ phase }: { phase: GamePhase }) {
  switch (phase) {
    case 'nuit':
      return (
        <>
          {/* Pleine lune */}
          <motion.div
            className="absolute right-[8%] top-[6%] w-24 h-24 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 38% 35%, var(--moon-100) 0%, var(--moon-500) 70%, var(--moon-600) 100%)',
              boxShadow: '0 0 60px 20px rgba(229,189,114,0.15)',
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 0.9 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          {/* Étoiles */}
          {STARS.map((star, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-moon-100"
              style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </>
      );
    case 'jour':
      return (
        /* Halo de soleil depuis le haut */
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -top-40 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(229,189,114,0.25) 0%, rgba(229,189,114,0.08) 45%, transparent 70%)',
          }}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      );
    case 'conseil':
      return (
        /* Braises : lueur rouge qui monte du bas de l'écran */
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 110%, rgba(176,58,58,0.3) 0%, rgba(176,58,58,0.1) 45%, transparent 75%)',
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      );
    case 'terminee':
      return (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[10%] w-[400px] h-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(110,231,183,0.10) 0%, transparent 70%)',
          }}
        />
      );
    default:
      return (
        /* Lobby : halo lunaire discret */
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-40 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(229,189,114,0.07) 0%, transparent 70%)',
          }}
        />
      );
  }
}

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
  // Memoize floating positions based on players
  const floatingPositions = useMemo(() => {
    const alive = players.filter(p => p.is_alive !== false && !p.is_mj).slice(0, 6);
    return generateFloatingPositions(alive.length);
  }, [players]);

  const alivePlayers = players.filter(p => p.is_alive !== false && !p.is_mj).slice(0, 6);

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Scène de phase en fondu croisé */}
      <AnimatePresence>
        <motion.div
          key={phase}
          className={cn('absolute inset-0', phaseGradients[phase])}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          <PhaseScene phase={phase} />
        </motion.div>
      </AnimatePresence>

      {/* Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Silhouette de colline */}
      <svg
        className="absolute bottom-0 left-0 w-full text-black/40"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,120 L0,80 Q360,20 720,60 T1440,50 L1440,120 Z" />
      </svg>

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
