/**
 * PhaseTimer - Countdown timer display for timed phases
 */

'use client';

import { cn } from '@/lib/utils';

interface PhaseTimerProps {
  timeRemaining: number | null;
  showTimer: boolean;
}

export function PhaseTimer({ timeRemaining, showTimer }: PhaseTimerProps) {
  if (!showTimer || timeRemaining === null) return null;

  const isUrgent = timeRemaining <= 30;
  const isWarning = timeRemaining <= 60 && timeRemaining > 30;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="mb-4">
      <div className={cn(
        "text-center p-4 rounded-xl",
        isUrgent
          ? "bg-red-500/20 animate-pulse"
          : isWarning
          ? "bg-amber-500/20"
          : "bg-slate-800/50"
      )}>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
          Temps restant
        </p>
        <p className={cn(
          "text-4xl font-mono font-bold",
          isUrgent
            ? "text-red-400"
            : isWarning
            ? "text-amber-400"
            : "text-white"
        )}>
          {formatTime(timeRemaining)}
        </p>
        {timeRemaining === 0 && (
          <p className="text-sm text-red-400 mt-2">
            ⏰ Temps écoulé !
          </p>
        )}
      </div>
    </div>
  );
}
