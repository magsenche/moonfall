/**
 * LobbyView - Y2K styled Lobby screen before game starts
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ClipboardCopy, Check, Settings2, Moon as MoonIcon, Bot, Play, ArrowLeft, Hourglass, Users, FlaskConical, Vote, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { motion, AnimatePresence } from 'framer-motion';
import { playJoinCue } from '@/lib/sounds';
import { AvatarPicker } from './AvatarPicker';
import { ProcesCard } from './ProcesCard';
import { MotionCard, CardContent, CardHeader, CardTitle, MotionButton, Button } from '@/components/ui';
import { PlayerAvatar, RulesButton, PhaseBackground, OnboardingTooltips } from '@/components/game';
import { NotificationPrompt } from '@/components/game/notification-prompt';
import { getRoleConfig } from '@/config/roles';
import { classicComposition } from '@/lib/game/composition';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

const emptySubscribe = () => () => {};

// Simple item animation - no stagger to avoid flickering on realtime updates
const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export function LobbyView() {
  const { game, roles, currentPlayerId, isMJ, settings, actions, ui, router } = useGame();

  const {
    gameSettings,
    showSettings,
    isSavingSettings,
    setShowSettings,
    setGameSettings,
    saveSettings,
    applySettings,
  } = settings;

  const isClassic = gameSettings.classicComposition;

  const applyClassicPreset = () =>
    applySettings({
      ...gameSettings,
      classicComposition: true,
      missionsEnabled: false,
      shopEnabled: false,
      rolesDistribution: {},
      autoMode: true,
      nightDurationMinutes: 2,
      voteDurationMinutes: 3,
      councilIntervalMinutes: 10,
    });

  const applyFullPreset = () =>
    applySettings({
      ...gameSettings,
      classicComposition: false,
      missionsEnabled: true,
      shopEnabled: true,
    });

  const mj = game.players.find((p) => p.is_mj);
  const players = game.players.filter((p) => !p.is_mj);

  // Lien de join encodé dans le QR — origin connu côté client uniquement
  // (SSR-safe : null côté serveur, pas de setState dans un effet)
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => null
  );
  const joinUrl = origin ? `${origin}/?join=${game.code}` : null;

  // Pop sonore + vibration à chaque arrivée (façon Kahoot)
  const previousCountRef = useRef(game.players.length);
  useEffect(() => {
    if (game.players.length > previousCountRef.current) {
      playJoinCue();
    }
    previousCountRef.current = game.players.length;
  }, [game.players.length]);

  // In Auto-Garou mode, MJ plays too so count all players for role distribution
  const playersForRoles = gameSettings.autoMode ? game.players.length : players.length;

  return (
    <main className="min-h-screen safe-area-top safe-area-bottom">
      {/* Y2K Background */}
      <PhaseBackground phase="lobby" players={game.players} />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-8">
        {/* Header - Y2K Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.h1 
            className="text-3xl font-black text-white mb-2 tracking-tight"
            style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}
          >
            {game.name}
          </motion.h1>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={cn(
              'inline-block px-4 py-1.5 rounded-full',
              'bg-village-600/30 border-2 border-village-400/50 text-village-300',
              'text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]'
            )}
          >
            <Hourglass className="w-4 h-4 inline -mt-0.5" /> En attente des joueurs...
          </motion.div>
        </motion.div>

        {/* Game Code - Sticker Card */}
        <MotionCard variant="sticker" rotation={1} className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-moon-100/60 text-center mb-2 font-medium">Code de la partie</p>
            <motion.button
              onClick={actions.copyCode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-full text-4xl font-mono font-black text-center tracking-widest',
                'text-village-400 hover:text-village-300 transition-colors',
                'py-2'
              )}
            >
              {game.code}
            </motion.button>
            <motion.p
              className="text-sm text-moon-100/40 text-center mt-2"
              animate={ui.copied ? { scale: [1, 1.1, 1] } : {}}
            >
              {ui.copied ? <><Check className="w-4 h-4 inline -mt-0.5" /> Copié !</> : <><ClipboardCopy className="w-4 h-4 inline -mt-0.5" /> Clique pour copier</>}
            </motion.p>

            {/* QR de join : scanner → home avec le code prérempli */}
            {joinUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex flex-col items-center gap-2"
              >
                <div className="bg-white rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] rotate-1">
                  <QRCodeSVG value={joinUrl} size={150} bgColor="#ffffff" fgColor="#131629" />
                </div>
                <p className="text-xs text-moon-100/40">
                  Scanne-moi : plus qu&apos;un pseudo à choisir
                </p>
              </motion.div>
            )}
          </CardContent>
        </MotionCard>

        {/* Notification Prompt */}
        <div className="mb-6">
          <NotificationPrompt playerId={currentPlayerId || undefined} />
        </div>

        {/* Rules Button - Floating on mobile */}
        <RulesButton variant="floating" />

        {/* Players Grid - Y2K Sticker Style */}
        <MotionCard variant="sticker" rotation={-0.5}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-6 h-6 text-village-300" />
                Joueurs
              </span>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-bold',
                'bg-village-400/20 border border-village-400/40 text-village-300'
              )}>
                {game.players.length} / 20
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
              {/* MJ */}
              {mj && (
                <motion.div
                  key={mj.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  className={cn(
                    'relative flex flex-col items-center p-3 rounded-xl',
                    'bg-night-700/50 border-2 border-village-400',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]'
                  )}
                >
                  <PlayerAvatar playerId={mj.id} pseudo={mj.pseudo} size="md" isMj={true} />
                  <p className="mt-2 text-xs font-bold text-white truncate max-w-full">{mj.pseudo}</p>
                  <span className={cn(
                    'absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md',
                    'bg-amber-500 border-2 border-white text-white',
                    'text-[8px] font-black uppercase',
                    'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]'
                  )}>
                    MJ
                  </span>
                </motion.div>
              )}

              {/* Other players */}
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-xl',
                    'bg-night-800/80 border-2 border-white/30',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
                    player.id === currentPlayerId && 'border-village-400 bg-night-700/30'
                  )}
                  style={{ transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (i % 3)}deg)` }}
                >
                  <PlayerAvatar playerId={player.id} pseudo={player.pseudo} size="md" />
                  <p className="mt-2 text-xs font-bold text-white truncate max-w-full">{player.pseudo}</p>
                  {player.id === currentPlayerId && (
                    <span className={cn(
                      'absolute -top-1 -left-1 px-1.5 py-0.5 rounded-md',
                      'bg-village-400 border-2 border-white text-white',
                      'text-[8px] font-bold uppercase',
                      'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]'
                    )}>
                      TOI
                    </span>
                  )}
                </motion.div>
              ))}
              </AnimatePresence>
            </div>

            {/* Empty slots */}
            {game.players.length < 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'mt-4 p-4 rounded-xl text-center',
                  'border-2 border-dashed border-night-600 text-moon-100/40'
                )}
              >
                En attente de joueurs... (min. 3)
              </motion.div>
            )}

            {/* Bots buttons (MJ only, for testing) */}
            {isMJ && (
              <div className="mt-4 pt-4 border-t border-night-700">
                <p className="text-xs text-moon-100/40 mb-2"><FlaskConical className="w-3.5 h-3.5 inline -mt-0.5" /> Mode dev</p>
                <div className="flex gap-2">
                  <MotionButton
                    variant="secondary"
                    size="sm"
                    onClick={actions.addBotsToGame}
                    disabled={ui.isAddingBots}
                    className="flex-1"
                  >
                    {ui.isAddingBots ? '...' : <><Bot className="w-4 h-4 inline -mt-0.5" /> +5 Bots</>}
                  </MotionButton>
                  {players.some((p) => p.pseudo.startsWith('🤖')) && (
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      onClick={actions.removeBotsFromGame}
                      disabled={ui.isAddingBots}
                      className="text-blood-400 hover:text-blood-400"
                    >
                      🗑️ Retirer bots
                    </MotionButton>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Choix d'avatar (chacun le sien) */}
        {currentPlayerId && <AvatarPicker gameCode={game.code} playerId={currentPlayerId} />}

        {/* Procès d'avant-partie — le MJ arbitre n'accuse pas (il ne joue pas) */}
        {currentPlayerId && (gameSettings.autoMode || !isMJ) && (
          <ProcesCard
            gameCode={game.code}
            playerId={currentPlayerId}
            players={gameSettings.autoMode ? game.players : players}
          />
        )}

        {/* Presets (MJ only) - Y2K Style */}
        {isMJ && (
          <MotionCard variant="sticker" rotation={-0.4} className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-moon-100/70 flex items-center gap-2">
                <MoonIcon className="w-5 h-5 text-moon-500" />
                Type de partie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MotionButton
                  variant="sticker"
                  onClick={applyClassicPreset}
                  disabled={isSavingSettings}
                  className={cn(
                    'flex-col py-3 h-auto',
                    isClassic
                      ? 'bg-village-600 border-village-300'
                      : 'bg-night-700 border-night-500'
                  )}
                >
                  <span className="font-black">🐺 Classique</span>
                  <span className="text-[10px] font-medium opacity-80 normal-case">
                    Comme le jeu de cartes
                  </span>
                </MotionButton>
                <MotionButton
                  variant="sticker"
                  onClick={applyFullPreset}
                  disabled={isSavingSettings}
                  className={cn(
                    'flex-col py-3 h-auto',
                    !isClassic
                      ? 'bg-village-600 border-village-300'
                      : 'bg-night-700 border-night-500'
                  )}
                >
                  <span className="font-black">✨ Complète</span>
                  <span className="text-[10px] font-medium opacity-80 normal-case">
                    Missions + boutique
                  </span>
                </MotionButton>
              </div>

              {isClassic && (
                <div className="mt-3 p-3 bg-night-800/80 rounded-xl border border-night-600">
                  <p className="text-xs text-moon-100/60 mb-2 font-medium">
                    Composition pour {playersForRoles} joueur{playersForRoles > 1 ? 's' : ''} :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(classicComposition(playersForRoles)).map(([roleName, count]) => {
                      const roleConfig = getRoleConfig(roleName);
                      return (
                        <span
                          key={roleName}
                          className={cn(
                            'px-2 py-1 rounded-lg text-xs font-bold',
                            'bg-night-700/80 border border-night-500 text-white'
                          )}
                        >
                          {count}× {roleConfig.assets.icon} {roleConfig.displayName}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-moon-100/40 mt-2">
                    Recalculée au lancement selon les joueurs présents · missions et boutique
                    désactivées
                  </p>
                </div>
              )}
            </CardContent>
          </MotionCard>
        )}

        {/* Game Settings (MJ only) - Y2K Style */}
        {isMJ && (
          <MotionCard variant="sticker" rotation={0.3} className="mt-4">
            <CardHeader className="pb-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <CardTitle className="text-sm font-bold text-moon-100/70 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-moon-500" />
                  Paramètres de la partie
                </CardTitle>
                <motion.span 
                  animate={{ rotate: showSettings ? 180 : 0 }}
                  className="text-moon-100/60"
                >
                  ▼
                </motion.span>
              </motion.button>
            </CardHeader>

            {showSettings && (
              <CardContent className="space-y-4">
                {/* Night Duration */}
                <div>
                  <label className="text-sm text-moon-100/60 mb-1 block font-medium">Durée de la nuit</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.5}
                      max={60}
                      step={0.5}
                      value={gameSettings.nightDurationMinutes}
                      onChange={(e) =>
                        setGameSettings({
                          ...gameSettings,
                          nightDurationMinutes: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-night-700 rounded-lg appearance-none cursor-pointer accent-village-400"
                    />
                    <span className={cn(
                      'text-white font-bold w-16 text-right px-2 py-1 rounded-lg',
                      'bg-night-700/50 text-sm'
                    )}>
                      {gameSettings.nightDurationMinutes < 1
                        ? `${Math.round(gameSettings.nightDurationMinutes * 60)}s`
                        : `${gameSettings.nightDurationMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Vote Duration */}
                <div>
                  <label className="text-sm text-moon-100/60 mb-1 block font-medium">
                    <Vote className="w-4 h-4 inline -mt-0.5" /> Durée du vote (conseil)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={gameSettings.voteDurationMinutes}
                      onChange={(e) =>
                        setGameSettings({
                          ...gameSettings,
                          voteDurationMinutes: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-night-700 rounded-lg appearance-none cursor-pointer accent-village-400"
                    />
                    <span className={cn(
                      'text-white font-bold w-16 text-right px-2 py-1 rounded-lg',
                      'bg-night-700/50 text-sm'
                    )}>
                      {gameSettings.voteDurationMinutes < 1
                        ? `${Math.round(gameSettings.voteDurationMinutes * 60)}s`
                        : `${gameSettings.voteDurationMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Council Interval */}
                <div>
                  <label className="text-sm text-moon-100/60 mb-1 block">
                    ☀️ Durée du jour (avant conseil)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={480}
                      step={1}
                      value={gameSettings.councilIntervalMinutes}
                      onChange={(e) =>
                        setGameSettings({
                          ...gameSettings,
                          councilIntervalMinutes: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-night-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-medium w-16 text-right">
                      {gameSettings.councilIntervalMinutes >= 60
                        ? `${Math.floor(gameSettings.councilIntervalMinutes / 60)}h${gameSettings.councilIntervalMinutes % 60 > 0 ? gameSettings.councilIntervalMinutes % 60 : ''}`
                        : `${gameSettings.councilIntervalMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Auto-Garou Mode */}
                <div className="border-t border-night-700 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-moon-100/60 block">Mode Auto-Garou</label>
                      <p className="text-xs text-moon-100/40 mt-1">
                        Sans MJ dédié : phases automatiques, tout le monde joue
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setGameSettings({
                          ...gameSettings,
                          autoMode: !gameSettings.autoMode,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        gameSettings.autoMode ? 'bg-village-600' : 'bg-night-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          gameSettings.autoMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Roles Distribution (masquée en partie classique : composition auto) */}
                {!isClassic && (
                <div className="border-t border-night-700 pt-4 mt-4">
                  <label className="text-sm text-moon-100/60 mb-3 block">🎭 Distribution des rôles</label>
                  <p className="text-xs text-moon-100/40 mb-3">
                    Laisse à 0 pour une distribution automatique (~1/3 loups, 1 voyante)
                  </p>
                  <div className="space-y-3">
                    {roles
                      .filter((r) => r.is_active)
                      .map((role) => {
                        const count = gameSettings.rolesDistribution[role.id] ?? 0;
                        const roleConfig = getRoleConfig(role.name);

                        return (
                          <div
                            key={role.id}
                            className="flex items-center justify-between gap-3 p-2 bg-night-800 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span>{roleConfig.assets.icon}</span>
                              <span className={`text-sm font-medium ${roleConfig.assets.color}`}>
                                {roleConfig.displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setGameSettings({
                                    ...gameSettings,
                                    rolesDistribution: {
                                      ...gameSettings.rolesDistribution,
                                      [role.id]: Math.max(0, count - 1),
                                    },
                                  })
                                }
                                className="w-8 h-8 rounded-full bg-night-700 hover:bg-night-600 text-white font-bold"
                                disabled={count === 0}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-white font-medium">{count}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setGameSettings({
                                    ...gameSettings,
                                    rolesDistribution: {
                                      ...gameSettings.rolesDistribution,
                                      [role.id]: count + 1,
                                    },
                                  })
                                }
                                className="w-8 h-8 rounded-full bg-night-700 hover:bg-night-600 text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {/* Total count indicator */}
                  {Object.values(gameSettings.rolesDistribution).some((v) => v > 0) && (
                    <div className="mt-3 p-2 bg-night-700/50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-moon-100/60">Rôles configurés:</span>
                        <span className="text-white font-medium">
                          {Object.values(gameSettings.rolesDistribution).reduce((a, b) => a + b, 0)} rôles
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-moon-100/60">Joueurs dans le lobby:</span>
                        <span className="text-white font-medium">{playersForRoles} joueurs</span>
                      </div>
                      {Object.values(gameSettings.rolesDistribution).reduce((a, b) => a + b, 0) !==
                        playersForRoles && (
                        <p className="text-xs text-yellow-400 mt-2">
                          ⚠️ Le nombre de rôles doit correspondre au nombre de joueurs
                        </p>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Save Button - Y2K sticker style */}
                <MotionButton 
                  variant="sticker" 
                  className="w-full bg-village-600 border-village-400" 
                  onClick={saveSettings} 
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? 'Sauvegarde...' : <><Save className="w-4 h-4 inline -mt-0.5" /> Sauvegarder</>}
                </MotionButton>
              </CardContent>
            )}
          </MotionCard>
        )}

        {/* Auto-Garou Mode Banner */}
        {gameSettings.autoMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mt-4 p-3 rounded-xl text-center',
              'bg-night-700/50 border-2 border-village-400/50',
              'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]'
            )}
          >
            <span className="text-village-300 text-sm font-bold">Mode Auto-Garou activé</span>
            <p className="text-xs text-village-400/80 mt-1">Tout le monde joue • Phases automatiques</p>
          </motion.div>
        )}

        {/* Start Game Button (MJ only) - Y2K style */}
        {isMJ && game.players.length >= 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <MotionButton 
              variant="sticker"
              className={cn(
                "w-full text-lg py-4",
                "bg-emerald-600 border-emerald-400 hover:bg-emerald-500"
              )}
              onClick={actions.startGame} 
              disabled={ui.isStarting}
            >
              {ui.isStarting ? 'Lancement...' : <><Play className="w-5 h-5 inline -mt-0.5" /> Lancer la partie</>}
            </MotionButton>
            {ui.startError && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-blood-400 text-center mt-2"
              >
                {ui.startError}
              </motion.p>
            )}
            <p className="text-xs text-moon-100/40 text-center mt-2">
              {gameSettings.autoMode
                ? 'Tu recevras aussi un rôle !'
                : 'Les rôles seront attribués aléatoirement'}
            </p>
          </motion.div>
        )}

        {/* Back button */}
        <MotionButton 
          variant="ghost" 
          className="w-full mt-4" 
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4 inline -mt-0.5" /> Quitter le lobby
        </MotionButton>
      </div>

      {/* Onboarding tooltips for new users */}
      <OnboardingTooltips location="lobby" />
    </main>
  );
}
