'use client';

/**
 * RoleDetailModal - Full-screen modal with detailed role information
 * Triggered when clicking on PlayerRoleCard
 */

import { useEffect, useCallback } from 'react';
import { getRoleDetail } from '@/lib/help/role-details';

interface RoleDetailModalProps {
  roleName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RoleDetailModal({ roleName, isOpen, onClose }: RoleDetailModalProps) {
  const roleDetail = getRoleDetail(roleName);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

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

  if (!isOpen || !roleDetail) return null;

  const teamColor = roleDetail.team === 'loups' 
    ? 'text-red-400' 
    : roleDetail.team === 'village' 
      ? 'text-blue-400' 
      : 'text-zinc-400';

  const teamBg = roleDetail.team === 'loups' 
    ? 'bg-red-500/10 border-red-500/30' 
    : roleDetail.team === 'village' 
      ? 'bg-blue-500/10 border-blue-500/30' 
      : 'bg-zinc-500/10 border-zinc-500/30';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-zinc-800 ${teamBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{roleDetail.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">{roleDetail.name}</h2>
                <p className={`text-sm font-medium ${teamColor}`}>{roleDetail.teamLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-zinc-300 leading-relaxed">{roleDetail.description}</p>
          </div>

          {/* Power */}
          {roleDetail.power && (
            <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                ⚡ Pouvoir
              </h3>
              <p className="text-zinc-200 whitespace-pre-line">{roleDetail.power}</p>
              {roleDetail.powerTiming && (
                <p className="mt-2 text-sm text-zinc-500">{roleDetail.powerTiming}</p>
              )}
            </div>
          )}

          {/* Objective */}
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              🎯 Objectif
            </h3>
            <p className="text-zinc-200">{roleDetail.objective}</p>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              💡 Conseils
            </h3>
            <ul className="space-y-2">
              {roleDetail.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-zinc-600 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl transition-colors"
          >
            Compris !
          </button>
        </div>
      </div>
    </div>
  );
}
