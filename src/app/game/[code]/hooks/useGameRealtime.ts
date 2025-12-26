/**
 * useGameRealtime - Supabase realtime subscriptions for game state
 * 
 * Handles:
 * - Players table changes (join/leave/status)
 * - Games table changes (phase transitions)
 * - Visibility change refresh (iOS PWA fix)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useNotifications, GAME_NOTIFICATIONS } from '@/lib/notifications';
import type { GameWithPlayers } from './types';

interface UseGameRealtimeOptions {
  game: GameWithPlayers;
  onGameUpdate: (game: GameWithPlayers) => void;
  onPlayersChange?: () => void; // Called when player data changes (for shop refresh)
}

export function useGameRealtime({ game, onGameUpdate, onPlayersChange }: UseGameRealtimeOptions) {
  const router = useRouter();
  const supabase = createClient();
  const { sendNotification, permission } = useNotifications();
  const previousStatusRef = useRef<string>(game.status || 'lobby');

  // Notify on phase change (when tab is hidden)
  const notifyPhaseChange = useCallback((newStatus: string) => {
    if (permission !== 'granted') return;
    if (previousStatusRef.current === newStatus) return;
    
    if (document.hidden) {
      const notification = GAME_NOTIFICATIONS.phaseChange(newStatus, game.code);
      sendNotification(notification);
    }
    
    previousStatusRef.current = newStatus;
  }, [permission, game.code, sendNotification]);

  // Keep ref updated
  const notifyPhaseChangeRef = useRef(notifyPhaseChange);
  useEffect(() => {
    notifyPhaseChangeRef.current = notifyPhaseChange;
  }, [notifyPhaseChange]);

  // Fetch fresh game data
  const refetchGame = useCallback(async () => {
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
          created_at,
          mission_points
        )
      `)
      .eq('id', game.id)
      .single();

    if (data) {
      onGameUpdate(data as GameWithPlayers);
    }
  }, [game.id, supabase, onGameUpdate]);

  // Keep game ref up to date for use in callbacks
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Realtime subscription for players and game changes
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
        () => {
          refetchGame();
          onPlayersChange?.(); // Notify for shop/wallet refresh
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
          // Merge new game data with existing (keep players from current state)
          const updatedGame = { ...gameRef.current, ...payload.new } as GameWithPlayers;
          onGameUpdate(updatedGame);
          
          const newStatus = payload.new.status as string;
          notifyPhaseChangeRef.current(newStatus);
          
          // Refresh on game start to get roles
          if (payload.new.status !== 'lobby') {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase, router, onGameUpdate, refetchGame]);

  // iOS PWA fix: refresh on visibility change
  // When app returns to foreground, WebSocket may be stale
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[iOS PWA] App returned to foreground, refetching...');
        refetchGame();
        onPlayersChange?.(); // Also refresh shop/wallet
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchGame, onPlayersChange]);

  return { refetchGame };
}
