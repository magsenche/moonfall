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

import { useMemo } from 'react';
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

  // Ordre de secours déterministe et identique sur tous les clients :
  // MJ en premier (le plus engagé), puis les joueurs par id croissant.
  const fallbackIndex = useMemo(() => {
    const ids = game.players.map((p) => p.id).sort();
    const mjId = game.players.find((p) => p.is_mj)?.id;
    const ordered = mjId ? [mjId, ...ids.filter((id) => id !== mjId)] : ids;
    const index = currentPlayerId ? ordered.indexOf(currentPlayerId) : -1;
    return index >= 0 ? index : ordered.length;
  }, [game.players, currentPlayerId]);

  useAutoGarou({
    gameCode: game.code,
    gameStatus: gameStatus as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee',
    isAutoMode,
    isExpired,
    currentPlayerId,
    fallbackIndex,
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
