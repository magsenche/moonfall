/**
 * LobbyView - Lobby screen before game starts
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { PlayerAvatar, RulesButton } from '@/components/game';
import { NotificationPrompt } from '@/components/game/notification-prompt';
import { getRoleConfig } from '@/config/roles';
import { useGame } from '../context';

export function LobbyView() {
  const { game, roles, currentPlayerId, isMJ, settings, actions, ui, router } = useGame();

  const { gameSettings, showSettings, isSavingSettings, setShowSettings, setGameSettings, saveSettings } =
    settings;

  const mj = game.players.find((p) => p.is_mj);
  const players = game.players.filter((p) => !p.is_mj);

  // In Auto-Garou mode, MJ plays too so count all players for role distribution
  const playersForRoles = gameSettings.autoMode ? game.players.length : players.length;

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
            <p className="text-sm text-slate-400 text-center mb-2">Code de la partie</p>
            <button
              onClick={actions.copyCode}
              className="w-full text-4xl font-mono font-bold text-center tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {game.code}
            </button>
            <p className="text-sm text-slate-500 text-center mt-2">
              {ui.copied ? '✓ Copié !' : 'Clique pour copier'}
            </p>
          </CardContent>
        </Card>

        {/* Notification Prompt */}
        <div className="mb-6">
          <NotificationPrompt playerId={currentPlayerId || undefined} />
        </div>

        {/* Rules Button - Floating on mobile */}
        <RulesButton variant="floating" />

        {/* Players List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Joueurs</span>
              <span className="text-lg font-normal text-slate-400">{game.players.length} / 20</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {/* MJ */}
              {mj && (
                <li className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <PlayerAvatar playerId={mj.id} pseudo={mj.pseudo} size="sm" isMj={true} />
                  <div>
                    <p className="font-medium text-white">{mj.pseudo}</p>
                    <p className="text-xs text-indigo-400">Maître du Jeu</p>
                  </div>
                </li>
              )}

              {/* Other players */}
              {players.map((player) => (
                <li key={player.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <PlayerAvatar playerId={player.id} pseudo={player.pseudo} size="sm" />
                  <p className="font-medium text-white">{player.pseudo}</p>
                </li>
              ))}

              {/* Empty slots */}
              {game.players.length < 3 && (
                <li className="p-3 border-2 border-dashed border-slate-700 rounded-xl text-center text-slate-500">
                  En attente de joueurs... (min. 3)
                </li>
              )}
            </ul>

            {/* Bots buttons (MJ only, for testing) */}
            {isMJ && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">🧪 Mode dev</p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={actions.addBotsToGame}
                    disabled={ui.isAddingBots}
                    className="flex-1"
                  >
                    {ui.isAddingBots ? '⏳...' : '🤖 +5 Bots'}
                  </Button>
                  {players.some((p) => p.pseudo.startsWith('🤖')) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={actions.removeBotsFromGame}
                      disabled={ui.isAddingBots}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️ Retirer bots
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Settings (MJ only) */}
        {isMJ && (
          <Card className="mt-4 bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <CardTitle className="text-sm font-medium text-slate-300">
                  ⚙️ Paramètres de la partie
                </CardTitle>
                <span className="text-slate-400">{showSettings ? '▲' : '▼'}</span>
              </button>
            </CardHeader>

            {showSettings && (
              <CardContent className="space-y-4">
                {/* Night Duration */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">🌙 Durée de la nuit</label>
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
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-medium w-16 text-right">
                      {gameSettings.nightDurationMinutes < 1
                        ? `${Math.round(gameSettings.nightDurationMinutes * 60)}s`
                        : `${gameSettings.nightDurationMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Vote Duration */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">
                    🗳️ Durée du vote (conseil)
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
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-medium w-16 text-right">
                      {gameSettings.voteDurationMinutes < 1
                        ? `${Math.round(gameSettings.voteDurationMinutes * 60)}s`
                        : `${gameSettings.voteDurationMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Council Interval */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">
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
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white font-medium w-16 text-right">
                      {gameSettings.councilIntervalMinutes >= 60
                        ? `${Math.floor(gameSettings.councilIntervalMinutes / 60)}h${gameSettings.councilIntervalMinutes % 60 > 0 ? gameSettings.councilIntervalMinutes % 60 : ''}`
                        : `${gameSettings.councilIntervalMinutes} min`}
                    </span>
                  </div>
                </div>

                {/* Auto-Garou Mode */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-slate-400 block">🤖 Mode Auto-Garou</label>
                      <p className="text-xs text-slate-500 mt-1">
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
                        gameSettings.autoMode ? 'bg-indigo-600' : 'bg-slate-700'
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

                {/* Roles Distribution */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <label className="text-sm text-slate-400 mb-3 block">🎭 Distribution des rôles</label>
                  <p className="text-xs text-slate-500 mb-3">
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
                            className="flex items-center justify-between gap-3 p-2 bg-slate-800 rounded-lg"
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
                                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold"
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
                                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold"
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
                    <div className="mt-3 p-2 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Rôles configurés:</span>
                        <span className="text-white font-medium">
                          {Object.values(gameSettings.rolesDistribution).reduce((a, b) => a + b, 0)} rôles
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-400">Joueurs dans le lobby:</span>
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

                {/* Save Button */}
                <Button variant="secondary" className="w-full" onClick={saveSettings} disabled={isSavingSettings}>
                  {isSavingSettings ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Auto-Garou Mode Banner */}
        {gameSettings.autoMode && (
          <div className="mt-4 p-3 bg-indigo-900/50 border border-indigo-500/50 rounded-xl text-center">
            <span className="text-indigo-300 text-sm font-medium">🤖 Mode Auto-Garou activé</span>
            <p className="text-xs text-indigo-400/80 mt-1">Tout le monde joue • Phases automatiques</p>
          </div>
        )}

        {/* Start Game Button (MJ only) */}
        {isMJ && game.players.length >= 3 && (
          <div className="mt-6">
            <Button className="w-full" size="lg" onClick={actions.startGame} disabled={ui.isStarting}>
              {ui.isStarting ? '⏳ Lancement...' : '🎮 Lancer la partie'}
            </Button>
            {ui.startError && <p className="text-sm text-red-400 text-center mt-2">{ui.startError}</p>}
            <p className="text-xs text-slate-500 text-center mt-2">
              {gameSettings.autoMode
                ? 'Tu recevras aussi un rôle !'
                : 'Les rôles seront attribués aléatoirement'}
            </p>
          </div>
        )}

        {/* Back button */}
        <Button variant="ghost" className="w-full mt-4" onClick={() => router.push('/')}>
          Quitter le lobby
        </Button>
      </div>
    </main>
  );
}
