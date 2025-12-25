/**
 * Game hooks - Extracted from lobby-client.tsx
 * 
 * Each hook handles a specific domain:
 * - useGameRealtime: Supabase realtime subscriptions
 * - useTimer: Phase countdown timer
 * - useVoting: Day vote (conseil) logic
 * - useNightActions: Wolf vote + Seer power
 * - useWolfChat: Wolf pack private chat
 * - useMissions: Mission system
 * - useGameSettings: MJ settings management
 * - usePlayerSession: Player identification
 * - useAutoGarou: Auto mode (no MJ) progression
 */

export * from './types';
export * from './useGameRealtime';
export * from './useTimer';
export * from './useVoting';
export * from './useNightActions';
export * from './useWolfChat';
export * from './useMissions';
export * from './useGameSettings';
export * from './usePlayerSession';
export * from './useAutoGarou';
