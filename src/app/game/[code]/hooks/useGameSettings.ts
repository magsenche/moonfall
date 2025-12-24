/**
 * useGameSettings - MJ game settings management
 * 
 * Handles:
 * - Loading game settings from API
 * - Saving settings updates
 * - Roles distribution configuration
 */

import { useState, useCallback, useEffect } from 'react';
import type { GameSettings } from './types';
import { DEFAULT_GAME_SETTINGS } from './types';

interface UseGameSettingsOptions {
  gameCode: string;
  currentPlayerId: string | null;
  isMJ: boolean;
  gameStatus: string;
}

export function useGameSettings({
  gameCode,
  currentPlayerId,
  isMJ,
  gameStatus,
}: UseGameSettingsOptions) {
  const [showSettings, setShowSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load game settings
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameCode}/settings`);
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        setGameSettings({
          minPlayers: settings.minPlayers ?? DEFAULT_GAME_SETTINGS.minPlayers,
          maxPlayers: settings.maxPlayers ?? DEFAULT_GAME_SETTINGS.maxPlayers,
          nightDurationMinutes: settings.nightDurationMinutes ?? DEFAULT_GAME_SETTINGS.nightDurationMinutes,
          voteDurationMinutes: settings.voteDurationMinutes ?? DEFAULT_GAME_SETTINGS.voteDurationMinutes,
          councilIntervalMinutes: settings.councilIntervalMinutes ?? DEFAULT_GAME_SETTINGS.councilIntervalMinutes,
          rolesDistribution: settings.rolesDistribution ?? {},
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [gameCode]);

  // Save game settings
  const saveSettings = useCallback(async () => {
    if (!currentPlayerId) return;
    
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/games/${gameCode}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          settings: gameSettings,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }
      setShowSettings(false);
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setIsSavingSettings(false);
    }
  }, [currentPlayerId, gameCode, gameSettings]);

  // Load settings on mount (MJ only, lobby only)
  useEffect(() => {
    if (isMJ && gameStatus === 'lobby') {
      loadSettings();
    }
  }, [isMJ, gameStatus, loadSettings]);

  return {
    showSettings,
    gameSettings,
    isSavingSettings,
    setShowSettings,
    setGameSettings,
    loadSettings,
    saveSettings,
  };
}
