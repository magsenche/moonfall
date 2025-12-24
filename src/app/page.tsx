'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { 
  savePlayerSession, 
  getAllSessions, 
  clearSessionForGame,
  migrateOldSession,
  type PlayerSession 
} from '@/lib/utils/player-session';

type Mode = 'home' | 'create' | 'join';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [showRejoinPrompt, setShowRejoinPrompt] = useState<{ pseudo: string; code: string } | null>(null);
  
  // Form states
  const [pseudo, setPseudo] = useState('');
  const [gameName, setGameName] = useState('');
  const [gameCode, setGameCode] = useState('');

  // Load stored sessions on mount
  useEffect(() => {
    // Migrate old format if needed
    migrateOldSession();
    
    // Load all stored sessions
    setSessions(getAllSessions());
  }, []);

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

  const handleJoinGame = async (e: React.FormEvent, forceRejoin = false) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setShowRejoinPrompt(null);

    try {
      const response = await fetch(`/api/games/${gameCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, rejoin: forceRejoin }),
      });

      const data = await response.json();

      // Handle rejoin prompt (409 Conflict)
      if (response.status === 409 && data.canRejoin) {
        setShowRejoinPrompt({ pseudo: data.pseudo, code: gameCode.toUpperCase() });
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion');
      }

      // Save player session
      savePlayerSession({
        playerId: data.player.id,
        gameCode: gameCode.toUpperCase(),
        pseudo: data.player.pseudo,
      });

      // Redirect to game
      router.push(`/game/${gameCode.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejoin = async () => {
    if (!showRejoinPrompt) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${showRejoinPrompt.code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: showRejoinPrompt.pseudo, rejoin: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la reconnexion');
      }

      // Save player session
      savePlayerSession({
        playerId: data.player.id,
        gameCode: showRejoinPrompt.code,
        pseudo: data.player.pseudo,
      });

      // Redirect to game
      router.push(`/game/${showRejoinPrompt.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
      setShowRejoinPrompt(null);
    }
  };

  const handleResumeGame = (session: PlayerSession) => {
    router.push(`/game/${session.gameCode}`);
  };

  const handleForgetGame = (session: PlayerSession) => {
    clearSessionForGame(session.gameCode);
    setSessions(getAllSessions());
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-indigo-400">Moon</span>
            <span className="text-purple-400">fall</span>
          </h1>
          <p className="text-slate-400">Loup-Garou Grandeur Nature</p>
        </div>

        {/* Active sessions banner */}
        {sessions.length > 0 && mode === 'home' && !showRejoinPrompt && (
          <Card variant="glass" className="mb-6 border-indigo-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">🎮 Mes parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.slice(0, 3).map((session) => (
                <div 
                  key={session.gameCode}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{session.pseudo}</p>
                    <p className="text-xs text-slate-500 font-mono">{session.gameCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResumeGame(session)}
                    >
                      Reprendre →
                    </Button>
                    <button
                      onClick={() => handleForgetGame(session)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Oublier cette partie"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rejoin prompt modal */}
        {showRejoinPrompt && (
          <Card variant="glass" className="mb-6 border-amber-500/50">
            <CardContent className="p-4">
              <p className="text-amber-200 mb-3">
                Le pseudo <strong>{showRejoinPrompt.pseudo}</strong> existe déjà dans cette partie.
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Est-ce toi ? Tu peux te reconnecter à ta partie.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowRejoinPrompt(null)}
                >
                  Non, annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRejoin}
                  isLoading={isLoading}
                >
                  Oui, c&apos;est moi !
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Home - Choice buttons */}
        {mode === 'home' && !showRejoinPrompt && (
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
              <form onSubmit={(e) => handleJoinGame(e, false)} className="space-y-4">
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

        {/* PWA Install hint */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-sm">
            📱 Ajoute Moonfall à ton écran d&apos;accueil pour recevoir les notifications !
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-4">
          Inspiré de l'émission de Fary & Panayotis sur Canal+
        </p>
      </div>
    </main>
  );
}
