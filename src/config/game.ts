/**
 * Game configuration - Phase timers and settings
 */

export const PHASE_DURATIONS = {
  // Duration in seconds for each phase
  jour: 5 * 60, // 5 minutes for discussion
  nuit: 2 * 60, // 2 minutes for night actions
  conseil: 3 * 60, // 3 minutes for voting
} as const;

export const DEFAULT_GAME_SETTINGS = {
  minPlayers: 6,
  maxPlayers: 20,
  phaseDurations: PHASE_DURATIONS,
  // Future settings
  enableMissions: false,
  enableGhostChat: false,
} as const;

export type GameSettings = typeof DEFAULT_GAME_SETTINGS;
