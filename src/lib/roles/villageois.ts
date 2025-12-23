import type { RoleHandler, Action, GamePhase } from './base';
import { registerRole } from './base';
import type { Player, Game, GameEvent, EVENT_TYPES } from '@/types/game';

const villageoisHandler: RoleHandler = {
  id: 'villageois',
  name: 'Villageois',
  
  canAct: (phase: GamePhase, player: Player, game: Game): boolean => {
    // Villageois can only act during day (vote)
    return phase === 'jour' && player.isAlive;
  },
  
  getActions: (player: Player, game: Game): Action[] => {
    // Villageois has no special actions, only votes
    return [];
  },
  
  executeAction: async (action: Action, target: Player | null, game: Game): Promise<GameEvent> => {
    // Villageois has no special actions
    throw new Error('Villageois has no special actions');
  },
};

// Register the role
registerRole(villageoisHandler);

export default villageoisHandler;
