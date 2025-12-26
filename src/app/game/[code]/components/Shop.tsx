/**
 * Shop - Purchase powers with mission points
 * Now receives pre-fetched data from parent to avoid loading delay
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { purchaseItem, type ShopItem, type ShopPlayerData, ApiError } from '@/lib/api';

interface ShopProps {
  gameCode: string;
  playerId: string;
  gameStatus: string;
  onPurchase?: () => void;
  // Pre-fetched data from parent
  items: ShopItem[];
  playerData: ShopPlayerData | null;
  isLoading: boolean;
}

export function Shop({ gameCode, playerId, gameStatus, onPurchase, items, playerData, isLoading }: ShopProps) {
  const [purchasingItem, setPurchasingItem] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handlePurchase = async (itemId: string) => {
    setPurchasingItem(itemId);
    setMessage(null);
    
    try {
      const result = await purchaseItem(gameCode, playerId, itemId);
      setMessage({ 
        text: `✅ ${result.purchase.item.icon} ${result.purchase.item.name} acheté !`, 
        type: 'success' 
      });
      onPurchase?.();
    } catch (err) {
      setMessage({ 
        text: err instanceof ApiError ? err.message : 'Erreur', 
        type: 'error' 
      });
    } finally {
      setPurchasingItem(null);
    }
  };

  if (isLoading) {
    return null;
  }

  const points = playerData?.points ?? 0;

  return (
    <Card className="border border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-emerald-400 text-sm">
          <span className="flex items-center gap-2">
            🛒 Shop
          </span>
          <span className="text-xs text-slate-400">
            {items.filter(i => i.can_buy).length} disponibles
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-2">
        {message && (
          <p className={`mb-3 text-sm ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message.text}
          </p>
        )}
        
        <p className="text-sm text-slate-300 mb-3">
          💰 Tu as <span className="font-bold text-emerald-400">{points} points</span>
        </p>
        
        <div className="space-y-2">
          {items.map((item) => {
            const canAfford = points >= item.cost;
            const canBuy = item.can_buy ?? (canAfford);
            const maxReached = item.max_per_player !== null && 
              (item.purchased_count_player ?? 0) >= item.max_per_player;
            
            return (
              <div 
                key={item.id}
                className={`p-3 rounded-lg border transition-colors ${
                  canBuy 
                    ? 'bg-slate-800/50 border-emerald-500/30 hover:border-emerald-500/50' 
                    : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon || '⚡'}</span>
                      <span className="font-medium text-white">{item.name}</span>
                      <span className={`text-sm font-bold ${
                        canAfford ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {item.cost} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                    {maxReached && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Max atteint ({item.max_per_player}x)
                      </p>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(item.id)}
                    disabled={!canBuy || purchasingItem === item.id}
                    className={`min-w-[80px] ${
                      canBuy 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {purchasingItem === item.id ? '...' : 'Acheter'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {items.length === 0 && (
          <p className="text-center text-slate-500 py-4">
            Aucun item disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
