/**
 * GameClient - Main game orchestrator
 *
 * This is now a thin wrapper that provides the GameContext and TimerContext.
 * All game logic and state is managed in the GameProvider.
 * Timer is isolated in TimerProvider to prevent unnecessary re-renders.
 * UI rendering is delegated to GameLayout.
 *
 * @see context/GameContext.tsx for state management
 * @see context/TimerContext.tsx for timer isolation
 * @see components/GameLayout.tsx for UI rendering
 */

'use client';

import { GameProvider, TimerProvider, useGame, useTimerContext } from './context';
import { GameLayout } from './components/GameLayout';
import { useAutoGarou } from './hooks';
import type { GameWithPlayers, Role } from './hooks';

interface GameClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

/**
 * GameLogic - Invisible component that handles auto-garou mode
 * 
 * This component uses useTimerContext() for isExpired, so it re-renders
 * each second. But since it returns null (no UI), this is cheap.
 * This isolates the timer dependency from GameLayout and its children.
 */
function GameLogic() {
  const { game, gameStatus, isAutoMode, currentPlayerId } = useGame();
  const { isExpired } = useTimerContext();

  useAutoGarou({
    gameCode: game.code,
    gameStatus: gameStatus as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee',
    isAutoMode,
    isExpired,
    currentPlayerId,
  });

  return null; // No UI, just logic
}

/**
 * TimerWrapper - Wraps children with TimerProvider
 * 
 * Must be inside GameProvider to access game.phase_ends_at which
 * updates in real-time when phases change.
 */
function TimerWrapper({ children }: { children: React.ReactNode }) {
  const { game } = useGame();
  return (
    <TimerProvider phaseEndsAt={game.phase_ends_at}>
      {children}
    </TimerProvider>
  );
}

export function GameClient({ initialGame, roles }: GameClientProps) {
  return (
    <GameProvider initialGame={initialGame} roles={roles}>
      <TimerWrapper>
        <GameLogic />
        <GameLayout />
      </TimerWrapper>
    </GameProvider>
  );
}
