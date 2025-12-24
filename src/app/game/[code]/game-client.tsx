/**
 * GameClient - Main game component (refactored)
 * 
 * This is a complete rewrite of lobby-client.tsx with:
 * - Extracted hooks for each domain (voting, night actions, chat, etc.)
 * - Extracted components for each UI section
 * - Clean separation of concerns
 * - ~300 lines instead of ~2000 lines
 * 
 * @see hooks/ for all custom hooks
 * @see components/ for all UI components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui';
import { GamePhaseBadge, GameOver } from '@/components/game';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications';
import { startGame as apiStartGame, changePhase as apiChangePhase, ApiError } from '@/lib/api';

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
  type GameWithPlayers,
  type Role,
} from './hooks';

// Components
import {
  SessionRecovery,
  LobbyView,
  PhaseTimer,
  PhaseInstructions,
  PlayerRoleCard,
  WolfPack,
  WolfNightVote,
  WolfChatPanel,
  SeerPowerPanel,
  VotingPanel,
  MJControls,
  MJOverview,
  PlayersList,
  MissionsSection,
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
  const [startError, setStartError] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<'village' | 'loups' | null>(null);
  
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
  const { timeRemaining } = useTimer({
    phaseEndsAt: game.phase_ends_at,
  });

  // Derived state
  const mj = game.players.find(p => p.is_mj);
  const players = game.players.filter(p => !p.is_mj);
  const alivePlayers = players.filter(p => p.is_alive !== false);
  const isMJ = currentPlayerId === mj?.id;
  
  const currentPlayer = currentPlayerId
    ? game.players.find(p => p.id === currentPlayerId)
    : null;
  const currentRole = currentPlayer?.role_id
    ? roles.find(r => r.id === currentPlayer.role_id)
    : null;
  const roleConfig = currentRole ? getRoleConfig(currentRole.name) : null;
  
  const isWolf = currentRole?.team === 'loups';
  const isSeer = currentRole?.name === 'voyante';
  const wolves = isWolf
    ? game.players.filter(p => {
        const pRole = roles.find(r => r.id === p.role_id);
        return pRole?.team === 'loups';
      })
    : [];

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

  // Copy game code
  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [game.code]);

  // Start game
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

  // Change phase (MJ)
  const changePhase = useCallback(async (phase: string) => {
    try {
      await apiChangePhase(game.code, phase);
    } catch (err) {
      console.error('Phase change error:', err instanceof ApiError ? err.message : err);
    }
  }, [game.code]);

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
        // Fallback: calculate from current state
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
  return (
    <main className="min-h-screen p-4">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl",
          game.status === 'nuit' ? 'bg-indigo-900/30' : 'bg-amber-500/10'
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl",
          game.status === 'nuit' ? 'bg-purple-900/30' : 'bg-orange-500/10'
        )} />
      </div>

      <div className="max-w-lg mx-auto pt-8">
        {/* Game Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{game.name}</h1>
          <GamePhaseBadge status={game.status || 'lobby'} className="inline-flex" />
        </div>

        {/* Player's Role Card */}
        {currentRole && roleConfig && (
          <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />
        )}

        {/* Wolf teammates (only shown to wolves) */}
        {isWolf && <WolfPack wolves={wolves} />}

        {/* Wolf Night Vote */}
        {game.status === 'nuit' && isWolf && currentPlayer?.is_alive !== false && (
          <WolfNightVote
            alivePlayers={alivePlayers}
            wolves={wolves}
            nightTarget={nightActions.nightTarget}
            confirmedNightTarget={nightActions.confirmedNightTarget}
            hasNightVoted={nightActions.hasNightVoted}
            isNightVoting={nightActions.isNightVoting}
            nightVoteError={nightActions.nightVoteError}
            onSelectTarget={nightActions.setNightTarget}
            onSubmitVote={nightActions.submitNightVote}
          />
        )}

        {/* Wolf Chat */}
        {game.status === 'nuit' && isWolf && (
          <WolfChatPanel
            messages={wolfChat.wolfMessages}
            newMessage={wolfChat.newMessage}
            isSendingMessage={wolfChat.isSendingMessage}
            currentPlayerId={currentPlayerId}
            isAlive={currentPlayer?.is_alive !== false}
            onMessageChange={wolfChat.setNewMessage}
            onSendMessage={wolfChat.sendWolfMessage}
          />
        )}

        {/* Seer Power */}
        {game.status === 'nuit' && isSeer && currentPlayer?.is_alive !== false && (
          <SeerPowerPanel
            alivePlayers={alivePlayers}
            currentPlayerId={currentPlayerId}
            seerTarget={nightActions.seerTarget}
            seerResult={nightActions.seerResult}
            hasUsedSeerPower={nightActions.hasUsedSeerPower}
            isUsingSeerPower={nightActions.isUsingSeerPower}
            seerError={nightActions.seerError}
            onSelectTarget={nightActions.setSeerTarget}
            onUsePower={nightActions.useSeerPower}
          />
        )}

        {/* Phase Instructions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <PhaseTimer
              timeRemaining={timeRemaining}
              showTimer={game.status === 'jour' || game.status === 'conseil'}
            />
            <PhaseInstructions
              status={game.status || 'lobby'}
              isWolf={isWolf}
              isSeer={isSeer}
              hasVoted={voting.hasVoted}
              votesCount={voting.votesCount}
              totalVoters={voting.totalVoters}
            />
          </CardContent>
        </Card>

        {/* Voting Panel */}
        {game.status === 'conseil' && currentPlayer && currentPlayer.is_alive !== false && !isMJ && (
          <VotingPanel
            alivePlayers={alivePlayers}
            currentPlayerId={currentPlayerId}
            selectedTarget={voting.selectedTarget}
            confirmedVoteTarget={voting.confirmedVoteTarget}
            hasVoted={voting.hasVoted}
            isVoting={voting.isVoting}
            voteError={voting.voteError}
            votesCount={voting.votesCount}
            totalVoters={voting.totalVoters}
            onSelectTarget={voting.setSelectedTarget}
            onSubmitVote={voting.submitVote}
          />
        )}

        {/* MJ Controls */}
        {isMJ && game.status !== 'terminee' && (
          <MJControls
            gameStatus={game.status || 'lobby'}
            wolfVoteCount={nightActions.wolfVoteCount}
            nightVoteResolveError={nightActions.nightVoteResolveError}
            showForceConfirm={nightActions.showForceConfirm}
            isChangingPhase={nightActions.isChangingPhase || voting.isChangingPhase}
            onChangePhase={changePhase}
            onResolveVote={voting.resolveVote}
            onResolveNightVote={nightActions.resolveNightVote}
            onCancelForce={() => nightActions.setShowForceConfirm(false)}
          />
        )}

        {/* Missions Section */}
        {game.status !== 'terminee' && (
          <MissionsSection
            missions={missions.missions}
            players={players}
            currentPlayerId={currentPlayerId}
            isMJ={isMJ}
            showMissionForm={missions.showMissionForm}
            gameCode={game.code}
            onShowMissionForm={missions.setShowMissionForm}
            onMissionCreated={missions.fetchMissions}
            onMissionUpdate={missions.fetchMissions}
          />
        )}

        {/* Players List */}
        <PlayersList
          players={game.players}
          roles={roles}
          currentPlayerId={currentPlayerId}
          isMJ={isMJ}
          isWolf={isWolf}
          wolves={wolves}
        />

        {/* MJ Overview Panel */}
        {isMJ && (
          <MJOverview
            players={players}
            roles={roles}
            alivePlayers={alivePlayers}
          />
        )}
      </div>
    </main>
  );
}
