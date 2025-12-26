'use client';

import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'sticker';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800/50 border border-slate-700',
      glass: 'bg-slate-800/30 backdrop-blur-lg border border-slate-700/50',
      sticker: 'bg-zinc-800 border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl p-6',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Motion Card with Y2K hover effects
export interface MotionCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'glass' | 'sticker';
  rotation?: number;
  children: React.ReactNode;
}

const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, variant = 'sticker', rotation = 0, children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800/50 border border-slate-700',
      glass: 'bg-slate-800/30 backdrop-blur-lg border border-slate-700/50',
      sticker: 'bg-zinc-800 border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ rotate: rotation }}
        whileHover={{ rotate: 0, scale: 1.02, boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.5)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'rounded-2xl p-6',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-bold text-white', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-slate-400 mt-1', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, MotionCard, CardHeader, CardTitle, CardDescription, CardContent };
