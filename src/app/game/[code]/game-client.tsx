/**
 * GameClient - Main game orchestrator (refactored v2)
 * 
 * Clean separation:
 * - GameHeader: consistent header with phase/timer
 * - NightPhaseLayout / DayPhaseLayout / CouncilPhaseLayout: phase-specific content
 * - GameFooter: MJ controls, missions, players list, wallet/shop
 * 
 * This file is now a thin orchestrator (~200 lines).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameOver, TipToast, useGameTips, RulesButton } from '@/components/game';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications';
import { startGame as apiStartGame, changePhase as apiChangePhase, addBots, removeBots, ApiError } from '@/lib/api';

// Hooks
import {
  usePlayerSession,
  useGameRealtime,
  useTimer,
  useVoting,
  useNightActions,
  useWolfChat,
  useMissions,
  useGameSettings,
  useAutoGarou,
  type GameWithPlayers,
  type Role,
} from './hooks';

// Components
import {
  SessionRecovery,
  LobbyView,
  GameHeader,
  NightPhaseLayout,
  DayPhaseLayout,
  CouncilPhaseLayout,
  GameFooter,
  HunterDeathModal,
} from './components';

interface GameClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

export function GameClient({ initialGame, roles }: GameClientProps) {
  const router = useRouter();
  const [game, setGame] = useState<GameWithPlayers>(initialGame);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<'village' | 'loups' | null>(null);
  const [shopRefreshKey, setShopRefreshKey] = useState(0);
  const [showHunterModal, setShowHunterModal] = useState(false);
  const [hunterModalProcessed, setHunterModalProcessed] = useState(false);
  
  // Notifications
  const { permission, isSupported, registerServiceWorker } = useNotifications();
  
  // Register service worker on mount
  useEffect(() => {
    if (isSupported && permission === 'granted') {
      registerServiceWorker();
    }
  }, [isSupported, permission, registerServiceWorker]);

  // Player session hook
  const {
    currentPlayerId,
    showRecovery,
    recoveryPseudo,
    recoveryError,
    isRecovering,
    setRecoveryPseudo,
    recoverSession,
  } = usePlayerSession({ game });

  // Realtime hook
  useGameRealtime({
    game,
    onGameUpdate: setGame,
  });

  // Timer hook
  const { timeRemaining, isExpired } = useTimer({
    phaseEndsAt: game.phase_ends_at,
  });

  // Derived state
  const mj = game.players.find(p => p.is_mj);
  const players = game.players.filter(p => !p.is_mj);
  const alivePlayers = players.filter(p => p.is_alive !== false);
  const isMJ = currentPlayerId === mj?.id;
  
  // Auto mode from settings
  const isAutoMode = (game.settings as { autoMode?: boolean })?.autoMode ?? false;

  const currentPlayer = currentPlayerId
    ? game.players.find(p => p.id === currentPlayerId)
    : null;
  const currentRole = currentPlayer?.role_id
    ? roles.find(r => r.id === currentPlayer.role_id)
    : null;
  const roleConfig = currentRole ? getRoleConfig(currentRole.name) : null;
  
  const isWolf = currentRole?.team === 'loups';
  const isSeer = currentRole?.name === 'voyante';
  const isLittleGirl = currentRole?.name === 'petite_fille';
  const isHunter = currentRole?.name === 'chasseur';
  const isWitch = currentRole?.name === 'sorciere';
  const wolves = isWolf
    ? game.players.filter(p => {
        const pRole = roles.find(r => r.id === p.role_id);
        return pRole?.team === 'loups';
      })
    : [];

  // Tips hook
  const { currentTipId, dismissCurrentTip } = useGameTips(
    game.status || 'lobby',
    currentRole?.name,
    isWolf,
    isSeer,
    isLittleGirl,
    isWitch
  );

  // Voting hook
  const voting = useVoting({
    gameCode: game.code,
    currentPlayerId,
    gameStatus: game.status || 'lobby',
  });

  // Night actions hook
  const nightActions = useNightActions({
    gameCode: game.code,
    currentPlayerId,
    gameStatus: game.status || 'lobby',
    isMJ,
  });

  // Wolf chat hook
  const wolfChat = useWolfChat({
    gameId: game.id,
    gameCode: game.code,
    gameStatus: game.status || 'lobby',
    currentPlayerId,
    isWolf,
  });

  // Missions hook
  const missions = useMissions({
    gameId: game.id,
    gameCode: game.code,
    gameStatus: game.status || 'lobby',
    currentPlayerId,
  });

  // Game settings hook
  const settings = useGameSettings({
    gameCode: game.code,
    currentPlayerId,
    isMJ,
    gameStatus: game.status || 'lobby',
  });

  // Auto-Garou hook
  useAutoGarou({
    gameCode: game.code,
    gameStatus: (game.status || 'lobby') as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee',
    isAutoMode,
    isExpired,
    currentPlayerId,
  });

  // Callbacks
  const handleMissionUpdate = useCallback(() => {
    missions.fetchMissions();
    setShopRefreshKey(k => k + 1);
  }, [missions]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [game.code]);

  const startGame = useCallback(async () => {
    setStartError(null);
    setIsStarting(true);
    try {
      await apiStartGame(game.code);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsStarting(false);
    }
  }, [game.code]);

  const changePhase = useCallback(async (phase: string) => {
    try {
      await apiChangePhase(game.code, phase);
    } catch (err) {
      console.error('Phase change error:', err instanceof ApiError ? err.message : err);
    }
  }, [game.code]);

  const addBotsToGame = useCallback(async () => {
    if (!currentPlayerId) return;
    setIsAddingBots(true);
    try {
      await addBots(game.code, currentPlayerId, 5);
    } catch (err) {
      console.error('Add bots error:', err instanceof ApiError ? err.message : err);
    } finally {
      setIsAddingBots(false);
    }
  }, [game.code, currentPlayerId]);

  const removeBotsFromGame = useCallback(async () => {
    if (!currentPlayerId) return;
    setIsAddingBots(true);
    try {
      await removeBots(game.code, currentPlayerId);
    } catch (err) {
      console.error('Remove bots error:', err instanceof ApiError ? err.message : err);
    } finally {
      setIsAddingBots(false);
    }
  }, [game.code, currentPlayerId]);

  // Hunter death detection
  useEffect(() => {
    if (
      isHunter &&
      currentPlayer?.is_alive === false &&
      game.status !== 'terminee' &&
      !hunterModalProcessed
    ) {
      setShowHunterModal(true);
    }
  }, [isHunter, currentPlayer?.is_alive, game.status, hunterModalProcessed]);

  const handleHunterShotComplete = useCallback((
    targetName: string,
    targetRole: string | undefined,
    gameOver: boolean,
    winner?: string
  ) => {
    setShowHunterModal(false);
    setHunterModalProcessed(true);
    if (gameOver && winner) {
      setGameWinner(winner as 'village' | 'loups');
    }
  }, []);

  // Fetch game winner when game ends
  useEffect(() => {
    if (game.status !== 'terminee') return;
    const fetchWinner = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('game_events')
        .select('data')
        .eq('game_id', game.id)
        .eq('event_type', 'game_ended')
        .single();

      if (data?.data && typeof data.data === 'object' && 'winner' in data.data) {
        setGameWinner(data.data.winner as 'village' | 'loups');
      } else {
        const aliveWolves = game.players.filter(p => {
          const r = roles.find(role => role.id === p.role_id);
          return r?.team === 'loups' && p.is_alive !== false;
        }).length;
        setGameWinner(aliveWolves === 0 ? 'village' : 'loups');
      }
    };
    fetchWinner();
  }, [game.status, game.id, game.players, roles]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Session Recovery
  // ─────────────────────────────────────────────────────────────────────────────
  if (showRecovery && !currentPlayerId) {
    return (
      <SessionRecovery
        players={game.players}
        recoveryPseudo={recoveryPseudo}
        recoveryError={recoveryError}
        isRecovering={isRecovering}
        onPseudoChange={setRecoveryPseudo}
        onRecover={recoverSession}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Lobby
  // ─────────────────────────────────────────────────────────────────────────────
  if (game.status === 'lobby') {
    return (
      <LobbyView
        game={game}
        roles={roles}
        currentPlayerId={currentPlayerId}
        isMJ={isMJ}
        gameSettings={settings.gameSettings}
        showSettings={settings.showSettings}
        isSavingSettings={settings.isSavingSettings}
        isStarting={isStarting}
        startError={startError}
        onCopyCode={copyCode}
        copied={copied}
        onShowSettings={settings.setShowSettings}
        onSettingsChange={settings.setGameSettings}
        onSaveSettings={settings.saveSettings}
        onStartGame={startGame}
        onAddBots={addBotsToGame}
        onRemoveBots={removeBotsFromGame}
        isAddingBots={isAddingBots}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Game Over
  // ─────────────────────────────────────────────────────────────────────────────
  if (game.status === 'terminee' && gameWinner) {
    const playersForGameOver = game.players
      .filter(p => !p.is_mj)
      .map(p => {
        const role = roles.find(r => r.id === p.role_id);
        const roleConf = role ? getRoleConfig(role.name) : null;
        return {
          pseudo: p.pseudo,
          roleName: roleConf?.displayName || roleConf?.name || role?.name || 'Inconnu',
          team: role?.team || 'village',
          isAlive: p.is_alive !== false,
        };
      });

    return (
      <GameOver
        winner={gameWinner}
        gameName={game.name}
        players={playersForGameOver}
        onPlayAgain={() => router.push('/')}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Game in Progress
  // ─────────────────────────────────────────────────────────────────────────────
  const showTimer = game.status === 'jour' || game.status === 'conseil' || (isAutoMode && game.status === 'nuit');

  return (
    <main className="min-h-screen p-4">
      {/* Phase-specific background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-1000",
          game.status === 'nuit' ? 'bg-indigo-900/30' :
          game.status === 'conseil' ? 'bg-purple-900/20' :
          'bg-amber-500/10'
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-1000",
          game.status === 'nuit' ? 'bg-purple-900/30' :
          game.status === 'conseil' ? 'bg-red-900/20' :
          'bg-orange-500/10'
        )} />
      </div>

      <div className="max-w-lg mx-auto pt-8">
        {/* Unified Header */}
        <GameHeader
          gameName={game.name}
          gameStatus={game.status || 'lobby'}
          timeRemaining={timeRemaining}
          showTimer={showTimer}
        />

        {/* Phase-specific layout */}
        {game.status === 'nuit' && (
          <NightPhaseLayout
            currentPlayerId={currentPlayerId}
            currentPlayer={currentPlayer}
            currentRole={currentRole}
            roleConfig={roleConfig}
            isWolf={isWolf}
            isSeer={isSeer}
            isLittleGirl={isLittleGirl}
            isWitch={isWitch}
            wolves={wolves}
            alivePlayers={alivePlayers}
            nightTarget={nightActions.nightTarget}
            confirmedNightTarget={nightActions.confirmedNightTarget}
            hasNightVoted={nightActions.hasNightVoted}
            isNightVoting={nightActions.isNightVoting}
            nightVoteError={nightActions.nightVoteError}
            onSelectNightTarget={nightActions.setNightTarget}
            onSubmitNightVote={nightActions.submitNightVote}
            wolfMessages={wolfChat.wolfMessages}
            newMessage={wolfChat.newMessage}
            isSendingMessage={wolfChat.isSendingMessage}
            onMessageChange={wolfChat.setNewMessage}
            onSendMessage={wolfChat.sendWolfMessage}
            seerTarget={nightActions.seerTarget}
            seerResult={nightActions.seerResult}
            hasUsedSeerPower={nightActions.hasUsedSeerPower}
            isUsingSeerPower={nightActions.isUsingSeerPower}
            seerError={nightActions.seerError}
            onSelectSeerTarget={nightActions.setSeerTarget}
            onUseSeerPower={nightActions.useSeerPower}
            gameCode={game.code}
            gamePhase={game.current_phase ?? 1}
          />
        )}

        {game.status === 'jour' && (
          <DayPhaseLayout
            currentRole={currentRole}
            roleConfig={roleConfig}
            isWolf={isWolf}
          />
        )}

        {game.status === 'conseil' && (
          <CouncilPhaseLayout
            currentPlayerId={currentPlayerId}
            currentPlayer={currentPlayer}
            currentRole={currentRole}
            roleConfig={roleConfig}
            alivePlayers={alivePlayers}
            isMJ={isMJ}
            isAutoMode={isAutoMode}
            selectedTarget={voting.selectedTarget}
            confirmedVoteTarget={voting.confirmedVoteTarget}
            hasVoted={voting.hasVoted}
            isVoting={voting.isVoting}
            voteError={voting.voteError}
            votesCount={voting.votesCount}
            totalVoters={voting.totalVoters}
            onSelectTarget={voting.setSelectedTarget}
            onSubmitVote={voting.submitVote}
            voteResults={voting.voteResults}
            onDismissResults={voting.clearVoteResults}
          />
        )}

        {/* Common Footer */}
        <GameFooter
          game={game}
          roles={roles}
          currentPlayerId={currentPlayerId}
          currentPlayer={currentPlayer}
          isMJ={isMJ}
          isAutoMode={isAutoMode}
          isWolf={isWolf}
          wolves={wolves}
          gameStatus={game.status || 'lobby'}
          wolfVoteCount={nightActions.wolfVoteCount}
          nightVoteResolveError={nightActions.nightVoteResolveError}
          showForceConfirm={nightActions.showForceConfirm}
          isChangingPhase={nightActions.isChangingPhase || voting.isChangingPhase}
          onChangePhase={changePhase}
          onResolveVote={voting.resolveVote}
          onResolveNightVote={nightActions.resolveNightVote}
          onCancelForce={() => nightActions.setShowForceConfirm(false)}
          missions={missions.missions}
          showMissionForm={missions.showMissionForm}
          onShowMissionForm={missions.setShowMissionForm}
          onMissionCreated={handleMissionUpdate}
          onMissionUpdate={handleMissionUpdate}
          shopRefreshKey={shopRefreshKey}
          onShopRefresh={handleMissionUpdate}
        />
      </div>

      {/* Hunter Death Modal */}
      {showHunterModal && currentPlayerId && (
        <HunterDeathModal
          alivePlayers={alivePlayers}
          hunterId={currentPlayerId}
          gameCode={game.code}
          onShotComplete={handleHunterShotComplete}
        />
      )}

      {/* Tip Toast */}
      {currentTipId && (
        <TipToast tipId={currentTipId} show={true} onDismiss={dismissCurrentTip} />
      )}

      {/* Floating Rules Button */}
      <RulesButton variant="floating" />
    </main>
  );
}
