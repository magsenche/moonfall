/**
 * WolfChatPanel - Wolf pack private chat
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
}

export function WolfChatPanel({
  messages,
  newMessage,
  isSendingMessage,
  currentPlayerId,
  isAlive,
  onMessageChange,
  onSendMessage,
}: WolfChatPanelProps) {
  return (
    <Card className="mb-6 border border-red-500/20">
      <CardHeader>
        <CardTitle className="text-red-400 text-lg">💬 Chat de la Meute</CardTitle>
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

        {/* Input */}
        {isAlive && (
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
