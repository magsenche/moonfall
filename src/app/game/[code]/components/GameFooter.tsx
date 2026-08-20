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
import { Coins, Zap, ShoppingBag, Users } from 'lucide-react';
import { useGame } from '../context';

import { CouncilRecapCard } from './CouncilRecapCard';
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
    shopEnabled,
  } = useGame();

  const [showWallet, setShowWallet] = useState(false);

  // Liste des joueurs repliable : dépliée le jour (c'est l'info du moment),
  // repliée la nuit et au conseil où la grille de cibles du panneau d'action
  // affiche déjà les mêmes joueurs. Pas de setState dans un effet : l'override
  // du joueur n'est valable que pour la phase où il a tapé.
  const [playersOverride, setPlayersOverride] = useState<{ phase: string; open: boolean } | null>(
    null
  );
  const playersOpenByDefault = gameStatus === 'jour';
  const showPlayers =
    playersOverride?.phase === gameStatus ? playersOverride.open : playersOpenByDefault;
  const alivePlayersCount = game.players.filter(
    (p) => p.is_alive !== false && (isAutoMode || !p.is_mj)
  ).length;

  // Prefetch shop data for quick access
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [playerShopData, setPlayerShopData] = useState<ShopPlayerData | null>(null);
  const [isShopLoading, setIsShopLoading] = useState(true);

  const showWalletAndShop = currentPlayerId && (!isMJ || isAutoMode) && isAlive && shopEnabled;

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

      {/* Dernier conseil : qui a voté contre qui (repliée par défaut) */}
      {gameStatus !== 'terminee' && (
        <CouncilRecapCard gameCode={game.code} gameStatus={gameStatus} />
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
              showWallet ? 'bg-night-700' : 'bg-night-800'
            )}
          >
            {showWallet ? (
              '▲ Fermer'
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-moon-500" />
                  <span className="font-bold">{isShopLoading ? '...' : `${points} pts`}</span>
                </span>
                {!isShopLoading && unusedPowersCount > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'bg-village-400/30 text-village-300 border border-village-400/50'
                  )}>
                    <Zap className="w-3 h-3 inline -mt-0.5" /> {unusedPowersCount}
                  </span>
                )}
                {!isShopLoading && availableItemsCount > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  )}>
                    <ShoppingBag className="w-3 h-3 inline -mt-0.5" /> {availableItemsCount}
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

      {/* Players List - repliable, même pattern que le wallet ci-dessus */}
      <div>
        <MotionButton
          variant="sticker"
          size="sm"
          onClick={() => setPlayersOverride({ phase: gameStatus, open: !showPlayers })}
          className={cn('w-full mb-2', showPlayers ? 'bg-night-700' : 'bg-night-800')}
        >
          <span className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-village-300" />
            <span className="font-bold">Joueurs</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold',
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              )}
            >
              {alivePlayersCount} en vie
            </span>
            <span className="text-moon-100/50">{showPlayers ? '▲' : '▼'}</span>
          </span>
        </MotionButton>

        <AnimatePresence>
          {showPlayers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <PlayersList
                players={game.players}
                roles={roles}
                currentPlayerId={currentPlayerId}
                isMJ={isMJ && !isAutoMode}
                isWolf={isWolf}
                wolves={wolves}
                isAutoMode={isAutoMode}
                viewerIsDead={!isAlive}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MJ Overview Panel - Hidden in Auto-Garou mode */}
      {isMJ && !isAutoMode && (
        <MJOverview players={players} roles={roles} alivePlayers={alivePlayers} />
      )}
    </div>
  );
}
