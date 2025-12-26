/**
 * GameFooter - Common footer section
 *
 * Uses GameContext - no props needed.
 * Contains: MJ Controls, Missions, Players List, Wallet & Shop.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { getShop, type ShopItem, type ShopPlayerData } from '@/lib/api';
import { useGame } from '../context';

import { MJControls } from './MJControls';
import { MJOverview } from './MJOverview';
import { MissionsSection } from './MissionsSection';
import { PlayersList } from './PlayersList';
import { PlayerWallet } from './PlayerWallet';
import { Shop } from './Shop';

export function GameFooter() {
  const {
    game,
    roles,
    currentPlayerId,
    currentPlayer,
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
    missions,
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

      {/* Wallet & Shop Toggle */}
      {showWalletAndShop && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWallet(!showWallet)}
            className="w-full mb-2"
          >
            {showWallet ? (
              '▲ Fermer'
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span>💰 {isShopLoading ? '...' : `${points} pts`}</span>
                {!isShopLoading && unusedPowersCount > 0 && (
                  <span className="text-purple-400">⚡ {unusedPowersCount}</span>
                )}
                {!isShopLoading && availableItemsCount > 0 && (
                  <span className="text-emerald-400">🛒 {availableItemsCount}</span>
                )}
              </span>
            )}
          </Button>

          {showWallet && (
            <div className="space-y-3">
              <PlayerWallet
                gameCode={game.code}
                playerId={currentPlayerId}
                gameStatus={gameStatus}
                onPointsChange={handleShopRefresh}
                playerData={playerShopData}
                isLoading={isShopLoading}
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
            </div>
          )}
        </div>
      )}

      {/* Missions Section - Available in auto mode with restrictions */}
      {gameStatus !== 'terminee' && (
        <MissionsSection
          missions={missions.missions}
          players={players}
          currentPlayerId={currentPlayerId}
          isMJ={isMJ}
          isAutoMode={isAutoMode}
          showMissionForm={missions.showMissionForm}
          gameCode={game.code}
          onShowMissionForm={missions.setShowMissionForm}
          onMissionCreated={ui.refreshShop}
          onMissionUpdate={ui.refreshShop}
        />
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
