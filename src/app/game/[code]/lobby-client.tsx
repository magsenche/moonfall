'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PlayerAvatar, GamePhaseBadge } from '@/components/game';
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

  const mj = game.players.find(p => p.is_mj);
  const players = game.players.filter(p => !p.is_mj);

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
          {mj && game.players.length >= 3 && (
            <div className="mt-6">
              <Button className="w-full" size="lg">
                🎮 Lancer la partie
              </Button>
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

  // Game in progress - TODO: implement game view
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-2xl mb-4">🎮</p>
          <h1 className="text-xl font-bold">Partie en cours</h1>
          <p className="text-slate-400 mt-2">
            Status: {game.status}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
