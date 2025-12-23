'use client';

import { getDefaultAvatar, getDefaultColor } from '@/config/players';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  playerId: string;
  pseudo: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  isAlive?: boolean;
  isMj?: boolean;
  className?: string;
  // Future: customization props
  // customAvatar?: string;
  // customColor?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
};

const nameSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function PlayerAvatar({
  playerId,
  pseudo,
  size = 'md',
  showName = false,
  isAlive = true,
  isMj = false,
  className,
}: PlayerAvatarProps) {
  const avatar = getDefaultAvatar(playerId);
  const color = getDefaultColor(playerId);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          'border-2 transition-all',
          sizeClasses[size],
          color.class,
          isAlive ? 'opacity-100' : 'opacity-50 grayscale',
          isMj ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : ''
        )}
        title={pseudo}
      >
        <span className="select-none">{avatar}</span>
      </div>
      {showName && (
        <span
          className={cn(
            'font-medium truncate max-w-[80px]',
            nameSizeClasses[size],
            isAlive ? 'text-slate-200' : 'text-slate-500 line-through'
          )}
        >
          {pseudo}
          {isMj && ' 👑'}
        </span>
      )}
    </div>
  );
}
