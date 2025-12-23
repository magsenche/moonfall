import type { RoleHandler, Action, GamePhase, PlayerWithRole, GameWithPlayers } from './base';
import { registerRole } from './base';
import type { GameEventInsert } from '@/types/database';

const loupGarouHandler: RoleHandler = {
  id: 'loup_garou',
  name: 'Loup-Garou',
  
  canAct: (phase: GamePhase, player: PlayerWithRole, game: GameWithPlayers): boolean => {
    // Loups can act during night
    return phase === 'nuit' && player.is_alive === true;
  },
  
  getActions: (player: PlayerWithRole, game: GameWithPlayers): Action[] => {
    // Get all alive villagers (non-wolves) as potential targets
    const targets = game.players.filter(p => 
      p.is_alive === true && 
      p.id !== player.id &&
      p.role?.team !== 'loups'
    );
    
    return [{
      id: 'devorer',
      name: 'Dévorer',
      description: 'Choisir une victime à éliminer cette nuit',
      targetType: 'player',
      execute: async (target: PlayerWithRole | null, game: GameWithPlayers): Promise<GameEventInsert> => {
        if (!target) {
          throw new Error('Une cible est requise pour dévorer');
        }
        
        return {
          game_id: game.id,
          event_type: 'wolf_vote',
          actor_id: player.id,
          target_id: target.id,
          data: { action: 'devorer' },
        };
      },
    }];
  },
  
  executeAction: async (action: Action, target: PlayerWithRole | null, game: GameWithPlayers): Promise<GameEventInsert> => {
    return action.execute(target, game);
  },
};

// Register the role
registerRole(loupGarouHandler);

export default loupGarouHandler;
