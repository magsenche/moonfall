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

import { GameProvider, TimerProvider, useGame } from './context';
import { GameLayout } from './components/GameLayout';
import type { GameWithPlayers, Role } from './hooks';

interface GameClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

/**
 * Inner component that wraps children with TimerProvider
 * This must be inside GameProvider to access game.phase_ends_at
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
        <GameLayout />
      </TimerWrapper>
    </GameProvider>
  );
}
