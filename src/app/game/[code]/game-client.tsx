/**
 * GameClient - Main game orchestrator
 *
 * This is now a thin wrapper that provides the GameContext.
 * All game logic and state is managed in the GameProvider.
 * UI rendering is delegated to GameLayout.
 *
 * @see context/GameContext.tsx for state management
 * @see components/GameLayout.tsx for UI rendering
 */

'use client';

import { GameProvider } from './context';
import { GameLayout } from './components/GameLayout';
import type { GameWithPlayers, Role } from './hooks';

interface GameClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

export function GameClient({ initialGame, roles }: GameClientProps) {
  return (
    <GameProvider initialGame={initialGame} roles={roles}>
      <GameLayout />
    </GameProvider>
  );
}
