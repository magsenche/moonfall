'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PlayerAvatar, GamePhaseBadge } from '@/components/game';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { getPlayerIdForGame } from '@/lib/utils/player-session';
import type { Database } from '@/types/database';

// Partial player type for what we actually select
type PartialPlayer = Pick<
  Database['public']['Tables']['players']['Row'],
  'id' | 'pseudo' | 'is_alive' | 'is_mj' | 'role_id' | 'created_at'
>;

type GameWithPlayers = Database['public']['Tables']['games']['Row'] & {
  players: PartialPlayer[];
};

type Role = Database['public']['Tables']['roles']['Row'];

interface LobbyClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

export function LobbyClient({ initialGame, roles }: LobbyClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [game, setGame] = useState<GameWithPlayers>(initialGame);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Get current player ID from localStorage on mount
  useEffect(() => {
    const playerId = getPlayerIdForGame(initialGame.code);
    setCurrentPlayerId(playerId);
  }, [initialGame.code]);

  // Real-time subscription for players
  useEffect(() => {
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        async () => {
          // Refetch game data when players change
          const { data } = await supabase
            .from('games')
            .select(`
              *,
              players (
                id,
                pseudo,
                is_alive,
                is_mj,
                role_id,
                created_at
              )
            `)
            .eq('id', game.id)
            .single();

          if (data) {
            setGame(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        async (payload) => {
          // Game status changed
          setGame(prev => ({ ...prev, ...payload.new }));
          
          // If game started, refresh the page to get roles
          if (payload.new.status !== 'lobby') {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase, router]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = async () => {
    setStartError(null);
    setIsStarting(true);
    try {
      const response = await fetch(`/api/games/${game.code}/start`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement');
      }
      // Realtime will handle the refresh
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsStarting(false);
    }
  };

  const mj = game.players.find(p => p.is_mj);
  const players = game.players.filter(p => !p.is_mj);
  const isMJ = currentPlayerId === mj?.id;

  // Lobby view
  if (game.status === 'lobby') {
    return (
      <main className="min-h-screen p-4">
        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-lg mx-auto pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-slate-400">En attente des joueurs...</p>
          </div>

          {/* Game Code */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 text-center mb-2">
                Code de la partie
              </p>
              <button
                onClick={copyCode}
                className="w-full text-4xl font-mono font-bold text-center tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {game.code}
              </button>
              <p className="text-sm text-slate-500 text-center mt-2">
                {copied ? '✓ Copié !' : 'Clique pour copier'}
              </p>
            </CardContent>
          </Card>

          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Joueurs</span>
                <span className="text-lg font-normal text-slate-400">
                  {game.players.length} / 20
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {/* MJ */}
                {mj && (
                  <li className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <PlayerAvatar 
                      playerId={mj.id} 
                      pseudo={mj.pseudo} 
                      size="sm" 
                      isMj={true}
                    />
                    <div>
                      <p className="font-medium text-white">{mj.pseudo}</p>
                      <p className="text-xs text-indigo-400">Maître du Jeu</p>
                    </div>
                  </li>
                )}
                
                {/* Other players */}
                {players.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
                  >
                    <PlayerAvatar 
                      playerId={player.id} 
                      pseudo={player.pseudo} 
                      size="sm"
                    />
                    <p className="font-medium text-white">{player.pseudo}</p>
                  </li>
                ))}

                {/* Empty slots */}
                {game.players.length < 6 && (
                  <li className="p-3 border-2 border-dashed border-slate-700 rounded-xl text-center text-slate-500">
                    En attente de joueurs... (min. 6)
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Start Game Button (MJ only) */}
          {isMJ && game.players.length >= 3 && (
            <div className="mt-6">
              <Button 
                className="w-full" 
                size="lg"
                onClick={startGame}
                disabled={isStarting}
              >
                {isStarting ? '⏳ Lancement...' : '🎮 Lancer la partie'}
              </Button>
              {startError && (
                <p className="text-sm text-red-400 text-center mt-2">
                  {startError}
                </p>
              )}
              <p className="text-xs text-slate-500 text-center mt-2">
                Les rôles seront attribués aléatoirement
              </p>
            </div>
          )}

          {/* Back button */}
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => router.push('/')}
          >
            Quitter le lobby
          </Button>
        </div>
      </main>
    );
  }

  // Game in progress - show player's role and game state
  // Find current player using stored playerId
  const currentPlayer = currentPlayerId 
    ? game.players.find(p => p.id === currentPlayerId)
    : null;
  const currentRole = currentPlayer?.role_id 
    ? roles.find(r => r.id === currentPlayer.role_id) 
    : null;
  const roleConfig = currentRole ? getRoleConfig(currentRole.name) : null;

  // Get wolves for wolf players
  const isWolf = currentRole?.team === 'loups';
  const wolves = isWolf 
    ? game.players.filter(p => {
        const pRole = roles.find(r => r.id === p.role_id);
        return pRole?.team === 'loups';
      })
    : [];

  return (
    <main className="min-h-screen p-4">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl",
          game.status === 'nuit' ? 'bg-indigo-900/30' : 'bg-amber-500/10'
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl",
          game.status === 'nuit' ? 'bg-purple-900/30' : 'bg-orange-500/10'
        )} />
      </div>

      <div className="max-w-lg mx-auto pt-8">
        {/* Game Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{game.name}</h1>
          <GamePhaseBadge phase={game.status} className="inline-flex" />
        </div>

        {/* Player's Role Card */}
        {currentRole && roleConfig && (
          <Card className={cn(
            "mb-6 border-2",
            roleConfig.assets.bgColor,
            currentRole.team === 'loups' ? 'border-red-500/50' : 'border-blue-500/50'
          )}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn(
                  "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4",
                  roleConfig.assets.bgColor
                )}>
                  {roleConfig.assets.icon}
                </div>
                <h2 className={cn("text-2xl font-bold mb-2", roleConfig.assets.color)}>
                  {roleConfig.displayName}
                </h2>
                <p className="text-slate-300 mb-4">
                  {roleConfig.description}
                </p>
                <span className={cn(
                  "inline-block px-3 py-1 rounded-full text-sm font-medium",
                  currentRole.team === 'loups' 
                    ? 'bg-red-500/20 text-red-400' 
                    : currentRole.team === 'village'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                )}>
                  Équipe {currentRole.team === 'loups' ? 'Loups-Garous' : currentRole.team === 'village' ? 'Village' : 'Solo'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wolf teammates (only shown to wolves) */}
        {isWolf && wolves.length > 1 && (
          <Card className="mb-6 border border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 text-lg">
                🐺 Meute des Loups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {wolves.map((wolf) => (
                  <li key={wolf.id} className="flex items-center gap-3 p-2 bg-red-500/10 rounded-lg">
                    <PlayerAvatar playerId={wolf.id} pseudo={wolf.pseudo} size="sm" />
                    <span className="text-white">{wolf.pseudo}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-400/70 mt-3">
                Chaque nuit, choisissez ensemble une victime.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Phase Instructions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {game.status === 'nuit' && (
              <div className="text-center">
                <p className="text-xl mb-2">🌙</p>
                <h3 className="font-bold text-white mb-2">C&apos;est la nuit</h3>
                <p className="text-slate-400 text-sm">
                  {isWolf 
                    ? "Concertez-vous avec votre meute pour choisir une victime."
                    : currentRole?.name === 'voyante'
                    ? "Vous pouvez sonder l'âme d'un joueur."
                    : "Le village dort. Attendez le lever du jour..."}
                </p>
              </div>
            )}
            {game.status === 'jour' && (
              <div className="text-center">
                <p className="text-xl mb-2">☀️</p>
                <h3 className="font-bold text-white mb-2">C&apos;est le jour</h3>
                <p className="text-slate-400 text-sm">
                  Discutez avec les autres villageois et trouvez les loups-garous !
                </p>
              </div>
            )}
            {game.status === 'conseil' && (
              <div className="text-center">
                <p className="text-xl mb-2">⚖️</p>
                <h3 className="font-bold text-white mb-2">Conseil du village</h3>
                <p className="text-slate-400 text-sm">
                  Il est temps de voter pour éliminer un suspect.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Joueurs</span>
              <span className="text-sm font-normal text-slate-400">
                {game.players.filter(p => !p.is_mj && p.is_alive !== false).length} en vie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {game.players
                .filter(p => !p.is_mj)
                .map((player) => {
                  const isCurrentPlayer = player.id === currentPlayer?.id;
                  const playerRole = roles.find(r => r.id === player.role_id);
                  const pRoleConfig = playerRole ? getRoleConfig(playerRole.name) : null;
                  
                  return (
                    <li
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        isCurrentPlayer 
                          ? "bg-indigo-500/20 border border-indigo-500/30" 
                          : "bg-slate-800/50"
                      )}
                    >
                      <PlayerAvatar 
                        playerId={player.id} 
                        pseudo={player.pseudo} 
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {player.pseudo}
                          {isCurrentPlayer && <span className="text-indigo-400 text-sm ml-2">(Vous)</span>}
                        </p>
                      </div>
                      {/* Show role icon only for self and wolves see other wolves */}
                      {(isCurrentPlayer || (isWolf && wolves.some(w => w.id === player.id))) && pRoleConfig && (
                        <span className="text-lg">{pRoleConfig.assets.icon}</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
