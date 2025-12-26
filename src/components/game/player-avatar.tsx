'use client';

/**
 * PlayerAvatar - Y2K Sticker-style player avatar
 * 
 * Features:
 * - Thick white border with hard shadow
 * - Dead state with "MORT" overlay (no grayscale)
 * - MJ crown indicator
 */

import { motion } from 'framer-motion';
import { getDefaultAvatar, getDefaultColor } from '@/config/players';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  playerId: string;
  pseudo: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  isAlive?: boolean;
  isMj?: boolean;
  className?: string;
  showDeadSticker?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-xl',
  md: 'w-14 h-14 text-2xl',
  lg: 'w-18 h-18 text-4xl',
  xl: 'w-24 h-24 text-5xl',
};

const nameSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

const shadowSizes = {
  sm: 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]',
  md: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
  lg: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
  xl: 'shadow-[5px_5px_0px_0px_rgba(0,0,0,0.5)]',
};

export function PlayerAvatar({
  playerId,
  pseudo,
  size = 'md',
  showName = false,
  isAlive = true,
  isMj = false,
  className,
  showDeadSticker = true,
}: PlayerAvatarProps) {
  const avatar = getDefaultAvatar(playerId);
  const color = getDefaultColor(playerId);

  return (
    <motion.div 
      className={cn('relative flex flex-col items-center gap-1.5', className)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Avatar Circle - Sticker style */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center',
          'border-2 border-white transition-all',
          sizeClasses[size],
          shadowSizes[size],
          color.class,
          !isAlive && 'opacity-70'
        )}
        title={pseudo}
      >
        <span className="select-none">{avatar}</span>
        
        {/* MJ Crown */}
        {isMj && (
          <motion.span 
            className="absolute -top-2 -right-1 text-base"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
          >
            👑
          </motion.span>
        )}
      </div>
      
      {/* Dead Sticker Overlay */}
      {!isAlive && showDeadSticker && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -10 }}
          className={cn(
            'absolute -top-1 -right-2 px-1.5 py-0.5 rounded-md',
            'bg-red-600 border-2 border-white text-white',
            'text-[8px] font-black uppercase tracking-wider',
            'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
          )}
        >
          MORT
        </motion.div>
      )}
      
      {/* Name Label */}
      {showName && (
        <span
          className={cn(
            'font-bold truncate max-w-[80px] text-center',
            nameSizeClasses[size],
            isAlive ? 'text-white' : 'text-slate-500'
          )}
        >
          {pseudo}
        </span>
      )}
    </motion.div>
  );
}
