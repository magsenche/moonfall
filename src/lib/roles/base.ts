// Role handler interface - each role implements this
import type { Player, Game, GameEvent, Power } from '@/types/game';

export type GamePhase = 'jour' | 'nuit';

export interface Action {
  id: string;
  name: string;
  description: string;
  targetType: 'player' | 'none';
  execute: (target: Player | null, game: Game) => Promise<GameEvent>;
}

export interface RoleHandler {
  id: string;
  name: string;
  
  // Can this role act during the given phase?
  canAct: (phase: GamePhase, player: Player, game: Game) => boolean;
  
  // Get available actions for this role
  getActions: (player: Player, game: Game) => Action[];
  
  // Execute an action
  executeAction: (action: Action, target: Player | null, game: Game) => Promise<GameEvent>;
  
  // Called when this player dies (e.g., Chasseur)
  onDeath?: (player: Player, game: Game) => Promise<GameEvent | null>;
  
  // Called at the start of each phase
  onPhaseStart?: (phase: GamePhase, player: Player, game: Game) => Promise<void>;
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
