/**
 * SessionRecovery - Recovery screen for players who lost their session
 *
 * Uses GameContext - no props needed.
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useGame } from '../context';

export function SessionRecovery() {
  const { game, sessionRecovery } = useGame();

  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-village-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-village-400/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">🔄 Retrouver ma partie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-moon-100/60 text-center text-sm">
            Tu as changé d&apos;appareil ou de navigateur ?
            <br />
            Entre ton pseudo pour retrouver ta partie.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={sessionRecovery.recoveryPseudo}
              onChange={(e) => sessionRecovery.setRecoveryPseudo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sessionRecovery.recoverSession()}
              placeholder="Ton pseudo"
              className="w-full px-4 py-3 bg-night-800/50 border border-night-700/50 rounded-xl text-white placeholder:text-moon-100/40 focus:outline-none focus:ring-2 focus:ring-village-400"
              autoFocus
            />

            {sessionRecovery.recoveryError && (
              <p className="text-blood-400 text-sm text-center">{sessionRecovery.recoveryError}</p>
            )}

            <Button
              onClick={sessionRecovery.recoverSession}
              disabled={sessionRecovery.isRecovering || !sessionRecovery.recoveryPseudo.trim()}
              className="w-full"
            >
              {sessionRecovery.isRecovering ? 'Recherche...' : 'Retrouver ma session'}
            </Button>
          </div>

          <div className="pt-4 border-t border-night-700/50">
            <p className="text-moon-100/40 text-xs text-center mb-3">Joueurs dans cette partie :</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {game.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => sessionRecovery.setRecoveryPseudo(p.pseudo)}
                  className="px-3 py-1 bg-night-700/50 hover:bg-night-600/50 rounded-full text-sm text-moon-100/70 transition-colors"
                >
                  {p.pseudo}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
