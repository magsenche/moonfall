/**
 * WolfChatPanel - Wolf pack private chat
 * Y2K Sticker aesthetic
 * Supports read-only mode for Petite Fille role
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
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
    <MotionCard 
      variant="sticker" 
      rotation={readOnly ? 0.5 : -0.5}
      className={cn(
        "mb-6",
        readOnly ? "border-rose-500/50" : "border-red-500/50"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className={cn(
          "text-lg flex items-center gap-2",
          readOnly ? "text-rose-400" : "text-red-400"
        )}>
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {readOnly ? '👧' : '💬'}
          </motion.span>
          {readOnly ? 'Écoute de la Meute' : 'Chat de la Meute'}
        </CardTitle>
        {readOnly && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium",
              "bg-rose-900/50 border border-rose-500/50 text-rose-300"
            )}
          >
            🤫 Tu espionnes les loups... reste discrète !
          </motion.p>
        )}
      </CardHeader>
      <CardContent>
        {/* Messages */}
        <div className={cn(
          "h-48 overflow-y-auto mb-4 space-y-2 p-3 rounded-xl",
          "bg-zinc-900/80 border border-zinc-700/50"
        )}>
          {messages.length === 0 ? (
            <p className="text-slate-500 text-center text-sm py-8">
              Aucun message. Commencez à discuter...
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isOwn = msg.player?.id === currentPlayerId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 rounded-xl max-w-[85%] border",
                      "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                      readOnly
                        ? "bg-zinc-800 border-zinc-600/50" // All messages look the same for Petite Fille
                        : isOwn
                          ? "bg-red-900/40 border-red-500/50 ml-auto"
                          : "bg-zinc-800 border-zinc-600/50"
                    )}
                  >
                    {/* Hide wolf pseudo from Petite Fille */}
                    {!readOnly && !isOwn && (
                      <p className="text-xs text-red-400 font-bold mb-1">
                        🐺 {msg.player?.pseudo}
                      </p>
                    )}
                    {readOnly && (
                      <p className="text-xs text-rose-400/60 font-medium mb-1">
                        🐺 ???
                      </p>
                    )}
                    <p className="text-white text-sm">{msg.message}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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
              className={cn(
                "flex-1 px-4 py-3 rounded-xl text-white text-sm",
                "bg-zinc-800 border-2 border-zinc-600",
                "focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500",
                "placeholder:text-slate-500"
              )}
              disabled={isSendingMessage}
            />
            <MotionButton
              type="submit"
              variant="sticker"
              className="bg-red-600 border-red-400 px-4"
              disabled={!newMessage.trim() || isSendingMessage}
            >
              {isSendingMessage ? '...' : '➤'}
            </MotionButton>
          </form>
        )}
      </CardContent>
    </MotionCard>
  );
}
