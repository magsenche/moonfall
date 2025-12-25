/**
 * PlayerWallet - Shows player's points and active powers
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { getShop, activatePower, type ShopPlayerData, type PlayerPurchase, ApiError } from '@/lib/api';

interface PlayerWalletProps {
  gameCode: string;
  playerId: string;
  gameStatus: string;
  onPointsChange?: () => void;
  refreshKey?: number;
}

export function PlayerWallet({ gameCode, playerId, gameStatus, onPointsChange, refreshKey }: PlayerWalletProps) {
  const [playerData, setPlayerData] = useState<ShopPlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingPower, setUsingPower] = useState<string | null>(null);
  const [powerResult, setPowerResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchWallet = useCallback(async () => {
    try {
      const response = await getShop(gameCode, playerId);
      setPlayerData(response.player);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [gameCode, playerId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet, gameStatus, refreshKey]);

  const handleUsePower = async (purchase: PlayerPurchase) => {
    if (!purchase.id) return;
    
    setUsingPower(purchase.id);
    setPowerResult(null);
    
    try {
      const result = await activatePower(gameCode, purchase.id, playerId);
      setPowerResult({ message: result.result.message, type: 'success' });
      fetchWallet(); // Refresh
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

  if (error || !playerData) {
    return null; // Silent fail
  }

  const unusedPowers = playerData.unusedPowers || [];

  return (
    <Card className="mb-4 border border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-purple-400 text-sm">
          <span>💰 Mon Portefeuille</span>
          <span className="text-lg font-bold">{playerData.points} pts</span>
        </CardTitle>
      </CardHeader>
      
      {unusedPowers.length > 0 && (
        <CardContent className="pt-2">
          <p className="text-xs text-slate-400 mb-2">Pouvoirs disponibles :</p>
          <div className="space-y-2">
            {unusedPowers.map((purchase) => (
              <div 
                key={purchase.id}
                className="flex items-center justify-between bg-slate-800/50 rounded p-2"
              >
                <span className="text-sm text-white">
                  {purchase.item_icon || '⚡'} {purchase.item_name || 'Pouvoir'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUsePower(purchase)}
                  disabled={usingPower === purchase.id}
                  className="text-purple-400 hover:text-purple-300 text-xs"
                >
                  {usingPower === purchase.id ? '...' : 'Utiliser'}
                </Button>
              </div>
            ))}
          </div>
          
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
