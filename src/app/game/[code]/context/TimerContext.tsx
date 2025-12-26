/**
 * TimerContext - Isolated timer state to prevent re-renders
 *
 * The timer updates every second, which would cause all components
 * using GameContext to re-render. By isolating it, only components
 * that specifically use useTimerContext() will re-render each second.
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTimer } from '../hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TimerContextType {
  timeRemaining: number | null;
  isExpired: boolean;
  isUrgent: boolean;
  isWarning: boolean;
  formattedTime: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const TimerContext = createContext<TimerContextType | null>(null);

/**
 * Hook to access timer context
 * @throws Error if used outside of TimerProvider
 */
export function useTimerContext(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface TimerProviderProps {
  children: ReactNode;
  phaseEndsAt: string | null;
}

export function TimerProvider({ children, phaseEndsAt }: TimerProviderProps) {
  const { timeRemaining, isExpired, isUrgent, isWarning, formattedTime } = useTimer({
    phaseEndsAt,
  });

  const value = useMemo<TimerContextType>(
    () => ({
      timeRemaining,
      isExpired,
      isUrgent,
      isWarning,
      formattedTime,
    }),
    [timeRemaining, isExpired, isUrgent, isWarning, formattedTime]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
