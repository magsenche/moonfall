'use client';

/**
 * PhaseHelpTooltip - Contextual help tooltip for game phases
 * Shows explanation when clicking the ? icon next to phase badge
 */

import { useState, useRef, useEffect } from 'react';
import { getPhaseDescription } from '@/lib/help/phase-descriptions';

interface PhaseHelpTooltipProps {
  phase: string;
}

export function PhaseHelpTooltip({ phase }: PhaseHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const phaseDesc = getPhaseDescription(phase);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!phaseDesc) return null;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors text-sm"
        aria-label="Aide sur cette phase"
      >
        ?
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute right-0 top-full mt-2 w-72 p-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{phaseDesc.icon}</span>
            <h4 className="font-semibold text-zinc-100">{phaseDesc.name}</h4>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-400 mb-3">{phaseDesc.longDescription}</p>

          {/* What to do */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Que faire ?</p>
            {phaseDesc.whatToDo.map((item, index) => (
              <p key={index} className="text-sm text-zinc-300 pl-2 border-l-2 border-zinc-700">
                {item}
              </p>
            ))}
          </div>

          {/* Duration */}
          <p className="mt-3 text-xs text-zinc-600">
            Durée : {phaseDesc.duration}
          </p>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
