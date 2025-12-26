'use client';

/**
 * MissionsDrawer - Floating button + drawer for missions
 * Similar to RulesButton but for missions with badge count
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { MissionForm, MissionCard } from '@/components/game';
import { cn } from '@/lib/utils';
import type { Mission } from '@/app/game/[code]/hooks/types';

type MissionFilter = 'active' | 'completed' | 'all';

interface PartialPlayer {
  id: string;
  pseudo: string;
  is_alive?: boolean | null;
  is_mj?: boolean | null;
}

interface MissionsDrawerProps {
  missions: Mission[];
  players: PartialPlayer[];
  currentPlayerId: string | null;
  isMJ: boolean;
  isAutoMode?: boolean;
  gameCode: string;
  onMissionCreated: () => void;
  onMissionUpdate: () => void;
}

export function MissionsDrawer({
  missions,
  players,
  currentPlayerId,
  isMJ,
  isAutoMode = false,
  gameCode,
  onMissionCreated,
  onMissionUpdate,
}: MissionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [filter, setFilter] = useState<MissionFilter>('active');

  // Count missions
  const counts = useMemo(() => {
    const active = missions.filter(m => ['pending', 'in_progress'].includes(m.status)).length;
    const myActive = missions.filter(m => 
      ['pending', 'in_progress'].includes(m.status) &&
      m.assigned_players?.some(ap => ap.id === currentPlayerId)
    ).length;
    const completed = missions.filter(m => ['success', 'failed', 'cancelled'].includes(m.status)).length;
    return { active, myActive, completed, total: missions.length };
  }, [missions, currentPlayerId]);

  // Filter and sort missions
  const filteredMissions = useMemo(() => {
    let result = [...missions];
    
    if (filter === 'active') {
      result = result.filter(m => ['pending', 'in_progress'].includes(m.status));
    } else if (filter === 'completed') {
      result = result.filter(m => ['success', 'failed', 'cancelled'].includes(m.status));
    }
    
    // Sort: my missions first, then in_progress, then by deadline
    result.sort((a, b) => {
      // My missions first
      const aIsMine = a.assigned_players?.some(ap => ap.id === currentPlayerId) ? 0 : 1;
      const bIsMine = b.assigned_players?.some(ap => ap.id === currentPlayerId) ? 0 : 1;
      if (aIsMine !== bIsMine) return aIsMine - bIsMine;
      
      // Status priority
      const statusOrder: Record<string, number> = {
        'in_progress': 0, 'pending': 1, 'success': 2, 'failed': 3, 'cancelled': 4,
      };
      const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (statusDiff !== 0) return statusDiff;
      
      // Deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return a.deadline ? -1 : b.deadline ? 1 : 0;
    });
    
    return result;
  }, [missions, filter, currentPlayerId]);

  // Handle escape key
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

  const filterButtons: { key: MissionFilter; label: string; count: number }[] = [
    { key: 'active', label: 'En cours', count: counts.active },
    { key: 'completed', label: 'Terminées', count: counts.completed },
    { key: 'all', label: 'Toutes', count: counts.total },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-30 w-12 h-12 flex items-center justify-center bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border border-amber-500/50 rounded-full shadow-lg transition-colors touch-manipulation text-xl"
        aria-label="Missions"
        title="Missions"
      >
        📋
        {/* Badge with count */}
        {counts.active > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1',
            'min-w-5 h-5 px-1 flex items-center justify-center',
            'text-xs font-bold rounded-full',
            counts.myActive > 0 
              ? 'bg-red-500 text-white' 
              : 'bg-amber-400 text-amber-900'
          )}>
            {counts.myActive > 0 ? counts.myActive : counts.active}
          </span>
        )}
      </button>

      {/* Drawer Modal */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'w-full sm:max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh]',
                'flex flex-col',
                'bg-zinc-900 border-t sm:border border-amber-500/30',
                'rounded-t-2xl sm:rounded-2xl shadow-2xl'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-zinc-700 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>📋</span> Missions
                  {counts.myActive > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full">
                      {counts.myActive} pour toi
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {isMJ && !showMissionForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMissionForm(true)}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      + Nouvelle
                    </Button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                    aria-label="Fermer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              {missions.length > 0 && (
                <div className="flex gap-1 p-3 border-b border-zinc-800">
                  {filterButtons.map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={cn(
                        'flex-1 px-3 py-2 text-xs rounded-lg transition-colors',
                        filter === key
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700'
                      )}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Mission Form */}
                {isMJ && showMissionForm && currentPlayerId && (
                  <div className="mb-4">
                    <MissionForm
                      gameCode={gameCode}
                      players={players.map(p => ({
                        id: p.id,
                        pseudo: p.pseudo,
                        is_alive: p.is_alive ?? true,
                        is_mj: p.is_mj ?? false,
                      }))}
                      creatorId={currentPlayerId}
                      isAutoMode={isAutoMode}
                      onMissionCreated={() => {
                        setShowMissionForm(false);
                        onMissionCreated();
                      }}
                      onCancel={() => setShowMissionForm(false)}
                    />
                  </div>
                )}

                {/* Missions List */}
                {filteredMissions.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">📭</span>
                    <p className="text-slate-500">
                      {filter === 'active' && missions.length > 0
                        ? 'Aucune mission en cours'
                        : filter === 'completed' && missions.length > 0
                        ? 'Aucune mission terminée'
                        : 'Pas encore de missions'}
                    </p>
                    {missions.length === 0 && isMJ && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowMissionForm(true)}
                        className="mt-4"
                      >
                        Créer une mission
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        currentPlayerId={currentPlayerId || ''}
                        isMJ={isMJ}
                        isAutoMode={isAutoMode}
                        gameCode={gameCode}
                        onUpdate={onMissionUpdate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
