import type { RoleHandler, Action, GamePhase } from './base';
import { registerRole } from './base';
import type { Player, Game, GameEvent } from '@/types/game';

const loupGarouHandler: RoleHandler = {
  id: 'loup_garou',
  name: 'Loup-Garou',
  
  canAct: (phase: GamePhase, player: Player, game: Game): boolean => {
    // Loups can act during night
    return phase === 'nuit' && player.isAlive;
  },
  
  getActions: (player: Player, game: Game): Action[] => {
    // Get all alive villagers (non-wolves) as potential targets
    const targets = game.players.filter(p => 
      p.isAlive && 
      p.id !== player.id &&
      p.role?.team !== 'loups'
    );
    
    return [{
      id: 'devorer',
      name: 'Dévorer',
      description: 'Choisir une victime à éliminer cette nuit',
      targetType: 'player',
      execute: async (target: Player | null, game: Game): Promise<GameEvent> => {
        if (!target) {
          throw new Error('Une cible est requise pour dévorer');
        }
        
        return {
          id: crypto.randomUUID(),
          gameId: game.id,
          eventType: 'wolf_vote',
          actorId: player.id,
          targetId: target.id,
          data: { action: 'devorer' },
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
registerRole(loupGarouHandler);

export default loupGarouHandler;
