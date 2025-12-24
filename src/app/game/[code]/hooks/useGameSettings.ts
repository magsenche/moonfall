/**
 * useGameSettings - MJ game settings management
 * 
 * Handles:
 * - Loading game settings from API
 * - Saving settings updates
 * - Roles distribution configuration
 */

import { useState, useCallback, useEffect } from 'react';
import { getSettings, updateSettings, ApiError } from '@/lib/api';
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
      const data = await getSettings(gameCode);
      const settings = data.settings;
      setGameSettings({
        minPlayers: settings.minPlayers ?? DEFAULT_GAME_SETTINGS.minPlayers,
        maxPlayers: settings.maxPlayers ?? DEFAULT_GAME_SETTINGS.maxPlayers,
        nightDurationMinutes: settings.nightDurationMinutes ?? DEFAULT_GAME_SETTINGS.nightDurationMinutes,
        voteDurationMinutes: settings.voteDurationMinutes ?? DEFAULT_GAME_SETTINGS.voteDurationMinutes,
        councilIntervalMinutes: settings.councilIntervalMinutes ?? DEFAULT_GAME_SETTINGS.councilIntervalMinutes,
        rolesDistribution: settings.rolesDistribution ?? {},
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [gameCode]);

  // Save game settings
  const saveSettings = useCallback(async () => {
    if (!currentPlayerId) return;
    
    setIsSavingSettings(true);
    try {
      await updateSettings(gameCode, currentPlayerId, gameSettings);
      setShowSettings(false);
    } catch (err) {
      console.error('Save settings error:', err instanceof ApiError ? err.message : err);
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
