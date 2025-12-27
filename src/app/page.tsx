'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, Input, MotionCard, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { OnboardingTooltips } from '@/components/game';
import { cn } from '@/lib/utils';
import { 
  savePlayerSession, 
  getAllSessions, 
  clearSessionForGame,
  migrateOldSession,
  type PlayerSession 
} from '@/lib/utils/player-session';
import { joinGame, rejoinGame, createDemoGame, ApiError } from '@/lib/api';

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
      const code = gameCode.toUpperCase();
      const data = forceRejoin 
        ? await rejoinGame(code, pseudo)
        : await joinGame(code, pseudo);

      // Save player session
      savePlayerSession({
        playerId: data.player.id,
        gameCode: code,
        pseudo: data.player.pseudo,
      });

      // Redirect to game
      router.push(`/game/${code}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Handle rejoin prompt
        setShowRejoinPrompt({ pseudo, code: gameCode.toUpperCase() });
        setIsLoading(false);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejoin = async () => {
    if (!showRejoinPrompt) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const data = await rejoinGame(showRejoinPrompt.code, showRejoinPrompt.pseudo);

      // Save player session
      savePlayerSession({
        playerId: data.player.id,
        gameCode: showRejoinPrompt.code,
        pseudo: data.player.pseudo,
      });

      // Redirect to game
      router.push(`/game/${showRejoinPrompt.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
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

  const handleDemoMode = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Generate a random demo pseudo
      const demoPseudo = `Joueur ${Math.floor(Math.random() * 1000)}`;
      
      const data = await createDemoGame(demoPseudo);

      // Save player session
      savePlayerSession({
        playerId: data.playerId,
        gameCode: data.code,
        pseudo: demoPseudo,
      });

      // Redirect to game
      router.push(`/game/${data.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom">
      {/* Y2K Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-zinc-900 to-zinc-950" />
        
        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Animated blobs */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-3xl bg-indigo-600/20"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '10%', left: '-10%' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-3xl bg-purple-600/15"
          animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ bottom: '5%', right: '-5%' }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo - Y2K Style */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🌙</span>
          </motion.div>
          <h1 className={cn(
            'text-5xl font-black mb-2 tracking-tight',
          )}
            style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}
          >
            <span className="text-indigo-400">Moon</span>
            <span className="text-purple-400">fall</span>
          </h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'inline-block px-4 py-1 rounded-full text-sm font-medium',
              'bg-zinc-800/80 border border-white/20 text-slate-300',
              'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]'
            )}
          >
            🐺 Loup-Garou Grandeur Nature
          </motion.p>
        </motion.div>

        {/* Active sessions banner - Y2K Sticker Style */}
        <AnimatePresence>
          {sessions.length > 0 && mode === 'home' && !showRejoinPrompt && (
            <MotionCard 
              variant="sticker" 
              rotation={-1}
              className="mb-6 border-indigo-500/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>🎮</span> Mes parties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.slice(0, 3).map((session, i) => (
                  <motion.div 
                    key={session.gameCode}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl',
                      'bg-zinc-700/50 border border-white/10'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-white">{session.pseudo}</p>
                      <p className="text-xs text-slate-500 font-mono">{session.gameCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MotionButton
                        size="sm"
                        variant="sticker"
                        className="bg-indigo-600 border-indigo-400"
                        onClick={() => handleResumeGame(session)}
                      >
                        Reprendre →
                      </MotionButton>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleForgetGame(session)}
                        className="text-slate-500 hover:text-red-400 p-2"
                        title="Oublier cette partie"
                      >
                        ✕
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </MotionCard>
          )}
        </AnimatePresence>

        {/* Rejoin prompt modal - Y2K Style */}
        <AnimatePresence>
          {showRejoinPrompt && (
            <MotionCard 
              variant="sticker" 
              rotation={1}
              className="mb-6 border-amber-500/50"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <CardContent className="p-4">
                <p className="text-amber-200 mb-3 font-medium">
                  Le pseudo <strong>{showRejoinPrompt.pseudo}</strong> existe déjà dans cette partie.
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  Est-ce toi ? Tu peux te reconnecter à ta partie.
                </p>
                <div className="flex gap-2">
                  <MotionButton
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowRejoinPrompt(null)}
                  >
                    Non, annuler
                  </MotionButton>
                  <MotionButton
                    variant="sticker"
                    className="flex-1 bg-amber-600 border-amber-400"
                    onClick={handleRejoin}
                    isLoading={isLoading}
                  >
                    Oui, c&apos;est moi !
                  </MotionButton>
                </div>
              </CardContent>
            </MotionCard>
          )}
        </AnimatePresence>

        {/* Home - Choice buttons - Y2K Style */}
        <AnimatePresence mode="wait">
          {mode === 'home' && !showRejoinPrompt && (
            <motion.div 
              key="home-buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <MotionButton 
                variant="sticker"
                className={cn(
                  "w-full text-lg py-6",
                  "bg-indigo-600 border-indigo-400 hover:bg-indigo-500"
                )}
                onClick={() => setMode('create')}
              >
                🎮 Créer une partie
              </MotionButton>
              <MotionButton 
                variant="sticker"
                className={cn(
                  "w-full text-lg py-6",
                  "bg-purple-600 border-purple-400 hover:bg-purple-500"
                )}
                onClick={() => setMode('join')}
              >
                🚀 Rejoindre une partie
              </MotionButton>

              {/* Demo Mode Button */}
              <MotionButton 
                variant="ghost"
                className={cn(
                  "w-full text-base py-4",
                  "bg-zinc-800/50 border border-amber-500/50 hover:bg-amber-900/30",
                  "text-amber-400 hover:text-amber-300"
                )}
                onClick={handleDemoMode}
                isLoading={isLoading}
              >
                🧪 Tester une partie (Démo)
              </MotionButton>

              {/* Demo description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center text-xs text-slate-500 px-4"
              >
                Le mode démo lance une partie solo avec des bots pour découvrir le jeu
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Game Form - Y2K Style */}
        {mode === 'create' && (
          <MotionCard 
            variant="sticker" 
            rotation={0.5}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎮</span> Créer une partie
              </CardTitle>
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
                
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'text-red-400 text-sm p-3 rounded-xl',
                        'bg-red-900/50 border border-red-500/50'
                      )}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <MotionButton 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setMode('home'); setError(null); }}
                    className="flex-1"
                  >
                    ← Retour
                  </MotionButton>
                  <MotionButton 
                    type="submit" 
                    variant="sticker"
                    className="flex-1 bg-emerald-600 border-emerald-400"
                    isLoading={isLoading}
                  >
                    Créer ✓
                  </MotionButton>
                </div>
              </form>
            </CardContent>
          </MotionCard>
        )}

        {/* Join Game Form - Y2K Style */}
        {mode === 'join' && (
          <MotionCard 
            variant="sticker" 
            rotation={-0.5}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚀</span> Rejoindre une partie
              </CardTitle>
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
                
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'text-red-400 text-sm p-3 rounded-xl',
                        'bg-red-900/50 border border-red-500/50'
                      )}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <MotionButton 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setMode('home'); setError(null); }}
                    className="flex-1"
                  >
                    ← Retour
                  </MotionButton>
                  <MotionButton 
                    type="submit" 
                    variant="sticker"
                    className="flex-1 bg-purple-600 border-purple-400"
                    isLoading={isLoading}
                  >
                    Rejoindre →
                  </MotionButton>
                </div>
              </form>
            </CardContent>
          </MotionCard>
        )}

        {/* PWA Install hint - Y2K Style */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className={cn(
            'inline-block px-4 py-2 rounded-full text-sm',
            'bg-zinc-800/60 border border-white/10 text-slate-500'
          )}>
            📱 Ajoute Moonfall à ton écran d&apos;accueil !
          </p>
        </motion.div>
      </div>

      {/* Onboarding tooltips */}
      <OnboardingTooltips location="home" />
    </main>
  );
}
