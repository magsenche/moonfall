'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'moonfall_onboarding_seen';

interface Tip {
  id: string;
  icon: string;
  title: string;
  description: string;
  showOn: 'home' | 'lobby' | 'both';
}

const TIPS: Tip[] = [
  {
    id: 'pwa-ios',
    icon: '📲',
    title: 'Ajoute l\'app sur ton iPhone',
    description: 'Clique sur "Partager" ⬆️ puis "Sur l\'écran d\'accueil" pour recevoir les notifications et jouer en plein écran.',
    showOn: 'home',
  },
  {
    id: 'auto-garou',
    icon: '🤖',
    title: 'Mode Auto-Garou activé',
    description: 'Tout le monde joue, même le créateur ! Les phases avancent automatiquement. Pour un MJ dédié, désactive dans les paramètres.',
    showOn: 'lobby',
  },
  {
    id: 'share-code',
    icon: '📋',
    title: 'Partage le code',
    description: 'Clique sur le code pour le copier et l\'envoyer à tes amis !',
    showOn: 'lobby',
  },
];

// Detect iOS
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('standalone' in window.navigator && window.navigator.standalone);
}

// Detect if already installed as PWA
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
}

// Custom hook to sync with localStorage using useSyncExternalStore
function useSeenTips() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '[]';
    } catch {
      return '[]';
    }
  }, []);

  const getServerSnapshot = useCallback(() => '[]', []);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  const seenTips: string[] = JSON.parse(stored);
  
  const markAsSeen = useCallback((tipIds: string[]) => {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = [...new Set([...current, ...tipIds])];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch storage event to trigger re-render
    window.dispatchEvent(new Event('storage'));
  }, []);

  return { seenTips, markAsSeen };
}

interface OnboardingTooltipsProps {
  location: 'home' | 'lobby';
  className?: string;
}

export function OnboardingTooltips({ location, className }: OnboardingTooltipsProps) {
  const { seenTips, markAsSeen } = useSeenTips();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Filter tips based on location and what's been seen
  const availableTips = TIPS.filter((tip) => {
    // Filter by location
    if (tip.showOn !== 'both' && tip.showOn !== location) return false;
    
    // Don't show iOS tip if not on iOS or already standalone
    if (tip.id === 'pwa-ios' && (!isIOS() || isStandalone())) return false;
    
    // Don't show if already seen
    if (seenTips.includes(tip.id)) return false;
    
    return true;
  });

  // Show tooltip after a short delay
  useEffect(() => {
    if (availableTips.length === 0) {
      return;
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [availableTips.length]);

  const currentTip = availableTips[currentTipIndex];

  const dismissTip = () => {
    if (!currentTip) return;
    
    markAsSeen([currentTip.id]);
    
    // Move to next tip or hide
    if (currentTipIndex < availableTips.length - 1) {
      setCurrentTipIndex(currentTipIndex + 1);
    } else {
      setIsVisible(false);
    }
  };

  const dismissAll = () => {
    const allTipIds = availableTips.map((t) => t.id);
    markAsSeen(allTipIds);
    setIsVisible(false);
  };

  if (!currentTip || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          'fixed bottom-4 left-4 right-4 z-50',
          'max-w-md mx-auto',
          className
        )}
      >
        <div
          className={cn(
            'bg-zinc-800/95 backdrop-blur-sm',
            'border-2 border-indigo-500/50',
            'rounded-2xl p-4',
            'shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="text-3xl">{currentTip.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm">{currentTip.title}</h4>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                {currentTip.description}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={dismissTip}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full',
                'bg-slate-700/50 hover:bg-slate-600/50',
                'text-slate-400 hover:text-white transition-colors'
              )}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {availableTips.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === currentTipIndex ? 'bg-indigo-400' : 'bg-slate-600'
                  )}
                />
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {availableTips.length > 1 && (
                <button
                  onClick={dismissAll}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Tout masquer
                </button>
              )}
              <button
                onClick={dismissTip}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium',
                  'bg-indigo-600 hover:bg-indigo-500 text-white',
                  'transition-colors'
                )}
              >
                {currentTipIndex < availableTips.length - 1 ? 'Suivant' : 'Compris !'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Reset helper (for testing)
export function resetOnboarding() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  }
}
