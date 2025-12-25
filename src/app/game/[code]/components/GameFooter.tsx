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

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Role, GameWithPlayers, Mission, PartialPlayer } from '../hooks';

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
  
  const players = game.players.filter(p => !p.is_mj);
  const alivePlayers = players.filter(p => p.is_alive !== false);
  const isAlive = currentPlayer?.is_alive !== false;
  const showWalletAndShop = currentPlayerId && (!isMJ || isAutoMode) && isAlive;

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
            {showWallet ? '▲ Fermer' : '💰 Points & Shop'}
          </Button>
          
          {showWallet && (
            <div className="space-y-3">
              <PlayerWallet
                gameCode={game.code}
                playerId={currentPlayerId}
                gameStatus={gameStatus}
                onPointsChange={onShopRefresh}
                refreshKey={shopRefreshKey}
              />
              <Shop
                gameCode={game.code}
                playerId={currentPlayerId}
                gameStatus={gameStatus}
                onPurchase={onShopRefresh}
                refreshKey={shopRefreshKey}
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
