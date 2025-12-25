'use client';

/**
 * TipToast - Non-intrusive tip notification
 * Shows once per tip, dismissable, stored in localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { TIPS, isTipDismissed, dismissTip } from '@/lib/help/tips';

interface TipToastProps {
  tipId: string;
  show: boolean;
  onDismiss?: () => void;
}

export function TipToast({ tipId, show, onDismiss }: TipToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isTipDismissed(tipId));

  const tip = TIPS[tipId];

  // Animation delay effect - only runs when we should show
  useEffect(() => {
    if (show && !isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, isDismissed]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    dismissTip(tipId);
    setIsDismissed(true);
    onDismiss?.();
  }, [tipId, onDismiss]);

  if (!tip || isDismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-sm w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0">{tip.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200">{tip.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to manage tips display for a specific tip
 */
export function useTip(tipId: string, condition: boolean = true) {
  const [isDismissed, setIsDismissed] = useState(() => isTipDismissed(tipId));
  const shouldShow = condition && !isDismissed;

  const dismiss = useCallback(() => {
    dismissTip(tipId);
    setIsDismissed(true);
  }, [tipId]);

  return { shouldShow, dismiss };
}

/**
 * Hook to manage contextual tips based on game phase
 * Returns the most relevant tip that hasn't been dismissed yet
 */
export function useGameTips(
  phase: string,
  _roleName?: string,
  isWolf?: boolean,
  isSeer?: boolean,
  isLittleGirl?: boolean,
  isWitch?: boolean,
  // isHunter reserved for future hunter tips
) {
  const [version, setVersion] = useState(0);

  // Compute current tip - re-runs when version changes (after dismiss)
  const getCurrentTipId = useCallback((): string | null => {
    // Priority-ordered tips based on context
    if (phase === 'lobby' && !isTipDismissed('welcome')) return 'welcome';
    if (phase === 'conseil' && !isTipDismissed('first_vote')) return 'first_vote';
    if (isWolf && !isTipDismissed('wolf_chat')) return 'wolf_chat';
    if (isSeer && phase === 'nuit' && !isTipDismissed('seer_power')) return 'seer_power';
    if (isLittleGirl && !isTipDismissed('little_girl_spy')) return 'little_girl_spy';
    if (isWitch && phase === 'nuit' && !isTipDismissed('witch_potions')) return 'witch_potions';
    if (!isTipDismissed('phase_help')) return 'phase_help';
    if (!isTipDismissed('rules_available')) return 'rules_available';
    return null;
  }, [phase, isWolf, isSeer, isLittleGirl, isWitch]);

  // Re-compute on version change
  const currentTipId = getCurrentTipId();
  
  // Force re-render after version increment
  void version;

  const dismissCurrentTip = useCallback(() => {
    const tipId = getCurrentTipId();
    if (tipId) {
      dismissTip(tipId);
      setVersion(v => v + 1);
    }
  }, [getCurrentTipId]);

  return {
    currentTipId,
    currentTip: currentTipId ? TIPS[currentTipId] : null,
    dismissCurrentTip,
  };
}
