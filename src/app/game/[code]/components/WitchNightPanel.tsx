/**
 * WitchNightPanel - Witch power panel during night
 * Shows who the wolves are targeting and allows using potions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { PlayerWithRole } from '../hooks/types';

interface WitchNightPanelProps {
  alivePlayers: PlayerWithRole[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface WitchStatus {
  wolfTarget: { id: string; pseudo: string } | null;
  hasLifePotion: boolean;
  hasDeathPotion: boolean;
  usedLifePotion: boolean;
  usedDeathPotion: boolean;
  deathPotionTarget: string | null;
}

export function WitchNightPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: WitchNightPanelProps) {
  const [status, setStatus] = useState<WitchStatus>({
    wolfTarget: null,
    hasLifePotion: true,
    hasDeathPotion: true,
    usedLifePotion: false,
    usedDeathPotion: false,
    deathPotionTarget: null,
  });
  const [selectedDeathTarget, setSelectedDeathTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch witch status on mount and when phase changes
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/games/${gameCode}/power/witch?playerId=${currentPlayerId}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Error fetching witch status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const useLifePotion = async () => {
    if (!status.wolfTarget || status.usedLifePotion) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/witch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          action: 'life_potion',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'utilisation de la potion');
      }

      setStatus(prev => ({ ...prev, usedLifePotion: true, hasLifePotion: false }));
      setSuccessMessage(`Potion de vie utilisée ! ${status.wolfTarget.pseudo} sera sauvé(e).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const useDeathPotion = async () => {
    if (!selectedDeathTarget || status.usedDeathPotion) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/witch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          action: 'death_potion',
          targetId: selectedDeathTarget,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'utilisation de la potion');
      }

      const targetName = alivePlayers.find(p => p.id === selectedDeathTarget)?.pseudo;
      setStatus(prev => ({ 
        ...prev, 
        usedDeathPotion: true, 
        hasDeathPotion: false,
        deathPotionTarget: selectedDeathTarget,
      }));
      setSuccessMessage(`Potion de mort utilisée ! ${targetName} mourra cette nuit.`);
      setSelectedDeathTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter targets (cannot target self or MJ)
  const validDeathTargets = alivePlayers.filter(
    p => p.id !== currentPlayerId && !p.is_mj
  );

  return (
    <Card className="mb-6 border border-green-500/20">
      <CardHeader>
        <CardTitle className="text-green-400 text-lg">🧪 Potions de la Sorcière</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* Wolf Target Info */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-2">🐺 Cible des loups cette nuit</h4>
          {status.wolfTarget ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400">💀</span>
              </div>
              <div>
                <p className="text-white font-medium">{status.wolfTarget.pseudo}</p>
                <p className="text-slate-400 text-xs">Va être dévoré(e)...</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Les loups n'ont pas encore voté.</p>
          )}
        </div>

        {/* Life Potion */}
        <div className={cn(
          "p-4 rounded-lg border",
          status.hasLifePotion && !status.usedLifePotion
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-slate-800/30 border-slate-700/50 opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💚</span>
              <div>
                <p className="text-white font-medium">Potion de Vie</p>
                <p className="text-slate-400 text-xs">
                  {status.usedLifePotion 
                    ? 'Déjà utilisée cette partie'
                    : status.hasLifePotion 
                      ? 'Sauve la victime des loups'
                      : 'Non disponible'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={useLifePotion}
              disabled={!status.wolfTarget || !status.hasLifePotion || status.usedLifePotion || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {status.usedLifePotion ? '✓ Utilisée' : 'Sauver'}
            </Button>
          </div>
        </div>

        {/* Death Potion */}
        <div className={cn(
          "p-4 rounded-lg border",
          status.hasDeathPotion && !status.usedDeathPotion
            ? "bg-purple-500/10 border-purple-500/30"
            : "bg-slate-800/30 border-slate-700/50 opacity-60"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💜</span>
            <div>
              <p className="text-white font-medium">Potion de Mort</p>
              <p className="text-slate-400 text-xs">
                {status.usedDeathPotion
                  ? 'Déjà utilisée cette partie'
                  : status.hasDeathPotion
                    ? 'Tue un joueur de ton choix'
                    : 'Non disponible'}
              </p>
            </div>
          </div>

          {status.hasDeathPotion && !status.usedDeathPotion && (
            <>
              <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                {validDeathTargets.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedDeathTarget(player.id)}
                    disabled={isLoading}
                    className={cn(
                      "w-full p-2 rounded-lg border text-left transition-all text-sm",
                      selectedDeathTarget === player.id
                        ? "border-purple-500 bg-purple-500/20 text-white"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                    )}
                  >
                    {player.pseudo}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={useDeathPotion}
                disabled={!selectedDeathTarget || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? 'En cours...' : `Empoisonner ${selectedDeathTarget ? validDeathTargets.find(p => p.id === selectedDeathTarget)?.pseudo : '...'}`}
              </Button>
            </>
          )}
        </div>

        {/* Status */}
        {!status.hasLifePotion && !status.hasDeathPotion && (
          <p className="text-center text-slate-500 text-sm">
            Tu as utilisé toutes tes potions. Attends le jour...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
