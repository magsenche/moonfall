/**
 * HunterDeathModal - Modal that appears when the Hunter dies
 *
 * Uses GameContext - no props needed.
 * Allows the hunter to choose someone to take down with them.
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

export function HunterDeathModal() {
  const { game, currentPlayerId, alivePlayers, ui } = useGame();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out the hunter from targets
  const validTargets = alivePlayers.filter((p) => p.id !== currentPlayerId && !p.is_mj);

  const handleShoot = async () => {
    if (!selectedTarget || !currentPlayerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${game.code}/power/hunter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hunterId: currentPlayerId,
          targetId: selectedTarget,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du tir');
      }

      // Close modal and mark as processed
      ui.setShowHunterModal(false);
      ui.setHunterModalProcessed(true);
      // Note: gameWinner is set via the game_ended event detection in context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-amber-500/50 bg-night-900">
        <CardHeader className="text-center">
          <div className="text-6xl mb-2">🏹</div>
          <CardTitle className="text-amber-400 text-2xl">Tir du Chasseur</CardTitle>
          <p className="text-moon-100/70 mt-2">
            Tu es mort, mais tu peux emporter quelqu&apos;un avec toi !
          </p>
          <p className="text-amber-300/70 text-sm mt-1">Choisis ta cible rapidement...</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-blood-500/20 border border-blood-500/50 rounded-lg text-blood-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
            {validTargets.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedTarget(player.id)}
                disabled={isLoading}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all',
                  selectedTarget === player.id
                    ? 'border-amber-500 bg-amber-500/20 text-white'
                    : 'border-night-700 bg-night-800/50 text-moon-100/70 hover:border-night-600'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-night-700 flex items-center justify-center text-lg">
                    👤
                  </div>
                  <span className="font-medium">{player.pseudo}</span>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleShoot}
            disabled={!selectedTarget || isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Tir en cours...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🎯 Tirer sur{' '}
                {selectedTarget ? validTargets.find((p) => p.id === selectedTarget)?.pseudo : '...'}
              </span>
            )}
          </Button>

          <p className="text-center text-moon-100/40 text-xs mt-4">
            Ce tir est définitif et ne peut pas être annulé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
