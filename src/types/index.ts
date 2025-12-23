// Primary types from auto-generated Supabase schema
export * from './database';

// Additional types from game.ts that don't conflict
// The database types take precedence - use GameSettings and DEFAULT_GAME_SETTINGS from here
export { 
  type GameSettings,
  DEFAULT_GAME_SETTINGS,
  EVENT_TYPES,
  type EventType,
  // App-prefixed types for frontend use (camelCase versions)
  type AppPlayer,
  type AppGame,
  type AppVote,
  type AppMission,
  type AppWolfChatMessage,
  type AppGameEvent,
} from './game';
