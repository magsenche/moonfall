// Centralized config exports
export * from './theme';
export * from './roles';
export * from './players';

// Game config is now in @/types/game for consolidation
// Re-export for backwards compatibility
export { PHASE_DURATIONS, DEFAULT_GAME_SETTINGS } from '@/types/game';
export type { GameSettings } from '@/types/game';
