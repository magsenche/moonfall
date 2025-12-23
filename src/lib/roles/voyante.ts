import type { RoleHandler, Action, GamePhase, PlayerWithRole, GameWithPlayers } from './base';
import { registerRole } from './base';
import type { GameEventInsert } from '@/types/database';

const voyanteHandler: RoleHandler = {
  id: 'voyante',
  name: 'Voyante',
  
  canAct: (phase: GamePhase, player: PlayerWithRole, game: GameWithPlayers): boolean => {
    // Voyante acts during night
    return phase === 'nuit' && player.is_alive === true;
  },
  
  getActions: (player: PlayerWithRole, game: GameWithPlayers): Action[] => {
    // Can see the role of any alive player (except self)
    const targets = game.players.filter(p => 
      p.is_alive === true && 
      p.id !== player.id
    );
    
    return [{
      id: 'voir_role',
      name: 'Voir un rôle',
      description: 'Découvrir le rôle d\'un joueur',
      targetType: 'player',
      execute: async (target: PlayerWithRole | null, game: GameWithPlayers): Promise<GameEventInsert> => {
        if (!target) {
          throw new Error('Une cible est requise pour voir un rôle');
        }
        
        return {
          game_id: game.id,
          event_type: 'power_used',
          actor_id: player.id,
          target_id: target.id,
          data: { 
            action: 'voir_role',
            roleRevealed: target.role?.name || 'unknown',
            roleTeam: target.role?.team || 'unknown',
          },
        };
      },
    }];
  },
  
  executeAction: async (action: Action, target: PlayerWithRole | null, game: GameWithPlayers): Promise<GameEventInsert> => {
    return action.execute(target, game);
  },
};

// Register the role
registerRole(voyanteHandler);

export default voyanteHandler;
