/**
 * GameHeader - Unified header with game name, phase badge, and timer
 *
 * Uses GameContext for game state and TimerContext for timer values.
 * TimerContext is isolated so only this component re-renders each second.
 */

'use client';

import { cn } from '@/lib/utils';
import { GamePhaseBadge } from '@/components/game';
import { useGame, useTimerContext } from '../context';

interface GameHeaderProps {
  className?: string;
}

export function GameHeader({ className }: GameHeaderProps) {
  const { game, gameStatus, showTimer } = useGame();
  const { timeRemaining, isUrgent, isWarning, formattedTime } = useTimerContext();

  return (
    <header className={cn('mb-6', className)}>
      {/* Game Name */}
      <h1 className="text-2xl font-bold text-white text-center mb-3">{game.name}</h1>

      {/* Phase Badge + Timer Row */}
      <div className="flex items-center justify-center gap-4">
        <GamePhaseBadge
          status={gameStatus as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee'}
          showHelp
          className="inline-flex"
        />

        {showTimer && timeRemaining !== null && (
          <div
            className={cn(
              'px-3 py-1.5 rounded-full font-mono text-sm font-bold flex items-center gap-1.5',
              isUrgent
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : isWarning
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-800/50 text-white'
            )}
          >
            <span className="text-xs">⏱</span>
            {formattedTime}
          </div>
        )}
      </div>

      {/* Time expired warning */}
      {showTimer && timeRemaining === 0 && (
        <p className="text-sm text-red-400 text-center mt-2">⏰ Temps écoulé !</p>
      )}
    </header>
  );
}
