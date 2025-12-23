import type { RoleHandler, Action, GamePhase, PlayerWithRole, GameWithPlayers } from './base';
import { registerRole } from './base';
import type { GameEventInsert } from '@/types/database';

const villageoisHandler: RoleHandler = {
  id: 'villageois',
  name: 'Villageois',
  
  canAct: (phase: GamePhase, player: PlayerWithRole, game: GameWithPlayers): boolean => {
    // Villageois can only act during day (vote)
    return phase === 'jour' && player.is_alive === true;
  },
  
  getActions: (player: PlayerWithRole, game: GameWithPlayers): Action[] => {
    // Villageois has no special actions, only votes
    return [];
  },
  
  executeAction: async (action: Action, target: PlayerWithRole | null, game: GameWithPlayers): Promise<GameEventInsert> => {
    // Villageois has no special actions
    throw new Error('Villageois has no special actions');
  },
};

// Register the role
registerRole(villageoisHandler);

export default villageoisHandler;
