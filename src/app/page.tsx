'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, Input, MotionCard, CardHeader, CardTitle, CardDescription, CardContent, MoonLogo, NightSky } from '@/components/ui';
import { OnboardingTooltips } from '@/components/game';
import { cn } from '@/lib/utils';
import { PlusCircle, LogIn, FlaskConical, BookOpen, Layers, GraduationCap, Smartphone, Gamepad2, Dices } from 'lucide-react';
import { randomPseudo } from '@/config/pseudos';
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

    // Lien de join (QR du lobby) : ?join=CODE préremplit le code,
    // il ne reste qu'à choisir un pseudo
    const joinCode = new URLSearchParams(window.location.search).get('join');
    if (joinCode) {
      setGameCode(joinCode.toUpperCase().slice(0, 6));
      setMode('join');
    }
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
      {/* Fond "Nuit de village" */}
      <NightSky />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block mb-3">
            <MoonLogo size={76} />
          </div>
          <h1 className="font-display text-5xl font-semibold mb-3 text-moon-100">
            Moonfall
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-moon-100/50 text-sm tracking-[0.2em] uppercase"
          >
            Loup-Garou grandeur nature
          </motion.p>
        </motion.div>

        {/* Active sessions banner - Y2K Sticker Style */}
        <AnimatePresence>
          {sessions.length > 0 && mode === 'home' && !showRejoinPrompt && (
            <MotionCard 
              variant="sticker" 
              rotation={-1}
              className="mb-6 border-moon-500/60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-moon-500" /> Mes parties
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
                      'bg-night-700/50 border border-white/10'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-white">{session.pseudo}</p>
                      <p className="text-xs text-moon-100/40 font-mono">{session.gameCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MotionButton
                        size="sm"
                        variant="sticker"
                        className="bg-moon-500 border-moon-100 text-night-950"
                        onClick={() => handleResumeGame(session)}
                      >
                        Reprendre →
                      </MotionButton>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleForgetGame(session)}
                        className="text-moon-100/40 hover:text-blood-400 p-2"
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
              className="mb-6 border-moon-500/60"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <CardContent className="p-4">
                <p className="text-moon-300 mb-3 font-medium">
                  Le pseudo <strong>{showRejoinPrompt.pseudo}</strong> existe déjà dans cette partie.
                </p>
                <p className="text-moon-100/50 text-sm mb-4">
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
                    className="flex-1 bg-moon-500 border-moon-100 text-night-950"
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
                className="w-full text-lg py-6 gap-3 bg-moon-500 border-moon-100 text-night-950 hover:bg-moon-300"
                onClick={() => setMode('create')}
              >
                <PlusCircle className="w-5 h-5" /> Créer une partie
              </MotionButton>
              <MotionButton
                variant="sticker"
                className="w-full text-lg py-6 gap-3"
                onClick={() => setMode('join')}
              >
                <LogIn className="w-5 h-5" /> Rejoindre une partie
              </MotionButton>

              {/* Demo Mode Button */}
              <MotionButton
                variant="secondary"
                className="w-full text-base py-4 gap-3"
                onClick={handleDemoMode}
                isLoading={isLoading}
              >
                <FlaskConical className="w-4 h-4" /> Essayer la démo
              </MotionButton>

              {/* Liens secondaires */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <MotionButton
                  variant="ghost"
                  className="flex-col gap-1.5 py-4 text-xs text-moon-100/60"
                  onClick={() => router.push('/regles')}
                >
                  <BookOpen className="w-5 h-5" /> Règles
                </MotionButton>
                <MotionButton
                  variant="ghost"
                  className="flex-col gap-1.5 py-4 text-xs text-moon-100/60"
                  onClick={() => router.push('/roles')}
                >
                  <Layers className="w-5 h-5" /> Rôles
                </MotionButton>
                <MotionButton
                  variant="ghost"
                  className="flex-col gap-1.5 py-4 text-xs text-moon-100/60"
                  onClick={() => router.push('/tutorial')}
                >
                  <GraduationCap className="w-5 h-5" /> Tutoriel
                </MotionButton>
              </div>
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
                <PlusCircle className="w-5 h-5 text-moon-500" /> Créer une partie
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
                <button
                  type="button"
                  onClick={() => setPseudo(randomPseudo(pseudo))}
                  className="flex items-center gap-1.5 text-xs text-moon-100/60 hover:text-moon-300 transition-colors"
                >
                  <Dices className="w-4 h-4" /> Pseudo aléatoire
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'text-blood-400 text-sm p-3 rounded-xl',
                        'bg-blood-700/30 border border-blood-500/50'
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
                    className="flex-1 bg-moon-500 border-moon-100 text-night-950"
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
                <LogIn className="w-5 h-5 text-moon-500" /> Rejoindre une partie
              </CardTitle>
              <CardDescription>
                Entre le code fourni par le Maître du jeu
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
                <button
                  type="button"
                  onClick={() => setPseudo(randomPseudo(pseudo))}
                  className="flex items-center gap-1.5 text-xs text-moon-100/60 hover:text-moon-300 transition-colors"
                >
                  <Dices className="w-4 h-4" /> Pseudo aléatoire
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'text-blood-400 text-sm p-3 rounded-xl',
                        'bg-blood-700/30 border border-blood-500/50'
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
                    className="flex-1 bg-moon-500 border-moon-100 text-night-950"
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
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm',
            'bg-night-800/60 border border-white/10 text-moon-100/40'
          )}>
            <Smartphone className="w-4 h-4" /> Ajoute Moonfall à ton écran d&apos;accueil
          </p>
        </motion.div>
      </div>

      {/* Onboarding tooltips */}
      <OnboardingTooltips location="home" />
    </main>
  );
}
