/**
 * GameFooter - Common footer section
 * 
 * Contains:
 * - MJ Controls (if MJ)
 * - Missions Section (collapsible)
 * - Players List
 * - MJ Overview (if MJ, non-auto mode)
 * - Wallet & Shop (collapsible)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import type { Role, GameWithPlayers, Mission, PartialPlayer } from '../hooks';
import { getShop, type ShopItem, type ShopPlayerData } from '@/lib/api';

import { MJControls } from './MJControls';
import { MJOverview } from './MJOverview';
import { MissionsSection } from './MissionsSection';
import { PlayersList } from './PlayersList';
import { PlayerWallet } from './PlayerWallet';
import { Shop } from './Shop';

interface GameFooterProps {
  // Game data
  game: GameWithPlayers;
  roles: Role[];
  
  // Player info
  currentPlayerId: string | null;
  currentPlayer: PartialPlayer | null | undefined;
  isMJ: boolean;
  isAutoMode: boolean;
  isWolf: boolean;
  wolves: PartialPlayer[];
  
  // MJ Controls
  gameStatus: string;
  wolfVoteCount: { voted: number; total: number };
  nightVoteResolveError: string | null;
  showForceConfirm: boolean;
  isChangingPhase: boolean;
  onChangePhase: (phase: string) => void;
  onResolveVote: () => void;
  onResolveNightVote: () => void;
  onCancelForce: () => void;
  
  // Missions
  missions: Mission[];
  showMissionForm: boolean;
  onShowMissionForm: (show: boolean) => void;
  onMissionCreated: () => void;
  onMissionUpdate: () => void;
  
  // Shop
  shopRefreshKey: number;
  onShopRefresh: () => void;
}

export function GameFooter({
  game,
  roles,
  currentPlayerId,
  currentPlayer,
  isMJ,
  isAutoMode,
  isWolf,
  wolves,
  gameStatus,
  wolfVoteCount,
  nightVoteResolveError,
  showForceConfirm,
  isChangingPhase,
  onChangePhase,
  onResolveVote,
  onResolveNightVote,
  onCancelForce,
  missions,
  showMissionForm,
  onShowMissionForm,
  onMissionCreated,
  onMissionUpdate,
  shopRefreshKey,
  onShopRefresh,
}: GameFooterProps) {
  const [showWallet, setShowWallet] = useState(false);
  
  // Prefetch shop data for quick access
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [playerShopData, setPlayerShopData] = useState<ShopPlayerData | null>(null);
  const [isShopLoading, setIsShopLoading] = useState(true);
  
  const players = game.players.filter(p => !p.is_mj);
  const alivePlayers = players.filter(p => p.is_alive !== false);
  const isAlive = currentPlayer?.is_alive !== false;
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
  }, [fetchShopData, gameStatus, shopRefreshKey]);
  
  // Handle refresh from child components
  const handleShopRefresh = useCallback(() => {
    fetchShopData();
    onShopRefresh();
  }, [fetchShopData, onShopRefresh]);
  
  // Summary for collapsed state
  const points = playerShopData?.points ?? 0;
  const unusedPowersCount = playerShopData?.unusedPowers?.length ?? 0;
  const availableItemsCount = shopItems.filter(i => i.can_buy).length;

  return (
    <div className="space-y-4 mt-6">
      {/* MJ Controls - Also available in Auto-Garou mode to skip phases */}
      {isMJ && gameStatus !== 'terminee' && (
        <MJControls
          gameStatus={gameStatus}
          wolfVoteCount={wolfVoteCount}
          nightVoteResolveError={nightVoteResolveError}
          showForceConfirm={showForceConfirm}
          isChangingPhase={isChangingPhase}
          onChangePhase={onChangePhase}
          onResolveVote={onResolveVote}
          onResolveNightVote={onResolveNightVote}
          onCancelForce={onCancelForce}
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
          missions={missions}
          players={players}
          currentPlayerId={currentPlayerId}
          isMJ={isMJ}
          isAutoMode={isAutoMode}
          showMissionForm={showMissionForm}
          gameCode={game.code}
          onShowMissionForm={onShowMissionForm}
          onMissionCreated={onMissionCreated}
          onMissionUpdate={onMissionUpdate}
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
        <MJOverview
          players={players}
          roles={roles}
          alivePlayers={alivePlayers}
        />
      )}
    </div>
  );
}
