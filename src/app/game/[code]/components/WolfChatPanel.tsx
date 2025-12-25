/**
 * WolfChatPanel - Wolf pack private chat
 * Supports read-only mode for Petite Fille role
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { WolfMessage } from '../hooks/types';

interface WolfChatPanelProps {
  messages: WolfMessage[];
  newMessage: string;
  isSendingMessage: boolean;
  currentPlayerId: string | null;
  isAlive: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  readOnly?: boolean; // For Petite Fille - can read but not write
}

export function WolfChatPanel({
  messages,
  newMessage,
  isSendingMessage,
  currentPlayerId,
  isAlive,
  onMessageChange,
  onSendMessage,
  readOnly = false,
}: WolfChatPanelProps) {
  return (
    <Card className={cn(
      "mb-6 border",
      readOnly ? "border-rose-500/20" : "border-red-500/20"
    )}>
      <CardHeader>
        <CardTitle className={cn(
          "text-lg",
          readOnly ? "text-rose-400" : "text-red-400"
        )}>
          {readOnly ? '👧 Écoute de la Meute' : '💬 Chat de la Meute'}
        </CardTitle>
        {readOnly && (
          <p className="text-xs text-rose-300/70 mt-1">
            Tu espionnes les loups... reste discrète !
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Messages */}
        <div className="h-48 overflow-y-auto mb-4 space-y-2 p-2 bg-slate-900/50 rounded-lg">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-center text-sm py-8">
              Aucun message. Commencez à discuter...
            </p>
          ) : (
            messages.map((msg) => {
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

        {/* Input - Hidden for readOnly (Petite Fille) */}
        {isAlive && !readOnly && (
          <form
            onSubmit={(e) => { e.preventDefault(); onSendMessage(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
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
  );
}
