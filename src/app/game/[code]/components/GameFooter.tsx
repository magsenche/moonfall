/**
 * GameFooter - Y2K styled common footer section
 *
 * Uses GameContext - no props needed.
 * Contains: MJ Controls, Missions, Players List, Wallet & Shop.
 * Action bar positioned in thumb zone (bottom 30% of screen).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton } from '@/components/ui';
import { getShop, type ShopItem, type ShopPlayerData } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

import { MJControls } from './MJControls';
import { MJOverview } from './MJOverview';
import { PlayersList } from './PlayersList';
import { PlayerWallet } from './PlayerWallet';
import { Shop } from './Shop';

export function GameFooter() {
  const {
    game,
    roles,
    currentPlayerId,
    isMJ,
    isAutoMode,
    isWolf,
    wolves,
    players,
    alivePlayers,
    isAlive,
    gameStatus,
    nightActions,
    voting,
    actions,
    ui,
  } = useGame();

  const [showWallet, setShowWallet] = useState(false);

  // Prefetch shop data for quick access
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [playerShopData, setPlayerShopData] = useState<ShopPlayerData | null>(null);
  const [isShopLoading, setIsShopLoading] = useState(true);

  const showWalletAndShop = currentPlayerId && (!isMJ || isAutoMode) && isAlive;

  // Prefetch shop data when component mounts (not when expanded)
  const fetchShopData = useCallback(async () => {
    if (!currentPlayerId || !showWalletAndShop) return;

    setIsShopLoading(true);
    try {
      const response = await getShop(game.code, currentPlayerId);
      setShopItems(response.items);
      setPlayerShopData(response.player);
    } catch (err) {
      console.error('Shop prefetch error:', err);
    } finally {
      setIsShopLoading(false);
    }
  }, [game.code, currentPlayerId, showWalletAndShop]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData, gameStatus, ui.shopRefreshKey]);

  // Handle refresh from child components
  const handleShopRefresh = useCallback(() => {
    fetchShopData();
    ui.refreshShop();
  }, [fetchShopData, ui]);

  // Summary for collapsed state
  const points = playerShopData?.points ?? 0;
  const unusedPowersCount = playerShopData?.unusedPowers?.length ?? 0;
  const availableItemsCount = shopItems.filter((i) => i.can_buy).length;

  const isChangingPhase = nightActions.isChangingPhase || voting.isChangingPhase;

  return (
    <div className="space-y-4 mt-6">
      {/* MJ Controls - Also available in Auto-Garou mode to skip phases */}
      {isMJ && gameStatus !== 'terminee' && (
        <MJControls
          gameStatus={gameStatus}
          wolfVoteCount={nightActions.wolfVoteCount}
          nightVoteResolveError={nightActions.nightVoteResolveError}
          showForceConfirm={nightActions.showForceConfirm}
          isChangingPhase={isChangingPhase}
          onChangePhase={actions.changePhase}
          onResolveVote={voting.resolveVote}
          onResolveNightVote={nightActions.resolveNightVote}
          onCancelForce={() => nightActions.setShowForceConfirm(false)}
          isAutoMode={isAutoMode}
        />
      )}

      {/* Wallet & Shop Toggle - Y2K Sticker Style */}
      {showWalletAndShop && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MotionButton
            variant="sticker"
            size="sm"
            onClick={() => setShowWallet(!showWallet)}
            className={cn(
              'w-full mb-2',
              showWallet ? 'bg-zinc-700' : 'bg-zinc-800'
            )}
          >
            {showWallet ? (
              '▲ Fermer'
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span className="flex items-center gap-1">
                  <span>💰</span>
                  <span className="font-bold">{isShopLoading ? '...' : `${points} pts`}</span>
                </span>
                {!isShopLoading && unusedPowersCount > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  )}>
                    ⚡ {unusedPowersCount}
                  </span>
                )}
                {!isShopLoading && availableItemsCount > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  )}>
                    🛒 {availableItemsCount}
                  </span>
                )}
              </span>
            )}
          </MotionButton>

          <AnimatePresence>
            {showWallet && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <PlayerWallet
                  gameCode={game.code}
                  playerId={currentPlayerId}
                  gameStatus={gameStatus}
                  onPointsChange={handleShopRefresh}
                  playerData={playerShopData}
                  isLoading={isShopLoading}
                  players={alivePlayers}
                />
                <Shop
                  gameCode={game.code}
                  playerId={currentPlayerId}
                  gameStatus={gameStatus}
                  onPurchase={handleShopRefresh}
                  items={shopItems}
                  playerData={playerShopData}
                  isLoading={isShopLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Players List */}
      <PlayersList
        players={game.players}
        roles={roles}
        currentPlayerId={currentPlayerId}
        isMJ={isMJ && !isAutoMode}
        isWolf={isWolf}
        wolves={wolves}
        isAutoMode={isAutoMode}
      />

      {/* MJ Overview Panel - Hidden in Auto-Garou mode */}
      {isMJ && !isAutoMode && (
        <MJOverview players={players} roles={roles} alivePlayers={alivePlayers} />
      )}
    </div>
  );
}
