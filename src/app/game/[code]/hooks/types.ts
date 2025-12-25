/**
 * Shared types for game hooks
 * Extracted from lobby-client.tsx for reusability
 */

import type { Database } from '@/types/database';

// Re-export game types for convenience
export { PHASE_DURATIONS, DEFAULT_GAME_SETTINGS } from '@/types/game';
export type { GameSettings, GameStatus, Team, VoteType } from '@/types/game';

// Partial player type for what we actually select from DB
export type PartialPlayer = Pick<
  Database['public']['Tables']['players']['Row'],
  'id' | 'pseudo' | 'is_alive' | 'is_mj' | 'role_id' | 'created_at'
>;

// Game with players joined
export type GameWithPlayers = Database['public']['Tables']['games']['Row'] & {
  players: PartialPlayer[];
};

// Role from DB
export type Role = Database['public']['Tables']['roles']['Row'];

// Wolf chat message type
export type WolfMessage = {
  id: string;
  message: string;
  created_at: string;
  player: { id: string; pseudo: string } | null;
};

// Seer power result
export type SeerResult = {
  targetName: string;
  roleName: string;
  team: string;
};

// Mission type for UI (extended from DB)
export type Mission = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  assigned_to: string | null;
  assigned_player: { id: string; pseudo: string } | null;
  assigned_players: { 
    id: string; 
    pseudo: string; 
    status: string; 
    bid?: number; 
    score?: number; 
    submitted_at?: string;
  }[];
  deadline: string | null;
  reward_description: string | null;
  penalty_description: string | null;
  mission_type?: 'individual' | 'collective' | 'competitive' | 'auction' | null;
  category?: 'social' | 'challenge' | 'quiz' | 'external' | 'photo' | 'auction' | null;
  validation_type?: 'mj' | 'auto' | 'upload' | 'external' | 'first_wins' | 'best_score' | null;
  reward_type?: 'wolf_hint' | 'immunity' | 'double_vote' | 'extra_vision' | 'silence' | 'none' | null;
  time_limit_seconds?: number | null;
  external_url?: string | null;
  auction_data?: {
    min_bid?: number;
    max_bid?: number;
    current_highest_bid?: number;
    current_highest_bidder?: string;
    bid_phase_ends_at?: string;
  } | null;
  winner?: { id: string; pseudo: string } | null;
};

// Player with role info for UI components
export type PlayerWithRole = PartialPlayer & {
  role?: Role | null;
};

// Note: GameSettings is re-exported from @/types/game above
