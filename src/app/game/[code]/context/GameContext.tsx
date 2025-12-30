/**
 * GameContext - Centralized game state management
 *
 * Eliminates prop drilling by providing all game state and actions
 * through React Context. Components use `useGame()` hook instead of props.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { getRoleConfig, type RoleConfig } from '@/config/roles';
import { useNotifications } from '@/lib/notifications';
import { useGameTips } from '@/components/game';
import {
  startGame as apiStartGame,
  changePhase as apiChangePhase,
  addBots,
  removeBots,
  ApiError,
} from '@/lib/api';

import {
  usePlayerSession,
  useGameRealtime,
  useVoting,
  useNightActions,
  useWolfChat,
  useMissions,
  useGameSettings,
  type GameWithPlayers,
  type Role,
  type PartialPlayer,
  type WolfMessage,
  type SeerResult,
  type Mission,
} from '../hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameContextType {
  // Core game state
  game: GameWithPlayers;
  roles: Role[];
  gameStatus: string;

  // Timer display flag (actual timer values come from useTimerContext)
  showTimer: boolean;

  // Player state
  currentPlayerId: string | null;
  currentPlayer: PartialPlayer | null | undefined;
  currentRole: Role | null | undefined;
  roleConfig: RoleConfig | null;
  isMJ: boolean;
  isAlive: boolean;

  // Derived player lists
  players: PartialPlayer[];
  alivePlayers: PartialPlayer[];
  wolves: PartialPlayer[];

  // Role flags
  isWolf: boolean;
  isSeer: boolean;
  isLittleGirl: boolean;
  isHunter: boolean;
  isWitch: boolean;
  isSalvateur: boolean;
  isAssassin: boolean;
  isTrublion: boolean;
  isWildChild: boolean;
  isCupidon: boolean;

  // Mode flags
  isAutoMode: boolean;

  // Voting (conseil)
  voting: {
    selectedTarget: string | null;
    setSelectedTarget: (id: string | null) => void;
    confirmedVoteTarget: string | null;
    hasVoted: boolean;
    isVoting: boolean;
    voteError: string | null;
    votesCount: number;
    totalVoters: number;
    submitVote: () => void;
    voteResults: ReturnType<typeof useVoting>['voteResults'];
    clearVoteResults: () => void;
    resolveVote: () => void;
    isChangingPhase: boolean;
  };

  // Night actions (wolf vote + seer)
  nightActions: {
    nightTarget: string | null;
    setNightTarget: (id: string | null) => void;
    confirmedNightTarget: string | null;
    hasNightVoted: boolean;
    isNightVoting: boolean;
    nightVoteError: string | null;
    submitNightVote: () => void;
    wolfVoteCount: { voted: number; total: number };
    nightVoteResolveError: string | null;
    showForceConfirm: boolean;
    setShowForceConfirm: (show: boolean) => void;
    isChangingPhase: boolean;
    resolveNightVote: () => void;
    // Seer
    seerTarget: string | null;
    setSeerTarget: (id: string | null) => void;
    seerResult: SeerResult | null;
    seerHistory: SeerResult[];
    hasUsedSeerPower: boolean;
    isUsingSeerPower: boolean;
    seerError: string | null;
    useSeerPower: () => void;
  };

  // Wolf chat
  wolfChat: {
    wolfMessages: WolfMessage[];
    newMessage: string;
    setNewMessage: (msg: string) => void;
    isSendingMessage: boolean;
    sendWolfMessage: () => void;
  };

  // Missions
  missions: {
    missions: Mission[];
    showMissionForm: boolean;
    setShowMissionForm: (show: boolean) => void;
    fetchMissions: () => void;
  };

  // Settings
  settings: ReturnType<typeof useGameSettings>;

  // Session recovery
  sessionRecovery: {
    showRecovery: boolean;
    recoveryPseudo: string;
    setRecoveryPseudo: (pseudo: string) => void;
    recoveryError: string | null;
    isRecovering: boolean;
    recoverSession: () => void;
  };

  // Tips
  tips: {
    currentTipId: string | null;
    dismissCurrentTip: () => void;
  };

  // Game actions
  actions: {
    copyCode: () => Promise<void>;
    startGame: () => Promise<void>;
    changePhase: (phase: string) => Promise<void>;
    addBotsToGame: () => Promise<void>;
    removeBotsFromGame: () => Promise<void>;
  };

  // UI state
  ui: {
    copied: boolean;
    isStarting: boolean;
    isAddingBots: boolean;
    startError: string | null;
    gameWinner: 'village' | 'loups' | null;
    shopRefreshKey: number;
    refreshShop: () => void;
    showHunterModal: boolean;
    setShowHunterModal: (show: boolean) => void;
    hunterModalProcessed: boolean;
    setHunterModalProcessed: (processed: boolean) => void;
  };

  // Navigation
  router: ReturnType<typeof useRouter>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextType | null>(null);

/**
 * Hook to access game context
 * @throws Error if used outside of GameProvider
 */
export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface GameProviderProps {
  children: ReactNode;
  initialGame: GameWithPlayers;
  roles: Role[];
}

export function GameProvider({ children, initialGame, roles }: GameProviderProps) {
  const router = useRouter();

  // ─────────────────────────────────────────────────────────────────────────────
  // Core State
  // ─────────────────────────────────────────────────────────────────────────────

  const [game, setGame] = useState<GameWithPlayers>(initialGame);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<'village' | 'loups' | null>(null);
  const [shopRefreshKey, setShopRefreshKey] = useState(0);
  const [showHunterModal, setShowHunterModal] = useState(false);
  const [hunterModalProcessed, setHunterModalProcessed] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────────

  const { permission, isSupported, registerServiceWorker } = useNotifications();

  useEffect(() => {
    if (isSupported && permission === 'granted') {
      registerServiceWorker();
    }
  }, [isSupported, permission, registerServiceWorker]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Player Session
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    currentPlayerId,
    showRecovery,
    recoveryPseudo,
    recoveryError,
    isRecovering,
    setRecoveryPseudo,
    recoverSession,
  } = usePlayerSession({ game });

  // ─────────────────────────────────────────────────────────────────────────────
  // Realtime
  // ─────────────────────────────────────────────────────────────────────────────

  useGameRealtime({
    game,
    onGameUpdate: setGame,
    onPlayersChange: () => setShopRefreshKey((k) => k + 1),
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────────

  const mj = game.players.find((p) => p.is_mj);
  const players = useMemo(() => game.players.filter((p) => !p.is_mj), [game.players]);
  const alivePlayers = useMemo(() => players.filter((p) => p.is_alive !== false), [players]);
  const isMJ = currentPlayerId === mj?.id;
  const isAutoMode = (game.settings as { autoMode?: boolean })?.autoMode ?? false;

  const currentPlayer = currentPlayerId
    ? game.players.find((p) => p.id === currentPlayerId)
    : null;

  const currentRole = currentPlayer?.role_id
    ? roles.find((r) => r.id === currentPlayer.role_id)
    : null;

  const roleConfig = currentRole ? getRoleConfig(currentRole.name) : null;

  const isWolf = currentRole?.team === 'loups';
  const isSeer = currentRole?.name === 'voyante';
  const isLittleGirl = currentRole?.name === 'petite_fille';
  const isHunter = currentRole?.name === 'chasseur';
  const isWitch = currentRole?.name === 'sorciere';
  const isSalvateur = currentRole?.name === 'salvateur';
  const isAssassin = currentRole?.name === 'assassin';
  const isTrublion = currentRole?.name === 'trublion';
  const isWildChild = currentRole?.name === 'enfant_sauvage';
  const isCupidon = currentRole?.name === 'cupidon';
  const isAlive = currentPlayer?.is_alive !== false;

  const wolves = useMemo(() => {
    if (!isWolf) return [];
    return game.players.filter((p) => {
      const pRole = roles.find((r) => r.id === p.role_id);
      return pRole?.team === 'loups';
    });
  }, [isWolf, game.players, roles]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Tips
  // ─────────────────────────────────────────────────────────────────────────────

  const { currentTipId, dismissCurrentTip } = useGameTips(
    game.status || 'lobby',
    currentRole?.name,
    isWolf,
    isSeer,
    isLittleGirl,
    isWitch
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Domain Hooks
  // ─────────────────────────────────────────────────────────────────────────────

  const voting = useVoting({
    gameCode: game.code,
    currentPlayerId,
    gameStatus: game.status || 'lobby',
  });

  const nightActionsHook = useNightActions({
    gameCode: game.code,
    currentPlayerId,
    gameStatus: game.status || 'lobby',
    isMJ,
  });

  const wolfChatHook = useWolfChat({
    gameId: game.id,
    gameCode: game.code,
    gameStatus: game.status || 'lobby',
    currentPlayerId,
    isWolf,
    isLittleGirl,
  });

  const missionsHook = useMissions({
    gameId: game.id,
    gameCode: game.code,
    gameStatus: game.status || 'lobby',
    currentPlayerId,
  });

  const settings = useGameSettings({
    gameCode: game.code,
    currentPlayerId,
    isMJ,
    gameStatus: game.status || 'lobby',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Callbacks
  // ─────────────────────────────────────────────────────────────────────────────

  const refreshShop = useCallback(() => {
    missionsHook.fetchMissions();
    setShopRefreshKey((k) => k + 1);
  }, [missionsHook]);

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

  const changePhase = useCallback(
    async (phase: string) => {
      try {
        await apiChangePhase(game.code, phase);
      } catch (err) {
        console.error('Phase change error:', err instanceof ApiError ? err.message : err);
      }
    },
    [game.code]
  );

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Hunter Modal Detection
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Game Winner Detection
  // ─────────────────────────────────────────────────────────────────────────────

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
        const aliveWolves = game.players.filter((p) => {
          const r = roles.find((role) => role.id === p.role_id);
          return r?.team === 'loups' && p.is_alive !== false;
        }).length;
        setGameWinner(aliveWolves === 0 ? 'village' : 'loups');
      }
    };

    fetchWinner();
  }, [game.status, game.id, game.players, roles]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────────────────────────

  const gameStatus = game.status || 'lobby';
  const showTimer =
    gameStatus === 'jour' || gameStatus === 'conseil' || (isAutoMode && gameStatus === 'nuit');

  const value = useMemo<GameContextType>(
    () => ({
      // Core
      game,
      roles,
      gameStatus,

      // Timer display flag
      showTimer,

      // Player
      currentPlayerId,
      currentPlayer,
      currentRole,
      roleConfig,
      isMJ,
      isAlive,

      // Derived lists
      players,
      alivePlayers,
      wolves,

      // Role flags
      isWolf,
      isSeer,
      isLittleGirl,
      isHunter,
      isWitch,
      isSalvateur,
      isAssassin,
      isTrublion,
      isWildChild,
      isCupidon,

      // Mode flags
      isAutoMode,

      // Voting
      voting: {
        selectedTarget: voting.selectedTarget,
        setSelectedTarget: voting.setSelectedTarget,
        confirmedVoteTarget: voting.confirmedVoteTarget,
        hasVoted: voting.hasVoted,
        isVoting: voting.isVoting,
        voteError: voting.voteError,
        votesCount: voting.votesCount,
        totalVoters: voting.totalVoters,
        submitVote: voting.submitVote,
        voteResults: voting.voteResults,
        clearVoteResults: voting.clearVoteResults,
        resolveVote: voting.resolveVote,
        isChangingPhase: voting.isChangingPhase,
      },

      // Night actions
      nightActions: {
        nightTarget: nightActionsHook.nightTarget,
        setNightTarget: nightActionsHook.setNightTarget,
        confirmedNightTarget: nightActionsHook.confirmedNightTarget,
        hasNightVoted: nightActionsHook.hasNightVoted,
        isNightVoting: nightActionsHook.isNightVoting,
        nightVoteError: nightActionsHook.nightVoteError,
        submitNightVote: nightActionsHook.submitNightVote,
        wolfVoteCount: nightActionsHook.wolfVoteCount,
        nightVoteResolveError: nightActionsHook.nightVoteResolveError,
        showForceConfirm: nightActionsHook.showForceConfirm,
        setShowForceConfirm: nightActionsHook.setShowForceConfirm,
        isChangingPhase: nightActionsHook.isChangingPhase,
        resolveNightVote: nightActionsHook.resolveNightVote,
        seerTarget: nightActionsHook.seerTarget,
        setSeerTarget: nightActionsHook.setSeerTarget,
        seerResult: nightActionsHook.seerResult,
        seerHistory: nightActionsHook.seerHistory,
        hasUsedSeerPower: nightActionsHook.hasUsedSeerPower,
        isUsingSeerPower: nightActionsHook.isUsingSeerPower,
        seerError: nightActionsHook.seerError,
        useSeerPower: nightActionsHook.useSeerPower,
      },

      // Wolf chat
      wolfChat: {
        wolfMessages: wolfChatHook.wolfMessages,
        newMessage: wolfChatHook.newMessage,
        setNewMessage: wolfChatHook.setNewMessage,
        isSendingMessage: wolfChatHook.isSendingMessage,
        sendWolfMessage: wolfChatHook.sendWolfMessage,
      },

      // Missions
      missions: {
        missions: missionsHook.missions,
        showMissionForm: missionsHook.showMissionForm,
        setShowMissionForm: missionsHook.setShowMissionForm,
        fetchMissions: missionsHook.fetchMissions,
      },

      // Settings
      settings,

      // Session recovery
      sessionRecovery: {
        showRecovery,
        recoveryPseudo,
        setRecoveryPseudo,
        recoveryError,
        isRecovering,
        recoverSession,
      },

      // Tips
      tips: {
        currentTipId,
        dismissCurrentTip,
      },

      // Actions
      actions: {
        copyCode,
        startGame,
        changePhase,
        addBotsToGame,
        removeBotsFromGame,
      },

      // UI
      ui: {
        copied,
        isStarting,
        isAddingBots,
        startError,
        gameWinner,
        shopRefreshKey,
        refreshShop,
        showHunterModal,
        setShowHunterModal,
        hunterModalProcessed,
        setHunterModalProcessed,
      },

      // Navigation
      router,
    }),
    [
      game,
      roles,
      gameStatus,
      showTimer,
      currentPlayerId,
      currentPlayer,
      currentRole,
      roleConfig,
      isMJ,
      isAlive,
      players,
      alivePlayers,
      wolves,
      isWolf,
      isSeer,
      isLittleGirl,
      isHunter,
      isWitch,
      isSalvateur,
      isAssassin,
      isTrublion,
      isWildChild,
      isAutoMode,
      voting,
      nightActionsHook,
      wolfChatHook,
      missionsHook,
      settings,
      showRecovery,
      recoveryPseudo,
      setRecoveryPseudo,
      recoveryError,
      isRecovering,
      recoverSession,
      currentTipId,
      dismissCurrentTip,
      copyCode,
      startGame,
      changePhase,
      addBotsToGame,
      removeBotsFromGame,
      copied,
      isStarting,
      isAddingBots,
      startError,
      gameWinner,
      shopRefreshKey,
      refreshShop,
      showHunterModal,
      hunterModalProcessed,
      router,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
