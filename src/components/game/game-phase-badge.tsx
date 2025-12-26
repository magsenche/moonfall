'use client';

/**
 * GamePhaseBadge - Y2K Sticker-style phase indicator
 */

import { motion } from 'framer-motion';
import { theme } from '@/config/theme';
import { cn } from '@/lib/utils';
import { PhaseHelpTooltip } from './phase-help-tooltip';
import type { GameStatus } from '@/types/database';

interface GamePhaseBadgeProps {
  status: GameStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showHelp?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const phaseLabels: Record<string, string> = {
  lobby: 'En attente',
  jour: 'Jour',
  nuit: 'Nuit',
  conseil: 'Conseil',
  terminee: 'Terminée',
};

const phaseEmojis: Record<string, string> = {
  lobby: '⏳',
  jour: '☀️',
  nuit: '🌙',
  conseil: '⚖️',
  terminee: '🏆',
};

export function GamePhaseBadge({
  status,
  size = 'md',
  showLabel = true,
  showHelp = false,
  className,
}: GamePhaseBadgeProps) {
  const phaseKey = status as keyof typeof theme.phases;
  const phaseConfig = theme.phases[phaseKey] || theme.phases.lobby;

  return (
    <div className="inline-flex items-center gap-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'inline-flex items-center gap-2 rounded-full font-bold',
          'border-2 border-white/30',
          'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]',
          sizeClasses[size],
          phaseConfig.bg,
          phaseConfig.text,
          className
        )}
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {phaseEmojis[status] || phaseConfig.icon}
        </motion.span>
        {showLabel && <span className="tracking-wide">{phaseLabels[status] || status}</span>}
      </motion.div>
      {showHelp && <PhaseHelpTooltip phase={status} />}
    </div>
  );
}
