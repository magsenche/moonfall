'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PlayerAvatar, GamePhaseBadge, GameOver } from '@/components/game';
import { NotificationPrompt } from '@/components/game/notification-prompt';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { getPlayerIdForGame, savePlayerSession, migrateOldSession } from '@/lib/utils/player-session';
import { useNotifications, GAME_NOTIFICATIONS } from '@/lib/notifications';
import type { Database } from '@/types/database';

// Partial player type for what we actually select
type PartialPlayer = Pick<
  Database['public']['Tables']['players']['Row'],
  'id' | 'pseudo' | 'is_alive' | 'is_mj' | 'role_id' | 'created_at'
>;

type GameWithPlayers = Database['public']['Tables']['games']['Row'] & {
  players: PartialPlayer[];
};

type Role = Database['public']['Tables']['roles']['Row'];

interface LobbyClientProps {
  initialGame: GameWithPlayers;
  roles: Role[];
}

export function LobbyClient({ initialGame, roles }: LobbyClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [game, setGame] = useState<GameWithPlayers>(initialGame);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPseudo, setRecoveryPseudo] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Vote state
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votesCount, setVotesCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  
  // Phase transition state
  const [isChangingPhase, setIsChangingPhase] = useState(false);

  // Wolf chat state
  type WolfMessage = {
    id: string;
    message: string;
    created_at: string;
    player: { id: string; pseudo: string } | null;
  };
  const [wolfMessages, setWolfMessages] = useState<WolfMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Night vote state (wolves)
  const [nightTarget, setNightTarget] = useState<string | null>(null);
  const [hasNightVoted, setHasNightVoted] = useState(false);
  const [isNightVoting, setIsNightVoting] = useState(false);
  const [nightVoteError, setNightVoteError] = useState<string | null>(null);

  // Voyante power state
  type SeerResult = {
    targetName: string;
    roleName: string;
    team: string;
  };
  const [seerTarget, setSeerTarget] = useState<string | null>(null);
  const [seerResult, setSeerResult] = useState<SeerResult | null>(null);
  const [hasUsedSeerPower, setHasUsedSeerPower] = useState(false);
  const [isUsingSeerPower, setIsUsingSeerPower] = useState(false);
  const [seerError, setSeerError] = useState<string | null>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Missions state
  type Mission = {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    assigned_to: string | null;
    assigned_player: { id: string; pseudo: string } | null;
    assigned_players: { id: string; pseudo: string; status: string }[]; // Multi-player support
    deadline: string | null;
    reward_description: string | null;
    penalty_description: string | null;
  };
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [newMission, setNewMission] = useState({ title: '', description: '', assignedToMultiple: [] as string[] });
  const [isCreatingMission, setIsCreatingMission] = useState(false);

  // Game over state
  const [gameWinner, setGameWinner] = useState<'village' | 'loups' | null>(null);

  // Game settings state (MJ only)
  type GameSettings = {
    nightDurationMinutes: number;
    voteDurationMinutes: number;
    councilIntervalMinutes: number;
    rolesDistribution: Record<string, number>; // roleId -> count
  };
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    nightDurationMinutes: 30,
    voteDurationMinutes: 15,
    councilIntervalMinutes: 120,
    rolesDistribution: {}, // empty = auto distribution
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Notifications hook
  const { sendNotification, permission, isSupported, registerServiceWorker } = useNotifications();
  const previousStatusRef = useRef<string>(initialGame.status);

  // Register service worker on mount
  useEffect(() => {
    if (isSupported && permission === 'granted') {
      registerServiceWorker();
    }
  }, [isSupported, permission, registerServiceWorker]);

  // Send notification callback
  const notifyPhaseChange = useCallback((newStatus: string) => {
    if (permission !== 'granted') return;
    
    // Don't notify on initial load or same status
    if (previousStatusRef.current === newStatus) return;
    
    // Check if tab is in background
    if (document.hidden) {
      const notification = GAME_NOTIFICATIONS.phaseChange(newStatus, game.code);
      sendNotification(notification);
    }
    
    previousStatusRef.current = newStatus;
  }, [permission, game.code, sendNotification]);
  
  // Keep a ref to the notify function to avoid useEffect dependency issues
  const notifyPhaseChangeRef = useRef(notifyPhaseChange);
  useEffect(() => {
    notifyPhaseChangeRef.current = notifyPhaseChange;
  }, [notifyPhaseChange]);

  // Get current player ID from localStorage on mount
  useEffect(() => {
    // Migrate old session format if present
    migrateOldSession();
    
    const playerId = getPlayerIdForGame(initialGame.code);
    if (playerId) {
      setCurrentPlayerId(playerId);
      setShowRecovery(false);
    } else if (initialGame.status !== 'lobby') {
      // Game is in progress but no session - need recovery
      setShowRecovery(true);
    }
  }, [initialGame.code, initialGame.status]);

  // Real-time subscription for players
  useEffect(() => {
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        async () => {
          // Refetch game data when players change
          const { data } = await supabase
            .from('games')
            .select(`
              *,
              players (
                id,
                pseudo,
                is_alive,
                is_mj,
                role_id,
                created_at
              )
            `)
            .eq('id', game.id)
            .single();

          if (data) {
            setGame(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        async (payload) => {
          // Game status changed
          setGame(prev => ({ ...prev, ...payload.new }));
          
          // Send notification on phase change
          const newStatus = payload.new.status as string;
          notifyPhaseChangeRef.current(newStatus);
          
          // If game started, refresh the page to get roles
          if (payload.new.status !== 'lobby') {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase, router]);

  // Refresh game data when app returns to foreground (iOS PWA fix)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Refetch game data to sync state after app was in background
        const { data } = await supabase
          .from('games')
          .select(`
            *,
            players (
              id,
              pseudo,
              is_alive,
              is_mj,
              role_id,
              created_at
            )
          `)
          .eq('id', game.id)
          .single();
        
        if (data) {
          setGame(data as GameWithPlayers);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [game.id, supabase]);

  // Wolf chat realtime subscription
  useEffect(() => {
    // Only subscribe if game is in progress (not lobby or terminee)
    if (game.status === 'lobby' || game.status === 'terminee') return;

    // Initial fetch
    fetchWolfMessages();

    const chatChannel = supabase
      .channel(`wolf-chat:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wolf_chat',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          // Refetch messages on new message
          fetchWolfMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, game.status, supabase]);

  // Timer countdown effect
  useEffect(() => {
    if (!game.phase_ends_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(game.phase_ends_at!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [game.phase_ends_at]);

  // Fetch missions when game is in progress + realtime subscription
  useEffect(() => {
    if (game.status === 'lobby') return;
    
    // Initial fetch
    fetchMissions();

    // Subscribe to mission changes (both missions and assignments)
    const missionChannel = supabase
      .channel(`missions:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          fetchMissions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
        },
        () => {
          // Refetch when any assignment changes
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(missionChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.id, supabase]);

  // Fetch game winner when game is over
  useEffect(() => {
    if (game.status !== 'terminee') return;

    const fetchWinner = async () => {
      const { data } = await supabase
        .from('game_events')
        .select('data')
        .eq('game_id', game.id)
        .eq('event_type', 'game_ended')
        .single();
      
      if (data?.data && typeof data.data === 'object' && 'winner' in data.data) {
        setGameWinner(data.data.winner as 'village' | 'loups');
      } else {
        // Fallback: calculate winner from current state
        const aliveWolves = game.players.filter(p => {
          const r = roles.find(role => role.id === p.role_id);
          return r?.team === 'loups' && p.is_alive !== false;
        }).length;
        setGameWinner(aliveWolves === 0 ? 'village' : 'loups');
      }
    };

    fetchWinner();
  }, [game.status, game.id, game.players, roles, supabase]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load game settings
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${game.code}/settings`);
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        setGameSettings({
          nightDurationMinutes: settings.nightDurationMinutes ?? 30,
          voteDurationMinutes: settings.voteDurationMinutes ?? 15,
          councilIntervalMinutes: settings.councilIntervalMinutes ?? 120,
          rolesDistribution: settings.rolesDistribution ?? {},
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [game.code]);

  // Save game settings
  const saveSettings = async () => {
    if (!currentPlayerId) return;
    
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/games/${game.code}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          settings: gameSettings,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }
      setShowSettings(false);
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const startGame = async () => {
    setStartError(null);
    setIsStarting(true);
    try {
      const response = await fetch(`/api/games/${game.code}/start`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement');
      }
      // Realtime will handle the refresh
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsStarting(false);
    }
  };

  // Change game phase (MJ only)
  const changePhase = async (phase: string) => {
    setIsChangingPhase(true);
    try {
      const response = await fetch(`/api/games/${game.code}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du changement de phase');
      }
      // Reset vote state on phase change
      setHasVoted(false);
      setSelectedTarget(null);
      setVotesCount(0);
    } catch (err) {
      console.error('Phase change error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  };

  // Submit vote
  const submitVote = async () => {
    if (!currentPlayerId) return;
    
    setIsVoting(true);
    setVoteError(null);
    try {
      const response = await fetch(`/api/games/${game.code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: currentPlayerId,
          targetId: selectedTarget,
          voteType: 'jour',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du vote');
      }
      setHasVoted(true);
      setVotesCount(data.votesCount);
      setTotalVoters(data.totalPlayers);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsVoting(false);
    }
  };

  // Resolve vote (MJ only)
  const resolveVote = async () => {
    setIsChangingPhase(true);
    try {
      const response = await fetch(`/api/games/${game.code}/vote/resolve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la résolution');
      }
      // Realtime will update the game state
      router.refresh();
    } catch (err) {
      console.error('Vote resolution error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  };

  // Submit night vote (wolves only)
  const submitNightVote = async () => {
    if (!currentPlayerId || !nightTarget) return;
    
    setIsNightVoting(true);
    setNightVoteError(null);
    try {
      const response = await fetch(`/api/games/${game.code}/vote/night`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: currentPlayerId,
          targetId: nightTarget,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du vote');
      }
      setHasNightVoted(true);
    } catch (err) {
      setNightVoteError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsNightVoting(false);
    }
  };

  // Resolve night vote (MJ only)
  const resolveNightVote = async () => {
    setIsChangingPhase(true);
    try {
      const response = await fetch(`/api/games/${game.code}/vote/night/resolve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la résolution');
      }
      // Reset night vote state
      setHasNightVoted(false);
      setNightTarget(null);
      router.refresh();
    } catch (err) {
      console.error('Night vote resolution error:', err);
    } finally {
      setIsChangingPhase(false);
    }
  };

  // Send wolf chat message
  const sendWolfMessage = async () => {
    if (!currentPlayerId || !newMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      const response = await fetch(`/api/games/${game.code}/wolf-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          message: newMessage.trim(),
        }),
      });
      if (response.ok) {
        setNewMessage('');
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Fetch wolf chat messages
  const fetchWolfMessages = async () => {
    try {
      const response = await fetch(`/api/games/${game.code}/wolf-chat`);
      const data = await response.json();
      if (response.ok && data.messages) {
        setWolfMessages(data.messages);
      }
    } catch (err) {
      console.error('Fetch wolf messages error:', err);
    }
  };

  // Use seer power (voyante only)
  const useSeerPower = async () => {
    if (!currentPlayerId || !seerTarget) return;
    
    setIsUsingSeerPower(true);
    setSeerError(null);
    try {
      const response = await fetch(`/api/games/${game.code}/power/seer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          targetId: seerTarget,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'utilisation du pouvoir');
      }
      setSeerResult(data.result);
      setHasUsedSeerPower(true);
    } catch (err) {
      setSeerError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsUsingSeerPower(false);
    }
  };

  // Fetch missions
  const fetchMissions = async () => {
    try {
      const response = await fetch(`/api/games/${game.code}/missions`);
      const data = await response.json();
      if (response.ok && data.missions) {
        setMissions(data.missions);
      }
    } catch (err) {
      console.error('Fetch missions error:', err);
    }
  };

  // Create mission (MJ only)
  const createMission = async () => {
    if (!currentPlayerId || !newMission.title || !newMission.description) return;
    
    setIsCreatingMission(true);
    try {
      const response = await fetch(`/api/games/${game.code}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMission.title,
          description: newMission.description,
          assignedToMultiple: newMission.assignedToMultiple.length > 0 ? newMission.assignedToMultiple : undefined,
          creatorId: currentPlayerId,
        }),
      });
      if (response.ok) {
        setNewMission({ title: '', description: '', assignedToMultiple: [] });
        setShowMissionForm(false);
        fetchMissions();
      }
    } catch (err) {
      console.error('Create mission error:', err);
    } finally {
      setIsCreatingMission(false);
    }
  };

  // Update mission status (MJ only)
  const updateMissionStatus = async (missionId: string, action: 'validate' | 'fail' | 'cancel') => {
    if (!currentPlayerId) return;
    
    try {
      const response = await fetch(`/api/games/${game.code}/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          action,
        }),
      });
      if (response.ok) {
        fetchMissions();
      }
    } catch (err) {
      console.error('Update mission error:', err);
    }
  };

  const mj = game.players.find(p => p.is_mj);
  const players = game.players.filter(p => !p.is_mj);
  const alivePlayers = players.filter(p => p.is_alive !== false);
  const isMJ = currentPlayerId === mj?.id;

  // Recover session by pseudo
  const recoverSession = async () => {
    if (!recoveryPseudo.trim()) {
      setRecoveryError('Entre ton pseudo');
      return;
    }
    
    setIsRecovering(true);
    setRecoveryError(null);
    
    // Find player by pseudo (case-insensitive)
    const foundPlayer = game.players.find(
      p => p.pseudo.toLowerCase() === recoveryPseudo.trim().toLowerCase()
    );
    
    if (!foundPlayer) {
      setRecoveryError(`Aucun joueur "${recoveryPseudo}" dans cette partie`);
      setIsRecovering(false);
      return;
    }
    
    // Save session and restore
    savePlayerSession({
      playerId: foundPlayer.id,
      gameCode: game.code,
      pseudo: foundPlayer.pseudo,
    });
    
    setCurrentPlayerId(foundPlayer.id);
    setShowRecovery(false);
    setIsRecovering(false);
  };

  // Show recovery screen if needed
  if (showRecovery && !currentPlayerId) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">🔄 Retrouver ma partie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-400 text-center text-sm">
              Tu as changé d'appareil ou de navigateur ?<br />
              Entre ton pseudo pour retrouver ta partie.
            </p>
            
            <div className="space-y-3">
              <input
                type="text"
                value={recoveryPseudo}
                onChange={(e) => setRecoveryPseudo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && recoverSession()}
                placeholder="Ton pseudo"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              
              {recoveryError && (
                <p className="text-red-400 text-sm text-center">{recoveryError}</p>
              )}
              
              <Button
                onClick={recoverSession}
                disabled={isRecovering || !recoveryPseudo.trim()}
                className="w-full"
              >
                {isRecovering ? 'Recherche...' : 'Retrouver ma session'}
              </Button>
            </div>
            
            <div className="pt-4 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs text-center mb-3">
                Joueurs dans cette partie :
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {game.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setRecoveryPseudo(p.pseudo)}
                    className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-full text-sm text-slate-300 transition-colors"
                  >
                    {p.pseudo}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Load settings on mount (MJ only, lobby only)
  useEffect(() => {
    if (isMJ && game.status === 'lobby') {
      loadSettings();
    }
  }, [isMJ, game.status, loadSettings]);

  // Lobby view
  if (game.status === 'lobby') {
    return (
      <main className="min-h-screen p-4">
        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-lg mx-auto pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-slate-400">En attente des joueurs...</p>
          </div>

          {/* Game Code */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400 text-center mb-2">
                Code de la partie
              </p>
              <button
                onClick={copyCode}
                className="w-full text-4xl font-mono font-bold text-center tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {game.code}
              </button>
              <p className="text-sm text-slate-500 text-center mt-2">
                {copied ? '✓ Copié !' : 'Clique pour copier'}
              </p>
            </CardContent>
          </Card>

          {/* Notification Prompt */}
          <div className="mb-6">
            <NotificationPrompt playerId={currentPlayerId || undefined} />
          </div>

          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Joueurs</span>
                <span className="text-lg font-normal text-slate-400">
                  {game.players.length} / 20
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {/* MJ */}
                {mj && (
                  <li className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <PlayerAvatar 
                      playerId={mj.id} 
                      pseudo={mj.pseudo} 
                      size="sm" 
                      isMj={true}
                    />
                    <div>
                      <p className="font-medium text-white">{mj.pseudo}</p>
                      <p className="text-xs text-indigo-400">Maître du Jeu</p>
                    </div>
                  </li>
                )}
                
                {/* Other players */}
                {players.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
                  >
                    <PlayerAvatar 
                      playerId={player.id} 
                      pseudo={player.pseudo} 
                      size="sm"
                    />
                    <p className="font-medium text-white">{player.pseudo}</p>
                  </li>
                ))}

                {/* Empty slots */}
                {game.players.length < 6 && (
                  <li className="p-3 border-2 border-dashed border-slate-700 rounded-xl text-center text-slate-500">
                    En attente de joueurs... (min. 6)
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Game Settings (MJ only) */}
          {isMJ && (
            <Card className="mt-4 bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="text-sm font-medium text-slate-300">
                    ⚙️ Paramètres de la partie
                  </CardTitle>
                  <span className="text-slate-400">
                    {showSettings ? '▲' : '▼'}
                  </span>
                </button>
              </CardHeader>
              
              {showSettings && (
                <CardContent className="space-y-4">
                  {/* Night Duration */}
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">
                      🌙 Durée de la nuit
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={gameSettings.nightDurationMinutes}
                        onChange={(e) => setGameSettings(prev => ({
                          ...prev,
                          nightDurationMinutes: parseInt(e.target.value)
                        }))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-white font-medium w-16 text-right">
                        {gameSettings.nightDurationMinutes} min
                      </span>
                    </div>
                  </div>

                  {/* Vote Duration */}
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">
                      🗳️ Durée du vote (conseil)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={gameSettings.voteDurationMinutes}
                        onChange={(e) => setGameSettings(prev => ({
                          ...prev,
                          voteDurationMinutes: parseInt(e.target.value)
                        }))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-white font-medium w-16 text-right">
                        {gameSettings.voteDurationMinutes} min
                      </span>
                    </div>
                  </div>

                  {/* Council Interval */}
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">
                      ☀️ Durée du jour (avant conseil)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={30}
                        max={480}
                        step={30}
                        value={gameSettings.councilIntervalMinutes}
                        onChange={(e) => setGameSettings(prev => ({
                          ...prev,
                          councilIntervalMinutes: parseInt(e.target.value)
                        }))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-white font-medium w-16 text-right">
                        {gameSettings.councilIntervalMinutes >= 60 
                          ? `${Math.floor(gameSettings.councilIntervalMinutes / 60)}h${gameSettings.councilIntervalMinutes % 60 > 0 ? gameSettings.councilIntervalMinutes % 60 : ''}`
                          : `${gameSettings.councilIntervalMinutes} min`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Roles Distribution */}
                  <div className="border-t border-slate-700 pt-4 mt-4">
                    <label className="text-sm text-slate-400 mb-3 block">
                      🎭 Distribution des rôles
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Laisse à 0 pour une distribution automatique (~1/3 loups, 1 voyante)
                    </p>
                    <div className="space-y-3">
                      {roles.filter(r => r.is_active).map(role => {
                        const count = gameSettings.rolesDistribution[role.id] ?? 0;
                        const emoji = role.team === 'loups' ? '🐺' : role.name === 'voyante' ? '🔮' : '👤';
                        const teamColor = role.team === 'loups' ? 'text-red-400' : 'text-blue-400';
                        
                        return (
                          <div key={role.id} className="flex items-center justify-between gap-3 p-2 bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span>{emoji}</span>
                              <span className={`text-sm font-medium ${teamColor}`}>
                                {role.name === 'loup_garou' ? 'Loup-Garou' : 
                                 role.name === 'villageois' ? 'Villageois' :
                                 role.name === 'voyante' ? 'Voyante' : role.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setGameSettings(prev => ({
                                  ...prev,
                                  rolesDistribution: {
                                    ...prev.rolesDistribution,
                                    [role.id]: Math.max(0, count - 1)
                                  }
                                }))}
                                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold"
                                disabled={count === 0}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-white font-medium">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => setGameSettings(prev => ({
                                  ...prev,
                                  rolesDistribution: {
                                    ...prev.rolesDistribution,
                                    [role.id]: count + 1
                                  }
                                }))}
                                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Total count indicator */}
                    {Object.values(gameSettings.rolesDistribution).some(v => v > 0) && (
                      <div className="mt-3 p-2 bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Rôles configurés:</span>
                          <span className="text-white font-medium">
                            {Object.values(gameSettings.rolesDistribution).reduce((a, b) => a + b, 0)} rôles
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-400">Joueurs dans le lobby:</span>
                          <span className="text-white font-medium">
                            {players.length} joueurs
                          </span>
                        </div>
                        {Object.values(gameSettings.rolesDistribution).reduce((a, b) => a + b, 0) !== players.length && (
                          <p className="text-xs text-yellow-400 mt-2">
                            ⚠️ Le nombre de rôles doit correspondre au nombre de joueurs
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={saveSettings}
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                  </Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Start Game Button (MJ only) */}
          {isMJ && game.players.length >= 3 && (
            <div className="mt-6">
              <Button 
                className="w-full" 
                size="lg"
                onClick={startGame}
                disabled={isStarting}
              >
                {isStarting ? '⏳ Lancement...' : '🎮 Lancer la partie'}
              </Button>
              {startError && (
                <p className="text-sm text-red-400 text-center mt-2">
                  {startError}
                </p>
              )}
              <p className="text-xs text-slate-500 text-center mt-2">
                Les rôles seront attribués aléatoirement
              </p>
            </div>
          )}

          {/* Back button */}
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => router.push('/')}
          >
            Quitter le lobby
          </Button>
        </div>
      </main>
    );
  }

  // Game in progress - show player's role and game state
  // Find current player using stored playerId
  const currentPlayer = currentPlayerId 
    ? game.players.find(p => p.id === currentPlayerId)
    : null;
  const currentRole = currentPlayer?.role_id 
    ? roles.find(r => r.id === currentPlayer.role_id) 
    : null;
  const roleConfig = currentRole ? getRoleConfig(currentRole.name) : null;

  // Get wolves for wolf players
  const isWolf = currentRole?.team === 'loups';
  const wolves = isWolf 
    ? game.players.filter(p => {
        const pRole = roles.find(r => r.id === p.role_id);
        return pRole?.team === 'loups';
      })
    : [];

  // Game Over screen
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
          <Card className={cn(
            "mb-6 border-2",
            roleConfig.assets.bgColor,
            currentRole.team === 'loups' ? 'border-red-500/50' : 'border-blue-500/50'
          )}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn(
                  "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4",
                  roleConfig.assets.bgColor
                )}>
                  {roleConfig.assets.icon}
                </div>
                <h2 className={cn("text-2xl font-bold mb-2", roleConfig.assets.color)}>
                  {roleConfig.displayName}
                </h2>
                <p className="text-slate-300 mb-4">
                  {roleConfig.description}
                </p>
                <span className={cn(
                  "inline-block px-3 py-1 rounded-full text-sm font-medium",
                  currentRole.team === 'loups' 
                    ? 'bg-red-500/20 text-red-400' 
                    : currentRole.team === 'village'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                )}>
                  Équipe {currentRole.team === 'loups' ? 'Loups-Garous' : currentRole.team === 'village' ? 'Village' : 'Solo'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wolf teammates (only shown to wolves) */}
        {isWolf && wolves.length > 1 && (
          <Card className="mb-6 border border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 text-lg">
                🐺 Meute des Loups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {wolves.map((wolf) => (
                  <li key={wolf.id} className="flex items-center gap-3 p-2 bg-red-500/10 rounded-lg">
                    <PlayerAvatar playerId={wolf.id} pseudo={wolf.pseudo} size="sm" />
                    <span className="text-white">{wolf.pseudo}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-400/70 mt-3">
                Chaque nuit, choisissez ensemble une victime.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Wolf Night Vote - Only during night for alive wolves */}
        {game.status === 'nuit' && isWolf && currentPlayer?.is_alive !== false && (
          <Card className="mb-6 border border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">🩸 Choisir une victime</CardTitle>
            </CardHeader>
            <CardContent>
              {hasNightVoted ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-red-300">Vote enregistré</p>
                  <p className="text-sm text-slate-500 mt-2">
                    En attente de la meute...
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2 mb-4">
                    {alivePlayers
                      .filter(p => !wolves.some(w => w.id === p.id)) // Can't attack wolves
                      .map((player) => (
                        <li key={player.id}>
                          <button
                            onClick={() => setNightTarget(player.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                              nightTarget === player.id
                                ? "bg-red-500/30 border-2 border-red-500"
                                : "bg-slate-800/50 hover:bg-red-900/30 border-2 border-transparent"
                            )}
                          >
                            <PlayerAvatar 
                              playerId={player.id} 
                              pseudo={player.pseudo} 
                              size="sm"
                            />
                            <span className="font-medium text-white">{player.pseudo}</span>
                            {nightTarget === player.id && (
                              <span className="ml-auto text-red-400">🩸</span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={submitNightVote}
                    disabled={!nightTarget || isNightVoting}
                  >
                    {isNightVoting ? '⏳ Vote en cours...' : '🐺 Dévorer cette proie'}
                  </Button>
                  {nightVoteError && (
                    <p className="text-sm text-red-400 text-center mt-2">{nightVoteError}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wolf Chat - Only during night for wolves */}
        {game.status === 'nuit' && isWolf && (
          <Card className="mb-6 border border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400 text-lg">💬 Chat de la Meute</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <div className="h-48 overflow-y-auto mb-4 space-y-2 p-2 bg-slate-900/50 rounded-lg">
                {wolfMessages.length === 0 ? (
                  <p className="text-slate-500 text-center text-sm py-8">
                    Aucun message. Commencez à discuter...
                  </p>
                ) : (
                  wolfMessages.map((msg) => {
                    const isOwn = msg.player?.id === currentPlayerId;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-2 rounded-lg max-w-[85%]",
                          isOwn 
                            ? "bg-red-500/20 ml-auto" 
                            : "bg-slate-800"
                        )}
                      >
                        {!isOwn && (
                          <p className="text-xs text-red-400 font-medium mb-1">
                            {msg.player?.pseudo}
                          </p>
                        )}
                        <p className="text-white text-sm">{msg.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Input */}
              {currentPlayer?.is_alive !== false && (
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendWolfMessage(); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message à la meute..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isSendingMessage}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    disabled={!newMessage.trim() || isSendingMessage}
                  >
                    {isSendingMessage ? '...' : '➤'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Voyante Power - Only during night for the seer */}
        {game.status === 'nuit' && currentRole?.name === 'voyante' && currentPlayer?.is_alive !== false && (
          <Card className="mb-6 border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">👁️ Votre don de voyance</CardTitle>
            </CardHeader>
            <CardContent>
              {seerResult ? (
                <div className="text-center py-4">
                  <p className="text-3xl mb-3">🔮</p>
                  <p className="text-white text-lg font-bold mb-2">
                    {seerResult.targetName}
                  </p>
                  <p className="text-slate-300 mb-2">
                    est <span className={cn(
                      "font-bold",
                      seerResult.team === 'loups' ? "text-red-400" : "text-blue-400"
                    )}>
                      {seerResult.roleName === 'loup_garou' ? 'Loup-Garou' : 
                       seerResult.roleName === 'villageois' ? 'Villageois' : 
                       seerResult.roleName}
                    </span>
                  </p>
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-sm",
                    seerResult.team === 'loups' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  )}>
                    Équipe {seerResult.team === 'loups' ? 'Loups-Garous' : 'Village'}
                  </span>
                </div>
              ) : hasUsedSeerPower ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-300">Pouvoir utilisé cette nuit</p>
                </div>
              ) : (
                <>
                  <p className="text-slate-400 text-sm mb-4 text-center">
                    Choisissez un joueur pour découvrir son rôle
                  </p>
                  <ul className="space-y-2 mb-4">
                    {alivePlayers
                      .filter(p => p.id !== currentPlayerId)
                      .map((player) => (
                        <li key={player.id}>
                          <button
                            onClick={() => setSeerTarget(player.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                              seerTarget === player.id
                                ? "bg-purple-500/30 border-2 border-purple-500"
                                : "bg-slate-800/50 hover:bg-purple-900/20 border-2 border-transparent"
                            )}
                          >
                            <PlayerAvatar 
                              playerId={player.id} 
                              pseudo={player.pseudo} 
                              size="sm"
                            />
                            <span className="font-medium text-white">{player.pseudo}</span>
                            {seerTarget === player.id && (
                              <span className="ml-auto text-purple-400">👁️</span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={useSeerPower}
                    disabled={!seerTarget || isUsingSeerPower}
                  >
                    {isUsingSeerPower ? '⏳ Vision en cours...' : '🔮 Sonder cette âme'}
                  </Button>
                  {seerError && (
                    <p className="text-sm text-red-400 text-center mt-2">{seerError}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Phase Instructions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Timer Display */}
            {timeRemaining !== null && (game.status === 'jour' || game.status === 'conseil') && (
              <div className="mb-4">
                <div className={cn(
                  "text-center p-4 rounded-xl",
                  timeRemaining <= 30 
                    ? "bg-red-500/20 animate-pulse" 
                    : timeRemaining <= 60 
                    ? "bg-amber-500/20" 
                    : "bg-slate-800/50"
                )}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    Temps restant
                  </p>
                  <p className={cn(
                    "text-4xl font-mono font-bold",
                    timeRemaining <= 30 
                      ? "text-red-400" 
                      : timeRemaining <= 60 
                      ? "text-amber-400" 
                      : "text-white"
                  )}>
                    {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
                    {(timeRemaining % 60).toString().padStart(2, '0')}
                  </p>
                  {timeRemaining === 0 && (
                    <p className="text-sm text-red-400 mt-2">
                      ⏰ Temps écoulé !
                    </p>
                  )}
                </div>
              </div>
            )}

            {game.status === 'nuit' && (
              <div className="text-center">
                <p className="text-xl mb-2">🌙</p>
                <h3 className="font-bold text-white mb-2">C&apos;est la nuit</h3>
                <p className="text-slate-400 text-sm">
                  {isWolf 
                    ? "Concertez-vous avec votre meute pour choisir une victime."
                    : currentRole?.name === 'voyante'
                    ? "Vous pouvez sonder l'âme d'un joueur."
                    : "Le village dort. Attendez le lever du jour..."}
                </p>
              </div>
            )}
            {game.status === 'jour' && (
              <div className="text-center">
                <p className="text-xl mb-2">☀️</p>
                <h3 className="font-bold text-white mb-2">C&apos;est le jour</h3>
                <p className="text-slate-400 text-sm">
                  Discutez avec les autres villageois et trouvez les loups-garous !
                </p>
              </div>
            )}
            {game.status === 'conseil' && (
              <div className="text-center">
                <p className="text-xl mb-2">⚖️</p>
                <h3 className="font-bold text-white mb-2">Conseil du village</h3>
                {hasVoted ? (
                  <p className="text-green-400 text-sm">
                    ✓ Vote enregistré ! ({votesCount}/{totalVoters})
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Sélectionnez un joueur à éliminer ci-dessous.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vote Section - Only during conseil phase for alive non-MJ players */}
        {game.status === 'conseil' && currentPlayer && currentPlayer.is_alive !== false && !isMJ && (
          <Card className="mb-6 border border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-amber-400">🗳️ Votre vote</CardTitle>
            </CardHeader>
            <CardContent>
              {hasVoted ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-300">Vote enregistré</p>
                  <p className="text-sm text-slate-500 mt-2">
                    En attente des autres joueurs...
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2 mb-4">
                    {alivePlayers
                      .filter(p => p.id !== currentPlayerId)
                      .map((player) => (
                        <li key={player.id}>
                          <button
                            onClick={() => setSelectedTarget(player.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                              selectedTarget === player.id
                                ? "bg-red-500/30 border-2 border-red-500"
                                : "bg-slate-800/50 hover:bg-slate-700/50 border-2 border-transparent"
                            )}
                          >
                            <PlayerAvatar 
                              playerId={player.id} 
                              pseudo={player.pseudo} 
                              size="sm"
                            />
                            <span className="font-medium text-white">{player.pseudo}</span>
                            {selectedTarget === player.id && (
                              <span className="ml-auto text-red-400">☠️</span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={submitVote}
                    disabled={!selectedTarget || isVoting}
                  >
                    {isVoting ? '⏳ Vote en cours...' : '🗳️ Confirmer le vote'}
                  </Button>
                  {voteError && (
                    <p className="text-sm text-red-400 text-center mt-2">{voteError}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* MJ Controls */}
        {isMJ && game.status !== 'terminee' && (
          <Card className="mb-6 border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">🎭 Contrôles MJ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {game.status === 'nuit' && (
                <>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={resolveNightVote}
                    disabled={isChangingPhase}
                  >
                    🐺 Résoudre l&apos;attaque des loups
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => changePhase('jour')}
                    disabled={isChangingPhase}
                  >
                    ☀️ Passer au jour (sans attaque)
                  </Button>
                </>
              )}
              {game.status === 'jour' && (
                <Button
                  className="w-full"
                  onClick={() => changePhase('conseil')}
                  disabled={isChangingPhase}
                >
                  ⚖️ Ouvrir le conseil
                </Button>
              )}
              {game.status === 'conseil' && (
                <Button
                  className="w-full"
                  onClick={resolveVote}
                  disabled={isChangingPhase}
                >
                  🗳️ Résoudre le vote
                </Button>
              )}
              {isChangingPhase && (
                <p className="text-sm text-slate-400 text-center">⏳ Changement en cours...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Missions Section */}
        {game.status !== 'terminee' && (
          <Card className="mb-6 border border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-amber-400">
                <span>📋 Missions</span>
                {isMJ && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMissionForm(!showMissionForm)}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    {showMissionForm ? '✕ Annuler' : '+ Nouvelle'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mission Creation Form (MJ only) */}
              {isMJ && showMissionForm && (
                <div className="mb-4 p-4 bg-slate-800/50 rounded-xl space-y-3">
                  <input
                    type="text"
                    placeholder="Titre de la mission"
                    value={newMission.title}
                    onChange={(e) => setNewMission(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500"
                  />
                  <textarea
                    placeholder="Description de la mission"
                    value={newMission.description}
                    onChange={(e) => setNewMission(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 min-h-20"
                  />
                  
                  {/* Multi-select for players */}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Assigner à (plusieurs joueurs possibles)</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-slate-700 rounded-lg min-h-12">
                      {alivePlayers.map((player) => {
                        const isSelected = newMission.assignedToMultiple.includes(player.id);
                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => {
                              setNewMission(prev => ({
                                ...prev,
                                assignedToMultiple: isSelected
                                  ? prev.assignedToMultiple.filter(id => id !== player.id)
                                  : [...prev.assignedToMultiple, player.id]
                              }));
                            }}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                              isSelected
                                ? "bg-amber-600 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                          >
                            {isSelected ? '✓ ' : ''}{player.pseudo}
                          </button>
                        );
                      })}
                      {alivePlayers.length === 0 && (
                        <span className="text-slate-500 text-sm">Aucun joueur disponible</span>
                      )}
                    </div>
                    {newMission.assignedToMultiple.length > 0 && (
                      <p className="text-xs text-slate-400">
                        {newMission.assignedToMultiple.length} joueur(s) sélectionné(s)
                      </p>
                    )}
                  </div>
                  
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={createMission}
                    disabled={!newMission.title || !newMission.description || isCreatingMission}
                  >
                    {isCreatingMission ? '⏳ Création...' : '✓ Créer la mission'}
                  </Button>
                </div>
              )}

              {/* Missions List */}
              {missions.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Aucune mission pour le moment
                </p>
              ) : (
                <ul className="space-y-3">
                  {missions.map((mission) => (
                    <li
                      key={mission.id}
                      className={cn(
                        "p-3 rounded-xl",
                        mission.status === 'success' && "bg-green-500/10 border border-green-500/30",
                        mission.status === 'failed' && "bg-red-500/10 border border-red-500/30",
                        mission.status === 'cancelled' && "bg-slate-500/10 border border-slate-500/30 opacity-50",
                        (mission.status === 'pending' || mission.status === 'in_progress') && "bg-amber-500/10 border border-amber-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{mission.title}</h4>
                          <p className="text-sm text-slate-400 mt-1">{mission.description}</p>
                          {/* Show assigned players (multi-player support) */}
                          {mission.assigned_players && mission.assigned_players.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {mission.assigned_players.map((player) => (
                                <span 
                                  key={player.id}
                                  className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full"
                                >
                                  👤 {player.pseudo}
                                </span>
                              ))}
                            </div>
                          ) : mission.assigned_player && (
                            <p className="text-xs text-amber-400 mt-2">
                              👤 {mission.assigned_player.pseudo}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {mission.status === 'pending' && (
                            <span className="text-xs px-2 py-1 bg-slate-500/20 text-slate-400 rounded">⏳ En attente</span>
                          )}
                          {mission.status === 'in_progress' && (
                            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">🎯 En cours</span>
                          )}
                          {mission.status === 'success' && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">✅ Réussie</span>
                          )}
                          {mission.status === 'failed' && (
                            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">❌ Échouée</span>
                          )}
                          {mission.status === 'cancelled' && (
                            <span className="text-xs px-2 py-1 bg-slate-500/20 text-slate-500 rounded">🚫 Annulée</span>
                          )}
                        </div>
                      </div>
                      
                      {/* MJ Actions */}
                      {isMJ && mission.status === 'in_progress' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => updateMissionStatus(mission.id, 'validate')}
                          >
                            ✅ Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-red-400 hover:bg-red-500/20"
                            onClick={() => updateMissionStatus(mission.id, 'fail')}
                          >
                            ❌ Échouer
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Players List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Joueurs</span>
              <span className="text-sm font-normal text-slate-400">
                {game.players.filter(p => !p.is_mj && p.is_alive !== false).length} en vie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {game.players
                .filter(p => !p.is_mj)
                .map((player) => {
                  const isCurrentPlayer = player.id === currentPlayer?.id;
                  const playerRole = roles.find(r => r.id === player.role_id);
                  const pRoleConfig = playerRole ? getRoleConfig(playerRole.name) : null;
                  const isDead = player.is_alive === false;
                  // MJ can see all roles
                  const canSeeRole = isMJ || isCurrentPlayer || (isWolf && wolves.some(w => w.id === player.id));
                  
                  return (
                    <li
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        isDead && "opacity-50",
                        isCurrentPlayer 
                          ? "bg-indigo-500/20 border border-indigo-500/30" 
                          : isMJ && playerRole?.team === 'loups'
                          ? "bg-red-500/10 border border-red-500/20"
                          : "bg-slate-800/50"
                      )}
                    >
                      <PlayerAvatar 
                        playerId={player.id} 
                        pseudo={player.pseudo} 
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className={cn("font-medium", isDead ? "text-slate-500 line-through" : "text-white")}>
                          {player.pseudo}
                          {isCurrentPlayer && <span className="text-indigo-400 text-sm ml-2">(Vous)</span>}
                          {isDead && <span className="text-red-400 text-sm ml-2">☠️</span>}
                        </p>
                        {/* MJ sees role name for all players */}
                        {isMJ && pRoleConfig && !isDead && (
                          <p className={cn(
                            "text-xs",
                            playerRole?.team === 'loups' ? "text-red-400" : "text-blue-400"
                          )}>
                            {pRoleConfig.displayName}
                          </p>
                        )}
                        {isDead && pRoleConfig && (
                          <p className="text-xs text-slate-500">
                            était {pRoleConfig.displayName}
                          </p>
                        )}
                      </div>
                      {/* Show role icon for MJ, self, and wolves see other wolves */}
                      {!isDead && canSeeRole && pRoleConfig && (
                        <span className="text-lg">{pRoleConfig.assets.icon}</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>

        {/* MJ Overview Panel */}
        {isMJ && (
          <Card className="mt-6 border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">📊 Vue d&apos;ensemble MJ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team counts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {alivePlayers.filter(p => {
                      const r = roles.find(role => role.id === p.role_id);
                      return r?.team !== 'loups';
                    }).length}
                  </p>
                  <p className="text-xs text-blue-300">Villageois en vie</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {alivePlayers.filter(p => {
                      const r = roles.find(role => role.id === p.role_id);
                      return r?.team === 'loups';
                    }).length}
                  </p>
                  <p className="text-xs text-red-300">Loups en vie</p>
                </div>
              </div>

              {/* Role distribution */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Distribution des rôles</h4>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => {
                    const playersWithRole = game.players.filter(p => p.role_id === role.id && !p.is_mj);
                    const aliveWithRole = playersWithRole.filter(p => p.is_alive !== false);
                    if (playersWithRole.length === 0) return null;
                    
                    const roleConfig = getRoleConfig(role.name);
                    return (
                      <div
                        key={role.id}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm flex items-center gap-1",
                          role.team === 'loups' 
                            ? "bg-red-500/20 text-red-300" 
                            : "bg-blue-500/20 text-blue-300"
                        )}
                      >
                        <span>{roleConfig?.assets.icon}</span>
                        <span>{aliveWithRole.length}/{playersWithRole.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Victory condition indicator */}
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Condition de victoire</p>
                {(() => {
                  const aliveWolves = alivePlayers.filter(p => {
                    const r = roles.find(role => role.id === p.role_id);
                    return r?.team === 'loups';
                  }).length;
                  const aliveVillagers = alivePlayers.filter(p => {
                    const r = roles.find(role => role.id === p.role_id);
                    return r?.team !== 'loups';
                  }).length;
                  
                  if (aliveWolves === 0) {
                    return <p className="text-green-400 font-medium">🏆 Village gagne (plus de loups)</p>;
                  }
                  if (aliveWolves >= aliveVillagers) {
                    return <p className="text-red-400 font-medium">🏆 Loups gagnent (majorité)</p>;
                  }
                  return (
                    <p className="text-slate-300">
                      Les loups doivent éliminer <span className="text-amber-400 font-bold">{aliveVillagers - aliveWolves + 1}</span> villageois
                    </p>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
