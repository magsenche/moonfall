/**
 * useTimer - Phase countdown timer
 * 
 * Handles:
 * - Countdown calculation from phase_ends_at
 * - Auto-update every second
 * - Returns remaining time in seconds
 */

import { useState, useEffect, useMemo } from 'react';

interface UseTimerOptions {
  phaseEndsAt: string | null;
}

// Calculate remaining time from end timestamp
function calculateRemaining(phaseEndsAt: string | null): number | null {
  if (!phaseEndsAt) return null;
  const endTime = new Date(phaseEndsAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((endTime - now) / 1000));
}

export function useTimer({ phaseEndsAt }: UseTimerOptions) {
  // Initial value computed synchronously
  const initialValue = useMemo(() => calculateRemaining(phaseEndsAt), [phaseEndsAt]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(initialValue);

  // Reset when phaseEndsAt changes
  useEffect(() => {
    setTimeRemaining(calculateRemaining(phaseEndsAt));
  }, [phaseEndsAt]);

  // Update every second when we have a valid end time
  useEffect(() => {
    if (!phaseEndsAt) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateRemaining(phaseEndsAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  // Helper to format time as MM:SS
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining === 0,
    isUrgent: timeRemaining !== null && timeRemaining <= 30,
    isWarning: timeRemaining !== null && timeRemaining <= 60 && timeRemaining > 30,
  };
}
