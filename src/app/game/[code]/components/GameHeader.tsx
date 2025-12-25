/**
 * GameHeader - Unified header with game name, phase badge, and timer
 * 
 * Consistent across all phases, provides the main game context.
 */

'use client';

import { cn } from '@/lib/utils';
import { GamePhaseBadge } from '@/components/game';
import type { GameStatus } from '@/types/game';

interface GameHeaderProps {
  gameName: string;
  gameStatus: GameStatus;
  timeRemaining: number | null;
  showTimer: boolean;
  className?: string;
}

export function GameHeader({
  gameName,
  gameStatus,
  timeRemaining,
  showTimer,
  className,
}: GameHeaderProps) {
  const isUrgent = timeRemaining !== null && timeRemaining <= 30;
  const isWarning = timeRemaining !== null && timeRemaining <= 60 && timeRemaining > 30;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <header className={cn("mb-6", className)}>
      {/* Game Name */}
      <h1 className="text-2xl font-bold text-white text-center mb-3">
        {gameName}
      </h1>

      {/* Phase Badge + Timer Row */}
      <div className="flex items-center justify-center gap-4">
        <GamePhaseBadge status={gameStatus} showHelp className="inline-flex" />
        
        {showTimer && timeRemaining !== null && (
          <div className={cn(
            "px-3 py-1.5 rounded-full font-mono text-sm font-bold flex items-center gap-1.5",
            isUrgent
              ? "bg-red-500/20 text-red-400 animate-pulse"
              : isWarning
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-800/50 text-white"
          )}>
            <span className="text-xs">⏱</span>
            {formatTime(timeRemaining)}
          </div>
        )}
      </div>

      {/* Time expired warning */}
      {showTimer && timeRemaining === 0 && (
        <p className="text-sm text-red-400 text-center mt-2">
          ⏰ Temps écoulé !
        </p>
      )}
    </header>
  );
}
