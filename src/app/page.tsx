'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { savePlayerSession } from '@/lib/utils/player-session';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

type Mode = 'home' | 'create' | 'join';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<{ code: string; name: string } | null>(null);
  const [checkingGame, setCheckingGame] = useState(false);
  
  // Form states
  const [pseudo, setPseudo] = useState('');
  const [gameName, setGameName] = useState('');
  const [gameCode, setGameCode] = useState('');

  // Vérifier si l'utilisateur a une partie en cours
  useEffect(() => {
    if (user) {
      checkActiveGame();
    }
  }, [user]);

  const checkActiveGame = async () => {
    if (!user) return;
    
    setCheckingGame(true);
    try {
      const supabase = createClient();
      
      // Chercher une partie active où le joueur participe
      const { data: player } = await supabase
        .from('players')
        .select('game_id, games!inner(code, name, status)')
        .eq('user_id', user.id)
        .in('games.status', ['lobby', 'jour', 'nuit', 'conseil'])
        .single();
      
      if (player && player.games) {
        const game = player.games as { code: string; name: string };
        setActiveGame({ code: game.code, name: game.name });
      }
    } catch (err) {
      // Pas de partie active, c'est OK
      console.log('No active game found');
    } finally {
      setCheckingGame(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gameName, pseudo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      // Save player session
      savePlayerSession({
        playerId: data.playerId,
        gameCode: data.code,
        pseudo,
      });

      // Redirect to lobby
      router.push(`/game/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/games/${gameCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion');
      }

      // Save player session
      savePlayerSession({
        playerId: data.player.id,
        gameCode: gameCode.toUpperCase(),
        pseudo,
      });

      // Redirect to lobby
      router.push(`/game/${gameCode.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* User status bar */}
        {!authLoading && (
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-slate-400">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-slate-500 hover:text-red-400 transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Se connecter
              </button>
            )}
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-indigo-400">Moon</span>
            <span className="text-purple-400">fall</span>
          </h1>
          <p className="text-slate-400">Loup-Garou Grandeur Nature</p>
        </div>

        {/* Active game banner */}
        {activeGame && (
          <Card variant="glass" className="mb-6 border-indigo-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Partie en cours</p>
                  <p className="font-semibold">{activeGame.name}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/game/${activeGame.code}`)}
                >
                  Rejoindre →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {(authLoading || checkingGame) && (
          <div className="text-center py-8">
            <div className="animate-pulse text-slate-400">Chargement...</div>
          </div>
        )}

        {/* Home - Choice buttons */}
        {mode === 'home' && !authLoading && !checkingGame && (
          <div className="space-y-4">
            <Button 
              className="w-full text-lg py-6" 
              size="lg"
              onClick={() => setMode('create')}
            >
              🎮 Créer une partie
            </Button>
            <Button 
              className="w-full text-lg py-6" 
              variant="secondary" 
              size="lg"
              onClick={() => setMode('join')}
            >
              🚀 Rejoindre une partie
            </Button>
          </div>
        )}

        {/* Create Game Form */}
        {mode === 'create' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>🎮 Créer une partie</CardTitle>
              <CardDescription>
                Tu seras le Maître du Jeu (MJ) de cette partie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGame} className="space-y-4">
                <Input
                  label="Nom de la partie"
                  placeholder="Ex: Loup-Garou du Nouvel An"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  label="Ton pseudo"
                  placeholder="Ex: Jean-Michel"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  required
                  maxLength={20}
                />
                
                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setMode('home'); setError(null); }}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    Créer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Join Game Form */}
        {mode === 'join' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>🚀 Rejoindre une partie</CardTitle>
              <CardDescription>
                Entre le code fourni par le MJ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinGame} className="space-y-4">
                <Input
                  label="Code de la partie"
                  placeholder="Ex: ABC123"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
                <Input
                  label="Ton pseudo"
                  placeholder="Ex: Jean-Michel"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  required
                  maxLength={20}
                />
                
                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setMode('home'); setError(null); }}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    Rejoindre
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-8">
          Inspiré de l'émission de Fary & Panayotis sur Canal+
        </p>
      </div>
    </main>
  );
}
