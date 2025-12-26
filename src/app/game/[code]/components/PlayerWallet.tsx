/**
 * PlayerWallet - Shows player's points and active powers
 * Now receives pre-fetched data from parent to avoid loading delay
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { activatePower, type ShopPlayerData, type PlayerPurchase, ApiError } from '@/lib/api';

interface PlayerWalletProps {
  gameCode: string;
  playerId: string;
  gameStatus: string;
  onPointsChange?: () => void;
  // Pre-fetched data from parent
  playerData: ShopPlayerData | null;
  isLoading: boolean;
}

export function PlayerWallet({ gameCode, playerId, gameStatus, onPointsChange, playerData, isLoading }: PlayerWalletProps) {
  const [usingPower, setUsingPower] = useState<string | null>(null);
  const [powerResult, setPowerResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleUsePower = async (purchase: PlayerPurchase) => {
    if (!purchase.id) return;
    
    setUsingPower(purchase.id);
    setPowerResult(null);
    
    try {
      const result = await activatePower(gameCode, purchase.id, playerId);
      setPowerResult({ message: result.result.message, type: 'success' });
      onPointsChange?.();
    } catch (err) {
      setPowerResult({ 
        message: err instanceof ApiError ? err.message : 'Erreur', 
        type: 'error' 
      });
    } finally {
      setUsingPower(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4 border border-purple-500/30">
        <CardContent className="py-4 text-center text-slate-400">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  if (!playerData) {
    return null; // Silent fail
  }

  const unusedPowers = playerData.unusedPowers || [];

  // Separate passive powers from active/targeted powers
  const PASSIVE_EFFECTS = ['immunity', 'double_vote', 'anonymous_vote'];
  const TARGETED_EFFECTS = ['wolf_vision', 'silence'];
  
  const passivePowers = unusedPowers.filter(p => PASSIVE_EFFECTS.includes(p.effect_type || ''));
  const activePowers = unusedPowers.filter(p => !PASSIVE_EFFECTS.includes(p.effect_type || ''));

  return (
    <Card className="mb-4 border border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-purple-400 text-sm">
          <span>💰 Mon Portefeuille</span>
          <span className="text-lg font-bold">{playerData.points} pts</span>
        </CardTitle>
      </CardHeader>
      
      {(passivePowers.length > 0 || activePowers.length > 0) && (
        <CardContent className="pt-2">
          {/* Passive powers - no button, auto-apply at council */}
          {passivePowers.length > 0 && (
            <>
              <p className="text-xs text-slate-400 mb-2">⚡ Pouvoirs passifs (auto au conseil) :</p>
              <div className="space-y-2 mb-3">
                {passivePowers.map((purchase) => (
                  <div 
                    key={purchase.id}
                    className="flex items-center justify-between bg-green-900/20 border border-green-500/20 rounded p-2"
                  >
                    <span className="text-sm text-green-400">
                      {purchase.item_icon || '⚡'} {purchase.item_name || 'Pouvoir'}
                    </span>
                    <span className="text-xs text-green-500/70">Auto</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Active/targeted powers - can use manually */}
          {activePowers.length > 0 && (
            <>
              <p className="text-xs text-slate-400 mb-2">🎯 Pouvoirs à activer :</p>
              <div className="space-y-2">
                {activePowers.map((purchase) => {
                  const isTargeted = TARGETED_EFFECTS.includes(purchase.effect_type || '');
                  return (
                    <div 
                      key={purchase.id}
                      className="flex items-center justify-between bg-slate-800/50 rounded p-2"
                    >
                      <span className="text-sm text-white">
                        {purchase.item_icon || '⚡'} {purchase.item_name || 'Pouvoir'}
                        {isTargeted && <span className="text-xs text-slate-400 ml-1">(cible requise)</span>}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUsePower(purchase)}
                        disabled={usingPower === purchase.id || isTargeted}
                        className="text-purple-400 hover:text-purple-300 text-xs"
                        title={isTargeted ? 'UI de sélection de cible à venir' : undefined}
                      >
                        {usingPower === purchase.id ? '...' : isTargeted ? '🎯' : 'Utiliser'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {powerResult && (
            <p className={`mt-2 text-xs ${
              powerResult.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {powerResult.message}
            </p>
          )}
        </CardContent>
      )}
      
      {unusedPowers.length === 0 && (
        <CardContent className="pt-2">
          <p className="text-xs text-slate-500">
            Aucun pouvoir actif. Visite le shop pour en acheter !
          </p>
        </CardContent>
      )}
    </Card>
  );
}
