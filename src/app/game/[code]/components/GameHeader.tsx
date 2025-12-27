/**
 * GameHeader - Floating capsule header (Dynamic Island style)
 *
 * Y2K aesthetic with shake animation when time is urgent.
 * Uses GameContext for game state and TimerContext for timer values.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GamePhaseBadge } from '@/components/game';
import { useGame, useTimerContext } from '../context';
import { QuitGameButton } from './QuitGameButton';

interface GameHeaderProps {
  className?: string;
}

export function GameHeader({ className }: GameHeaderProps) {
  const { game, gameStatus, showTimer } = useGame();
  const { timeRemaining, isUrgent, isWarning, formattedTime } = useTimerContext();

  return (
    <header className={cn('mb-6 relative', className)}>
      {/* Quit Button */}
      <QuitGameButton />

      {/* Game Name - Y2K style */}
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black text-white text-center mb-4 tracking-tight"
        style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
      >
        {game.name}
      </motion.h1>

      {/* Floating Capsule - Dynamic Island style */}
      <motion.div 
        className="flex justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          className={cn(
            'inline-flex items-center gap-3 px-4 py-2 rounded-full',
            'border-2 border-white/20 backdrop-blur-md',
            'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
            isUrgent
              ? 'bg-red-950/80 border-red-500/50'
              : isWarning
                ? 'bg-amber-950/80 border-amber-500/30'
                : 'bg-zinc-900/80'
          )}
          animate={isUrgent ? {
            x: [-2, 2, -2, 2, 0],
          } : {}}
          transition={isUrgent ? {
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 0.5,
          } : {}}
        >
          {/* Phase Badge */}
          <GamePhaseBadge
            status={gameStatus as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee'}
            showHelp
            className="!bg-transparent !border-0 !shadow-none !p-0"
          />

          {/* Divider */}
          {showTimer && timeRemaining !== null && (
            <div className="w-px h-5 bg-white/20" />
          )}

          {/* Timer */}
          <AnimatePresence mode="wait">
            {showTimer && timeRemaining !== null && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'font-mono text-base font-bold flex items-center gap-1.5',
                  isUrgent
                    ? 'text-red-400'
                    : isWarning
                      ? 'text-amber-400'
                      : 'text-white'
                )}
              >
                <motion.span 
                  className="text-sm"
                  animate={isUrgent ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  ⏱
                </motion.span>
                <span>{formattedTime}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Time expired warning - Sticker style */}
      <AnimatePresence>
        {showTimer && timeRemaining === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'mt-4 mx-auto w-fit px-4 py-2 rounded-xl',
              'bg-red-600 border-2 border-white text-white font-bold text-sm',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]'
            )}
          >
            ⏰ Temps écoulé !
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
