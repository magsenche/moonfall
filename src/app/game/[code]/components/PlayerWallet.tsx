/**
 * PlayerWallet - Shows player's points and active powers
 * Uses same selection pattern as SeerPowerPanel for consistency
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { activatePower, type ShopPlayerData, type PlayerPurchase, ApiError } from '@/lib/api';
import type { PartialPlayer } from '../hooks';
import { cn } from '@/lib/utils';

interface PlayerWalletProps {
  gameCode: string;
  playerId: string;
  gameStatus: string;
  onPointsChange?: () => void;
  // Pre-fetched data from parent
  playerData: ShopPlayerData | null;
  isLoading: boolean;
  // Players list for targeting
  players: PartialPlayer[];
}

// Power result for display
interface PowerResult {
  message: string;
  type: 'success' | 'error';
  targetName?: string;
  isWolf?: boolean;
  effectType?: string;
}

export function PlayerWallet({ gameCode, playerId, gameStatus, onPointsChange, playerData, isLoading, players }: PlayerWalletProps) {
  const [usingPower, setUsingPower] = useState<string | null>(null);
  const [powerResult, setPowerResult] = useState<PowerResult | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activePower, setActivePower] = useState<PlayerPurchase | null>(null);
  const [visionHistory, setVisionHistory] = useState<Array<{ targetName: string; isWolf: boolean }>>([]);

  const handleUsePower = async (purchase: PlayerPurchase, targetId?: string) => {
    if (!purchase.id) return;
    
    setUsingPower(purchase.id);
    setPowerResult(null);
    
    try {
      const result = await activatePower(gameCode, purchase.id, playerId, targetId);
      
      // Store vision history for wolf_vision
      if (purchase.effect_type === 'wolf_vision' && result.result.target_name && result.result.is_wolf !== undefined) {
        setVisionHistory(prev => [...prev, {
          targetName: result.result.target_name!,
          isWolf: result.result.is_wolf!,
        }]);
      }
      
      setPowerResult({ 
        message: result.result.message, 
        type: 'success',
        targetName: result.result.target_name,
        isWolf: result.result.is_wolf,
        effectType: purchase.effect_type || undefined,
      });
      onPointsChange?.();
    } catch (err) {
      setPowerResult({ 
        message: err instanceof ApiError ? err.message : 'Erreur', 
        type: 'error' 
      });
    } finally {
      setUsingPower(null);
      setActivePower(null);
      setSelectedTarget(null);
    }
  };

  const handlePowerClick = (purchase: PlayerPurchase) => {
    const TARGETED_EFFECTS = ['wolf_vision', 'silence'];
    const isTargeted = TARGETED_EFFECTS.includes(purchase.effect_type || '');
    
    if (isTargeted) {
      setActivePower(purchase);
      setSelectedTarget(null);
      setPowerResult(null);
    } else {
      handleUsePower(purchase);
    }
  };

  const handleConfirmPower = () => {
    if (activePower && selectedTarget) {
      handleUsePower(activePower, selectedTarget);
    }
  };

  const handleCancelPower = () => {
    setActivePower(null);
    setSelectedTarget(null);
    setPowerResult(null);
  };

  if (isLoading) {
    return (
      <MotionCard variant="sticker" rotation={-0.5} className="mb-4 border-purple-500/30">
        <CardContent className="py-4 text-center text-slate-400">
          Chargement...
        </CardContent>
      </MotionCard>
    );
  }

  if (!playerData) {
    return null;
  }

  const unusedPowers = playerData.unusedPowers || [];
  const PASSIVE_EFFECTS = ['immunity', 'double_vote', 'anonymous_vote'];
  const TARGETED_EFFECTS = ['wolf_vision', 'silence'];
  
  const passivePowers = unusedPowers.filter(p => PASSIVE_EFFECTS.includes(p.effect_type || ''));
  const activePowers = unusedPowers.filter(p => !PASSIVE_EFFECTS.includes(p.effect_type || ''));
  
  // Filter targetable players (not self, alive only)
  const targets = players.filter(p => p.id !== playerId && p.is_alive);

  return (
    <>
      {/* Points display */}
      <MotionCard variant="sticker" rotation={-0.5} className="mb-4 border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-purple-400 text-sm">
            <span>💰 Mon Portefeuille</span>
            <span className="text-lg font-bold">{playerData.points} pts</span>
          </CardTitle>
        </CardHeader>
      </MotionCard>

      {/* Passive powers (auto-apply) */}
      {passivePowers.length > 0 && (
        <MotionCard variant="sticker" rotation={0.5} className="mb-4 border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-sm">
              ⚡ Pouvoirs passifs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-xs text-slate-400 mb-2">Ces pouvoirs s'appliquent automatiquement au conseil :</p>
            <div className="space-y-2">
              {passivePowers.map((purchase) => (
                <div 
                  key={purchase.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    "bg-green-900/20 border border-green-500/20"
                  )}
                >
                  <span className="text-sm text-green-400">
                    {purchase.item_icon || '⚡'} {purchase.item_name || 'Pouvoir'}
                  </span>
                  <span className="text-xs text-green-500/70">Auto</span>
                </div>
              ))}
            </div>
          </CardContent>
        </MotionCard>
      )}

      {/* Active/targeted powers list */}
      {activePowers.length > 0 && !activePower && (
        <MotionCard variant="sticker" rotation={-0.5} className="mb-4 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm">
              🎯 Pouvoirs à activer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-xs text-slate-400 mb-3">Clique sur un pouvoir pour l'utiliser :</p>
            <div className="space-y-2">
              {activePowers.map((purchase) => {
                const isTargeted = TARGETED_EFFECTS.includes(purchase.effect_type || '');
                return (
                  <MotionButton
                    key={purchase.id}
                    variant="sticker"
                    onClick={() => handlePowerClick(purchase)}
                    disabled={usingPower === purchase.id}
                    className={cn(
                      "w-full justify-start gap-2 text-left",
                      "bg-slate-800/50 border-purple-500/30 hover:border-purple-500"
                    )}
                  >
                    <span className="text-lg">{purchase.item_icon || '⚡'}</span>
                    <span className="flex-1 font-medium">{purchase.item_name || 'Pouvoir'}</span>
                    {isTargeted && <span className="text-xs text-slate-400">(cible requise)</span>}
                  </MotionButton>
                );
              })}
            </div>
          </CardContent>
        </MotionCard>
      )}

      {/* Target selection panel (like seer) */}
      {activePower && (
        <MotionCard 
          variant="sticker" 
          rotation={1}
          className="mb-4 border-purple-500/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <span className="text-2xl">{activePower.item_icon || '⚡'}</span>
              {activePower.item_name || 'Pouvoir'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {powerResult && powerResult.type === 'success' && powerResult.effectType === 'wolf_vision' ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="text-center py-4"
                >
                  <motion.p 
                    className="text-4xl mb-3"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  >
                    👁️
                  </motion.p>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      'inline-block px-6 py-4 rounded-2xl',
                      'border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
                      powerResult.isWolf
                        ? 'bg-red-900/50 border-red-500' 
                        : 'bg-blue-900/50 border-blue-500'
                    )}
                  >
                    <p className="text-white text-xl font-black mb-2">
                      {powerResult.targetName}
                    </p>
                    <p className={cn(
                      "text-lg font-bold",
                      powerResult.isWolf ? "text-red-400" : "text-blue-400"
                    )}>
                      {powerResult.isWolf ? '🐺 Loup-Garou' : '👤 Villageois'}
                    </p>
                    <span className={cn(
                      "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
                      "border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                      powerResult.isWolf
                        ? 'bg-red-600 border-red-400 text-white'
                        : 'bg-blue-600 border-blue-400 text-white'
                    )}>
                      Équipe {powerResult.isWolf ? 'Loups' : 'Village'}
                    </span>
                  </motion.div>
                  <MotionButton
                    variant="sticker"
                    onClick={handleCancelPower}
                    className="mt-4 bg-slate-700 border-slate-500 hover:bg-slate-600"
                  >
                    Fermer
                  </MotionButton>
                </motion.div>
              ) : powerResult && powerResult.type === 'success' ? (
                <motion.div
                  key="other-result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-300 font-medium">{powerResult.message}</p>
                  <MotionButton
                    variant="sticker"
                    onClick={handleCancelPower}
                    className="mt-4 bg-slate-700 border-slate-500 hover:bg-slate-600"
                  >
                    Fermer
                  </MotionButton>
                </motion.div>
              ) : powerResult && powerResult.type === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <p className="text-2xl mb-2">❌</p>
                  <p className="text-red-400 font-medium">{powerResult.message}</p>
                  <MotionButton
                    variant="sticker"
                    onClick={handleCancelPower}
                    className="mt-4 bg-slate-700 border-slate-500 hover:bg-slate-600"
                  >
                    Fermer
                  </MotionButton>
                </motion.div>
              ) : (
                <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-slate-400 text-sm mb-4 text-center">
                    {activePower.effect_type === 'wolf_vision' 
                      ? 'Choisis un joueur pour découvrir son rôle'
                      : 'Choisis un joueur pour utiliser ce pouvoir'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {targets.map((player, i) => (
                      <motion.button
                        key={player.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedTarget(player.id)}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          selectedTarget === player.id
                            ? "bg-purple-500/30 border-2 border-purple-500 shadow-[3px_3px_0px_0px_rgba(139,92,246,0.5)]"
                            : "bg-zinc-800/50 hover:bg-purple-900/20 border-2 border-transparent"
                        )}
                      >
                        <div className="relative">
                          <PlayerAvatar
                            playerId={player.id}
                            pseudo={player.pseudo}
                            size="sm"
                          />
                          {selectedTarget === player.id && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={cn(
                                'absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full',
                                'bg-purple-600 border border-white text-white font-bold',
                                'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                              )}
                            >
                              {activePower.item_icon || '🎯'}
                            </motion.span>
                          )}
                        </div>
                        <span className="font-medium text-white text-sm truncate w-full text-center">
                          {player.pseudo}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <MotionButton
                      variant="sticker"
                      onClick={handleCancelPower}
                      className="flex-1 bg-slate-700 border-slate-500 hover:bg-slate-600"
                    >
                      Annuler
                    </MotionButton>
                    <MotionButton
                      variant="sticker"
                      className="flex-1 bg-purple-600 border-purple-400 hover:bg-purple-500"
                      onClick={handleConfirmPower}
                      disabled={!selectedTarget || !!usingPower}
                    >
                      {usingPower ? '⏳ ...' : `${activePower.item_icon || '⚡'} Utiliser`}
                    </MotionButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </MotionCard>
      )}

      {/* Vision history (wolf_vision) */}
      {visionHistory.length > 0 && !activePower && (
        <MotionCard
          variant="sticker"
          rotation={-0.5}
          className="mb-4 border-purple-500/30"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm">
              👁️ Historique des visions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {visionHistory.map((vision, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    vision.isWolf
                      ? "bg-red-900/20 border border-red-500/20"
                      : "bg-blue-900/20 border border-blue-500/20"
                  )}
                >
                  <span className={vision.isWolf ? "text-red-400" : "text-blue-400"}>
                    {vision.targetName}
                  </span>
                  <span className="text-xs">
                    {vision.isWolf ? '🐺 Loup' : '👤 Village'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </MotionCard>
      )}

      {/* No powers message */}
      {unusedPowers.length === 0 && (
        <MotionCard variant="sticker" rotation={0.5} className="mb-4 border-slate-700">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500 text-center">
              Aucun pouvoir actif. Visite le shop pour en acheter !
            </p>
          </CardContent>
        </MotionCard>
      )}
    </>
  );
}
