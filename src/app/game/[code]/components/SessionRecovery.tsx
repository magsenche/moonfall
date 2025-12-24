/**
 * SessionRecovery - Recovery screen for players who lost their session
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import type { PartialPlayer } from '../hooks/types';

interface SessionRecoveryProps {
  players: PartialPlayer[];
  recoveryPseudo: string;
  recoveryError: string | null;
  isRecovering: boolean;
  onPseudoChange: (pseudo: string) => void;
  onRecover: () => void;
}

export function SessionRecovery({
  players,
  recoveryPseudo,
  recoveryError,
  isRecovering,
  onPseudoChange,
  onRecover,
}: SessionRecoveryProps) {
  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">🔄 Retrouver ma partie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-center text-sm">
            Tu as changé d&apos;appareil ou de navigateur ?<br />
            Entre ton pseudo pour retrouver ta partie.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={recoveryPseudo}
              onChange={(e) => onPseudoChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRecover()}
              placeholder="Ton pseudo"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            {recoveryError && (
              <p className="text-red-400 text-sm text-center">{recoveryError}</p>
            )}

            <Button
              onClick={onRecover}
              disabled={isRecovering || !recoveryPseudo.trim()}
              className="w-full"
            >
              {isRecovering ? 'Recherche...' : 'Retrouver ma session'}
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-700/50">
            <p className="text-slate-500 text-xs text-center mb-3">
              Joueurs dans cette partie :
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => onPseudoChange(p.pseudo)}
                  className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-full text-sm text-slate-300 transition-colors"
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
