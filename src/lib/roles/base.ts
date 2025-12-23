// Role handler interface - each role implements this
import type { Player, Game, GameEvent, GameEventInsert, Role } from '@/types/database';

export type GamePhase = 'jour' | 'nuit';

// Extended player type with role info for game logic
export type PlayerWithRole = Player & {
  role?: Role;
};

// Extended game type with players for game logic
export type GameWithPlayers = Game & {
  players: PlayerWithRole[];
};

export interface Action {
  id: string;
  name: string;
  description: string;
  targetType: 'player' | 'none';
  execute: (target: PlayerWithRole | null, game: GameWithPlayers) => Promise<GameEventInsert>;
}

export interface RoleHandler {
  id: string;
  name: string;
  
  // Can this role act during the given phase?
  canAct: (phase: GamePhase, player: PlayerWithRole, game: GameWithPlayers) => boolean;
  
  // Get available actions for this role
  getActions: (player: PlayerWithRole, game: GameWithPlayers) => Action[];
  
  // Execute an action
  executeAction: (action: Action, target: PlayerWithRole | null, game: GameWithPlayers) => Promise<GameEventInsert>;
  
  // Called when this player dies (e.g., Chasseur)
  onDeath?: (player: PlayerWithRole, game: GameWithPlayers) => Promise<GameEventInsert | null>;
  
  // Called at the start of each phase
  onPhaseStart?: (phase: GamePhase, player: PlayerWithRole, game: GameWithPlayers) => Promise<void>;
}

// Registry to store all role handlers
const roleRegistry = new Map<string, RoleHandler>();

export function registerRole(handler: RoleHandler): void {
  roleRegistry.set(handler.id, handler);
}

export function getRoleHandler(roleId: string): RoleHandler | undefined {
  return roleRegistry.get(roleId);
}

export function getAllRoleHandlers(): RoleHandler[] {
  return Array.from(roleRegistry.values());
}
