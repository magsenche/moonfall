'use client';

/**
 * PhaseHelpTooltip - Contextual help for game phases
 * Y2K Sticker aesthetic - Opens as a bottom sheet modal on mobile
 * Uses Portal to render modal at body level to avoid CSS containment issues
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getPhaseDescription } from '@/lib/help/phase-descriptions';

interface PhaseHelpTooltipProps {
  phase: string;
}

export function PhaseHelpTooltip({ phase }: PhaseHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const phaseDesc = getPhaseDescription(phase);

  // Wait for client mount before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!phaseDesc) return null;

  // Modal content - will be portaled to body
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal content */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-lg max-h-[85vh] overflow-y-auto',
              'bg-zinc-900 border-2 border-white/40',
              'rounded-2xl',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <motion.span 
                  className="text-4xl"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {phaseDesc.icon}
                </motion.span>
                <div>
                  <h4 className="font-black text-white text-xl" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
                    {phaseDesc.name}
                  </h4>
                  <span className={cn(
                    'inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    'bg-zinc-700 border border-zinc-500 text-slate-300'
                  )}>
                    ⏱ {phaseDesc.duration}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                {phaseDesc.longDescription}
              </p>

              {/* What to do */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Que faire ?
                </p>
                {phaseDesc.whatToDo.map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className={cn(
                      'text-sm text-white p-3 rounded-xl',
                      'bg-zinc-800 border border-zinc-700',
                      'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                    )}
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'mt-6 w-full py-3.5 rounded-xl font-bold text-white',
                  'bg-indigo-600 border-2 border-indigo-400',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]',
                  'active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.4)]',
                  'transition-all touch-manipulation'
                )}
              >
                ✓ Compris !
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger button - Y2K sticker style */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'w-7 h-7 flex items-center justify-center',
          'bg-white/20 border border-white/40 rounded-full',
          'text-white font-bold text-xs',
          'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]',
          'hover:bg-white/30 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]',
          'transition-all touch-manipulation'
        )}
        aria-label="Aide sur cette phase"
      >
        ?
      </motion.button>

      {/* Portal modal to body to escape CSS containment */}
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
