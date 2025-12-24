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
}

export function useWolfChat({
  gameId,
  gameCode,
  gameStatus,
  currentPlayerId,
  isWolf,
}: UseWolfChatOptions) {
  const supabase = createClient();
  
  const [wolfMessages, setWolfMessages] = useState<WolfMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Fetch wolf messages
  const fetchWolfMessages = useCallback(async () => {
    if (!isWolf) return;
    
    try {
      const data = await getWolfChat(gameCode);
      setWolfMessages(data.messages);
    } catch (err) {
      console.error('Fetch wolf messages error:', err);
    }
  }, [gameCode, isWolf]);

  // Send wolf message
  const sendWolfMessage = useCallback(async () => {
    if (!currentPlayerId || !newMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      await apiSendWolfMessage(gameCode, currentPlayerId, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err instanceof ApiError ? err.message : err);
    } finally {
      setIsSendingMessage(false);
    }
  }, [currentPlayerId, newMessage, gameCode]);

  // Realtime subscription for wolf chat
  useEffect(() => {
    // Only subscribe if game is in progress and player is wolf
    if (gameStatus === 'lobby' || gameStatus === 'terminee' || !isWolf) return;

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
  }, [gameId, gameStatus, isWolf, supabase, fetchWolfMessages]);

  return {
    wolfMessages,
    newMessage,
    isSendingMessage,
    setNewMessage,
    sendWolfMessage,
  };
}
