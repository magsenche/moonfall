'use client';

import { theme } from '@/config/theme';
import { cn } from '@/lib/utils';
import type { GameStatus } from '@/types/database';

interface GamePhaseBadgeProps {
  status: GameStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

const phaseLabels: Record<string, string> = {
  lobby: 'En attente',
  jour: 'Jour',
  nuit: 'Nuit',
  conseil: 'Conseil',
  terminee: 'Terminée',
};

export function GamePhaseBadge({
  status,
  size = 'md',
  showLabel = true,
  className,
}: GamePhaseBadgeProps) {
  const phaseKey = status as keyof typeof theme.phases;
  const phaseConfig = theme.phases[phaseKey] || theme.phases.lobby;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        phaseConfig.bg,
        phaseConfig.text,
        className
      )}
    >
      <span>{phaseConfig.icon}</span>
      {showLabel && <span>{phaseLabels[status] || status}</span>}
    </div>
  );
}
