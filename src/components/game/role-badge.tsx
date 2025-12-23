'use client';

import { getRoleConfig, type RoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  roleId: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showDescription?: boolean;
  revealed?: boolean; // If false, show as hidden
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-20 h-20 text-4xl',
};

const nameSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function RoleBadge({
  roleId,
  size = 'md',
  showName = false,
  showDescription = false,
  revealed = true,
  className,
}: RoleBadgeProps) {
  const config = getRoleConfig(roleId);

  if (!revealed) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <div
          className={cn(
            'rounded-full flex items-center justify-center',
            'bg-slate-700 border-2 border-slate-600',
            sizeClasses[size]
          )}
        >
          <span className="select-none">❓</span>
        </div>
        {showName && (
          <span className={cn('text-slate-400', nameSizeClasses[size])}>
            ???
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          'border-2 border-current/30',
          sizeClasses[size],
          config.assets.bgColor,
          config.assets.color
        )}
        title={config.displayName}
      >
        <span className="select-none">{config.assets.icon}</span>
      </div>
      {showName && (
        <span className={cn('font-medium', nameSizeClasses[size], config.assets.color)}>
          {config.displayName}
        </span>
      )}
      {showDescription && (
        <span className="text-xs text-slate-400 text-center max-w-[150px]">
          {config.shortDescription}
        </span>
      )}
    </div>
  );
}

// Card variant for displaying role in detail
interface RoleCardProps {
  roleId: string;
  revealed?: boolean;
  className?: string;
}

export function RoleCard({ roleId, revealed = true, className }: RoleCardProps) {
  const config = getRoleConfig(roleId);

  if (!revealed) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl bg-slate-800/50 border border-slate-700',
          'flex flex-col items-center gap-4',
          className
        )}
      >
        <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-5xl">
          ❓
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-400">Rôle inconnu</h3>
          <p className="text-sm text-slate-500 mt-2">
            Ton rôle sera révélé au début de la partie
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border',
        'flex flex-col items-center gap-4',
        config.assets.bgColor,
        'border-current/20',
        config.assets.color,
        className
      )}
    >
      <div
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center text-5xl',
          'bg-slate-900/50 border-2 border-current/30'
        )}
      >
        {config.assets.icon}
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold">{config.displayName}</h3>
        <p className="text-sm opacity-80 mt-1">{config.shortDescription}</p>
        <p className="text-xs text-slate-300 mt-3 max-w-[250px]">
          {config.description}
        </p>
      </div>
    </div>
  );
}
