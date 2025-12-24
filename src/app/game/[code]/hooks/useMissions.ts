/**
 * useMissions - Mission system logic
 * 
 * Handles:
 * - Fetching missions for a game
 * - Creating missions (MJ)
 * - Updating mission status (MJ)
 * - Realtime subscription for mission changes
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMissions, updateMission, ApiError } from '@/lib/api';
import type { Mission } from './types';

interface UseMissionsOptions {
  gameId: string;
  gameCode: string;
  gameStatus: string;
  currentPlayerId: string | null;
}

export function useMissions({
  gameId,
  gameCode,
  gameStatus,
  currentPlayerId,
}: UseMissionsOptions) {
  const supabase = createClient();
  
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [newMission, setNewMission] = useState({ 
    title: '', 
    description: '', 
    assignedToMultiple: [] as string[] 
  });
  const [isCreatingMission, setIsCreatingMission] = useState(false);

  // Fetch missions
  const fetchMissions = useCallback(async () => {
    try {
      const data = await getMissions(gameCode);
      setMissions(data.missions as Mission[]);
    } catch (err) {
      console.error('Fetch missions error:', err);
    }
  }, [gameCode]);

  // Create mission (MJ only)
  const createMission = useCallback(async () => {
    if (!currentPlayerId || !newMission.title || !newMission.description) return;
    
    setIsCreatingMission(true);
    try {
      const response = await fetch(`/api/games/${gameCode}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMission.title,
          description: newMission.description,
          assignedToMultiple: newMission.assignedToMultiple.length > 0 
            ? newMission.assignedToMultiple 
            : undefined,
          creatorId: currentPlayerId,
        }),
      });
      if (response.ok) {
        setNewMission({ title: '', description: '', assignedToMultiple: [] });
        setShowMissionForm(false);
        fetchMissions();
      }
    } catch (err) {
      console.error('Create mission error:', err);
    } finally {
      setIsCreatingMission(false);
    }
  }, [currentPlayerId, newMission, gameCode, fetchMissions]);

  // Update mission status (MJ only)
  const updateMissionStatus = useCallback(async (
    missionId: string, 
    action: 'validate' | 'fail' | 'cancel'
  ) => {
    if (!currentPlayerId) return;
    
    try {
      await updateMission(gameCode, missionId, {
        status: action === 'validate' ? 'success' : action === 'fail' ? 'failed' : 'cancelled',
        validatorId: currentPlayerId,
      });
      fetchMissions();
    } catch (err) {
      console.error('Update mission error:', err instanceof ApiError ? err.message : err);
    }
  }, [currentPlayerId, gameCode, fetchMissions]);

  // Fetch missions on game start + realtime subscription
  useEffect(() => {
    if (gameStatus === 'lobby') return;
    
    fetchMissions();

    const missionChannel = supabase
      .channel(`missions:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions',
          filter: `game_id=eq.${gameId}`,
        },
        () => fetchMissions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
        },
        () => fetchMissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(missionChannel);
    };
  }, [gameStatus, gameId, supabase, fetchMissions]);

  return {
    // State
    missions,
    showMissionForm,
    newMission,
    isCreatingMission,
    
    // Actions
    setShowMissionForm,
    setNewMission,
    fetchMissions,
    createMission,
    updateMissionStatus,
  };
}
