'use client';

/**
 * PhaseHelpTooltip - Contextual help for game phases
 * Opens as a bottom sheet modal on mobile (more reliable than popover)
 */

import { useState, useEffect, useCallback } from 'react';
import { getPhaseDescription } from '@/lib/help/phase-descriptions';

interface PhaseHelpTooltipProps {
  phase: string;
}

export function PhaseHelpTooltip({ phase }: PhaseHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const phaseDesc = getPhaseDescription(phase);

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

  return (
    <>
      {/* Trigger button - touch-friendly size (44px) */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700 rounded-full transition-colors text-sm font-medium touch-manipulation"
        aria-label="Aide sur cette phase"
      >
        ?
      </button>

      {/* Bottom sheet modal - works great on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-zinc-900 border-t sm:border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            <div className="p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{phaseDesc.icon}</span>
                <div>
                  <h4 className="font-semibold text-zinc-100 text-lg">{phaseDesc.name}</h4>
                  <p className="text-xs text-zinc-500">Durée : {phaseDesc.duration}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{phaseDesc.longDescription}</p>

              {/* What to do */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Que faire ?</p>
                {phaseDesc.whatToDo.map((item, index) => (
                  <p key={index} className="text-sm text-zinc-300 pl-3 border-l-2 border-zinc-700">
                    {item}
                  </p>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="mt-5 w-full py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 rounded-xl transition-colors touch-manipulation"
              >
                Compris !
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
