/**
 * QuitGameButton - Exit game with confirmation
 *
 * Floating button in top-left corner with Y2K styled confirmation modal.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function QuitGameButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQuit = () => {
    router.push('/');
  };

  return (
    <>
      {/* Quit Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowConfirm(true)}
        className={cn(
          'absolute left-0 top-0 z-20',
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-zinc-800/80 border border-white/20 backdrop-blur-md',
          'text-slate-400 hover:text-white hover:bg-zinc-700/80',
          'text-sm font-medium transition-colors',
          'shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
        )}
      >
        <span>←</span>
        <span className="hidden sm:inline">Quitter</span>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={cn(
                'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
                'w-[90%] max-w-sm p-6 rounded-2xl',
                'bg-zinc-900 border-2 border-white/20',
                'shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
              )}
            >
              <h3 className="text-xl font-bold text-white mb-3">
                Quitter la partie ?
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Tu pourras revenir plus tard depuis la page d&apos;accueil si la partie est toujours en cours.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConfirm(false)}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl font-medium',
                    'bg-zinc-800 border border-white/10 text-white',
                    'hover:bg-zinc-700 transition-colors'
                  )}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleQuit}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl font-medium',
                    'bg-red-600 border-2 border-white/20 text-white',
                    'hover:bg-red-500 transition-colors',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                  )}
                >
                  Quitter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
