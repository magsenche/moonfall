/**
 * MissionsSection - Missions display and management
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { MissionForm, MissionCard } from '@/components/game';
import type { Mission, PartialPlayer } from '../hooks/types';

interface MissionsSectionProps {
  missions: Mission[];
  players: PartialPlayer[];
  currentPlayerId: string | null;
  isMJ: boolean;
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
  showMissionForm,
  gameCode,
  onShowMissionForm,
  onMissionCreated,
  onMissionUpdate,
}: MissionsSectionProps) {
  return (
    <Card className="mb-6 border border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-amber-400">
          <span>📋 Missions</span>
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
              onMissionCreated={() => {
                onShowMissionForm(false);
                onMissionCreated();
              }}
              onCancel={() => onShowMissionForm(false)}
            />
          </div>
        )}

        {/* Missions List */}
        {missions.length === 0 ? (
          <p className="text-center text-slate-500 py-4">
            Aucune mission pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => (
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
