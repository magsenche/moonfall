'use client';

/**
 * Y2K Motion Components - Animation utilities for the sticker/scrapbook aesthetic
 * 
 * This module provides reusable animation wrappers using framer-motion.
 * All interactive elements should use these for consistent haptic feedback.
 */

import { motion, type HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef, type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

export const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Shake animation for urgency (timer < 10s)
export const shakeVariant = {
  shake: {
    x: [-2, 2, -2, 2, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Bouncy Button - Tactile feedback on all interactions
// ─────────────────────────────────────────────────────────────────────────────

interface BouncyButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export const BouncyButton = forwardRef<HTMLButtonElement, BouncyButtonProps>(
  ({ children, className, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
);
BouncyButton.displayName = 'BouncyButton';

// ─────────────────────────────────────────────────────────────────────────────
// FadeIn Wrapper - Simple fade + slide in animation
// ─────────────────────────────────────────────────────────────────────────────

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 20, 
        delay 
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = 'FadeIn';

// ─────────────────────────────────────────────────────────────────────────────
// Sticker Wrapper - Y2K sticker aesthetic with rotation & shadow
// ─────────────────────────────────────────────────────────────────────────────

interface StickerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  rotation?: number;
  hoverRotation?: number;
}

export const Sticker = forwardRef<HTMLDivElement, StickerProps>(
  ({ children, className, rotation = 1, hoverRotation = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ rotate: rotation }}
      whileHover={{ rotate: hoverRotation, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]',
        'bg-zinc-800 transition-shadow hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
);
Sticker.displayName = 'Sticker';

// ─────────────────────────────────────────────────────────────────────────────
// Floating Element - Slow random float animation for backgrounds
// ─────────────────────────────────────────────────────────────────────────────

interface FloatingProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  duration?: number;
  delay?: number;
}

export const Floating = forwardRef<HTMLDivElement, FloatingProps>(
  ({ children, className, duration = 6, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={{
        y: [0, -15, 0],
        rotate: [0, 3, -3, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
Floating.displayName = 'Floating';

// ─────────────────────────────────────────────────────────────────────────────
// Stagger Container - For animating lists of items
// ─────────────────────────────────────────────────────────────────────────────

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerContainer.displayName = 'StaggerContainer';

// ─────────────────────────────────────────────────────────────────────────────
// Stagger Item - Individual items in a staggered list
// ─────────────────────────────────────────────────────────────────────────────

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = 'StaggerItem';

// Re-export AnimatePresence for convenience
export { AnimatePresence, motion };
