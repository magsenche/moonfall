// Game-related TypeScript types

export type Team = 'village' | 'loups' | 'solo';
export type GameStatus = 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee';
export type GamePhase = 'jour' | 'nuit';
export type VoteType = 'jour' | 'nuit_loup' | 'pouvoir';
export type MissionStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'cancelled';
export type PowerPhase = 'nuit' | 'jour' | 'mort';

// ─────────────────────────────────────────────────────────────────────────────
// Phase Durations (in seconds) - used by API routes
// ─────────────────────────────────────────────────────────────────────────────
export const PHASE_DURATIONS = {
  jour: 5 * 60,    // 5 minutes for discussion
  nuit: 2 * 60,    // 2 minutes for night actions
  conseil: 3 * 60, // 3 minutes for voting
} as const;

export type PhaseDurations = typeof PHASE_DURATIONS;

// ─────────────────────────────────────────────────────────────────────────────
// Role definition
// ─────────────────────────────────────────────────────────────────────────────
export interface Role {
  id: string;
  name: string;
  displayName: string;
  team: Team;
  description: string;
  icon: string | null;
  isActive: boolean;
  powers: Power[];
}

// Power definition
export interface Power {
  id: string;
  roleId: string;
  name: string;
  description: string;
  phase: PowerPhase;
  usesPerGame: number | null; // null = unlimited
  priority: number; // execution order
}

// Game settings (stored as JSON in games.settings)
export interface GameSettings {
  minPlayers: number;
  maxPlayers: number;
  councilIntervalMinutes: number; // e.g., 60 = every hour
  nightDurationMinutes: number;
  voteDurationMinutes: number;
  rolesDistribution: {
    [roleId: string]: number; // how many of each role
  };
}

// Default game settings
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  minPlayers: 6,
  maxPlayers: 30,
  councilIntervalMinutes: 120, // every 2 hours
  nightDurationMinutes: 30,
  voteDurationMinutes: 15,
  rolesDistribution: {},
};

// Player in a game (frontend/camelCase version)
export interface AppPlayer {
  id: string;
  gameId: string;
  userId: string | null;
  pseudo: string;
  roleId: string | null;
  role?: Role;
  isAlive: boolean;
  isMj: boolean;
  deathReason: string | null;
  deathAt: string | null;
}

// Game/Party (frontend/camelCase version)
export interface AppGame {
  id: string;
  code: string;
  name: string;
  status: GameStatus;
  currentPhase: number;
  settings: GameSettings;
  players: AppPlayer[];
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

// Vote (frontend/camelCase version)
export interface AppVote {
  id: string;
  gameId: string;
  phase: number;
  voterId: string;
  targetId: string | null;
  voteType: VoteType;
  createdAt: string;
}

// Mission (frontend/camelCase version)
export interface AppMission {
  id: string;
  gameId: string;
  title: string;
  description: string;
  type: string;
  status: MissionStatus;
  assignedTo: string | null; // null = collective mission
  deadline: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  createdAt: string;
}

// Wolf chat message (frontend/camelCase version)
export interface AppWolfChatMessage {
  id: string;
  gameId: string;
  playerId: string;
  player?: AppPlayer;
  message: string;
  createdAt: string;
}

// Game event (audit log) (frontend/camelCase version)
export interface AppGameEvent {
  id: string;
  gameId: string;
  eventType: string;
  actorId: string | null;
  targetId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

// Event types
export const EVENT_TYPES = {
  GAME_CREATED: 'game_created',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  ROLE_ASSIGNED: 'role_assigned',
  PHASE_CHANGED: 'phase_changed',
  VOTE_CAST: 'vote_cast',
  PLAYER_ELIMINATED: 'player_eliminated',
  POWER_USED: 'power_used',
  MISSION_CREATED: 'mission_created',
  MISSION_COMPLETED: 'mission_completed',
  MISSION_FAILED: 'mission_failed',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
