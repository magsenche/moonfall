/**
 * MissionsSection - Missions display and management
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { MissionForm, MissionCard } from '@/components/game';
import type { Mission, PartialPlayer } from '../hooks/types';

type MissionFilter = 'active' | 'completed' | 'all';

interface MissionsSectionProps {
  missions: Mission[];
  players: PartialPlayer[];
  currentPlayerId: string | null;
  isMJ: boolean;
  isAutoMode?: boolean;
  showMissionForm: boolean;
  gameCode: string;
  onShowMissionForm: (show: boolean) => void;
  onMissionCreated: () => void;
  onMissionUpdate: () => void;
}

export function MissionsSection({
  missions,
  players,
  currentPlayerId,
  isMJ,
  isAutoMode = false,
  showMissionForm,
  gameCode,
  onShowMissionForm,
  onMissionCreated,
  onMissionUpdate,
}: MissionsSectionProps) {
  const [filter, setFilter] = useState<MissionFilter>('active');

  // Count missions by status
  const counts = useMemo(() => {
    const active = missions.filter(m => ['pending', 'in_progress'].includes(m.status)).length;
    const completed = missions.filter(m => ['success', 'failed', 'cancelled'].includes(m.status)).length;
    return { active, completed, total: missions.length };
  }, [missions]);

  // Filter and sort missions
  const filteredMissions = useMemo(() => {
    let result = [...missions];
    
    // Filter by status
    if (filter === 'active') {
      result = result.filter(m => ['pending', 'in_progress'].includes(m.status));
    } else if (filter === 'completed') {
      result = result.filter(m => ['success', 'failed', 'cancelled'].includes(m.status));
    }
    
    // Sort: in_progress first, then by deadline (urgent first)
    result.sort((a, b) => {
      // Status priority: in_progress > pending > others
      const statusOrder: Record<string, number> = {
        'in_progress': 0,
        'pending': 1,
        'success': 2,
        'failed': 3,
        'cancelled': 4,
      };
      const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (statusDiff !== 0) return statusDiff;
      
      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      
      return 0;
    });
    
    return result;
  }, [missions, filter]);

  const filterButtons: { key: MissionFilter; label: string; count: number }[] = [
    { key: 'active', label: '🔥 En cours', count: counts.active },
    { key: 'completed', label: '✅ Terminées', count: counts.completed },
    { key: 'all', label: '📋 Toutes', count: counts.total },
  ];

  return (
    <Card className="mb-6 border border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-amber-400">
          <span className="flex items-center gap-2">
            📋 Missions
            {counts.active > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full">
                {counts.active} en cours
              </span>
            )}
          </span>
          {isMJ && !showMissionForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShowMissionForm(true)}
              className="text-amber-400 hover:text-amber-300"
            >
              + Nouvelle
            </Button>
          )}
        </CardTitle>
        
        {/* Filter tabs */}
        {missions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {filterButtons.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === key
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Advanced Mission Form (MJ only) */}
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
                onShowMissionForm(false);
                onMissionCreated();
              }}
              onCancel={() => onShowMissionForm(false)}
            />
          </div>
        )}

        {/* Missions List */}
        {filteredMissions.length === 0 ? (
          <p className="text-center text-slate-500 py-4">
            {filter === 'active' && missions.length > 0
              ? 'Aucune mission en cours'
              : filter === 'completed' && missions.length > 0
              ? 'Aucune mission terminée'
              : 'Aucune mission pour le moment'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                currentPlayerId={currentPlayerId || ''}
                isMJ={isMJ}
                gameCode={gameCode}
                onUpdate={onMissionUpdate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
