import type { RoleHandler, Action, GamePhase } from './base';
import { registerRole } from './base';
import type { Player, Game, GameEvent } from '@/types/game';

const voyanteHandler: RoleHandler = {
  id: 'voyante',
  name: 'Voyante',
  
  canAct: (phase: GamePhase, player: Player, game: Game): boolean => {
    // Voyante acts during night
    return phase === 'nuit' && player.isAlive;
  },
  
  getActions: (player: Player, game: Game): Action[] => {
    // Can see the role of any alive player (except self)
    const targets = game.players.filter(p => 
      p.isAlive && 
      p.id !== player.id
    );
    
    return [{
      id: 'voir_role',
      name: 'Voir un rôle',
      description: 'Découvrir le rôle d\'un joueur',
      targetType: 'player',
      execute: async (target: Player | null, game: Game): Promise<GameEvent> => {
        if (!target) {
          throw new Error('Une cible est requise pour voir un rôle');
        }
        
        return {
          id: crypto.randomUUID(),
          gameId: game.id,
          eventType: 'power_used',
          actorId: player.id,
          targetId: target.id,
          data: { 
            action: 'voir_role',
            roleRevealed: target.role?.name || 'unknown',
            roleTeam: target.role?.team || 'unknown',
          },
          createdAt: new Date().toISOString(),
        };
      },
    }];
  },
  
  executeAction: async (action: Action, target: Player | null, game: Game): Promise<GameEvent> => {
    return action.execute(target, game);
  },
};

// Register the role
registerRole(voyanteHandler);

export default voyanteHandler;
