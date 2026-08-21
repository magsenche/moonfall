/**
 * useWolfChat - Wolf pack private chat
 * 
 * Handles:
 * - Fetching wolf messages
 * - Sending new messages
 * - Realtime subscription for new messages
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWolfChat, sendWolfMessage as apiSendWolfMessage, ApiError } from '@/lib/api';
import type { WolfMessage } from './types';

interface UseWolfChatOptions {
  gameId: string;
  gameCode: string;
  gameStatus: string;
  currentPlayerId: string | null;
  isWolf: boolean;
  isLittleGirl?: boolean;
  /** Spectateur mort : lecture seule du chat des loups */
  isGhost?: boolean;
}

export function useWolfChat({
  gameId,
  gameCode,
  gameStatus,
  currentPlayerId,
  isWolf,
  isLittleGirl = false,
  isGhost = false,
}: UseWolfChatOptions) {
  const supabase = createClient();
  
  // Le texte en cours de frappe vit dans WolfChatPanel : le hisser ici
  // (contexte global) faisait re-render tout l'écran à chaque caractère
  const [wolfMessages, setWolfMessages] = useState<WolfMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Can read wolf chat (wolf, little girl, or ghost spectator)
  const canReadWolfChat = isWolf || isLittleGirl || isGhost;

  // Fetch wolf messages
  const fetchWolfMessages = useCallback(async () => {
    if (!canReadWolfChat) return;
    
    try {
      const data = await getWolfChat(gameCode);
      setWolfMessages(data.messages);
    } catch (err) {
      console.error('Fetch wolf messages error:', err);
    }
  }, [gameCode, canReadWolfChat]);

  // Send wolf message — rend true si l'envoi a réussi (le panneau vide alors son champ)
  const sendWolfMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!currentPlayerId || !message.trim()) return false;

    setIsSendingMessage(true);
    try {
      await apiSendWolfMessage(gameCode, currentPlayerId, message.trim());
      return true;
    } catch (err) {
      console.error('Send message error:', err instanceof ApiError ? err.message : err);
      return false;
    } finally {
      setIsSendingMessage(false);
    }
  }, [currentPlayerId, gameCode]);

  // Realtime subscription for wolf chat
  useEffect(() => {
    // Only subscribe if game is in progress and player can read wolf chat
    if (gameStatus === 'lobby' || gameStatus === 'terminee' || !canReadWolfChat) return;

    // Initial fetch
    fetchWolfMessages();

    const chatChannel = supabase
      .channel(`wolf-chat:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wolf_chat',
          filter: `game_id=eq.${gameId}`,
        },
        () => fetchWolfMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [gameId, gameStatus, canReadWolfChat, supabase, fetchWolfMessages]);

  return {
    wolfMessages,
    isSendingMessage,
    sendWolfMessage,
  };
}
