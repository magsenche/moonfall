// Re-export all types from the auto-generated Supabase types
export * from './supabase';

// Convenience type aliases
export type { 
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json 
} from './supabase';

// Game-specific type helpers
import type { Database } from './supabase';

export type Game = Database['public']['Tables']['games']['Row'];
export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type GameUpdate = Database['public']['Tables']['games']['Update'];

export type Player = Database['public']['Tables']['players']['Row'];
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];

export type Role = Database['public']['Tables']['roles']['Row'];
export type Power = Database['public']['Tables']['powers']['Row'];

export type Mission = Database['public']['Tables']['missions']['Row'];
export type MissionInsert = Database['public']['Tables']['missions']['Insert'];
export type MissionUpdate = Database['public']['Tables']['missions']['Update'];

export type MissionAssignment = Database['public']['Tables']['mission_assignments']['Row'];
export type MissionAssignmentInsert = Database['public']['Tables']['mission_assignments']['Insert'];
export type MissionAssignmentUpdate = Database['public']['Tables']['mission_assignments']['Update'];

export type Vote = Database['public']['Tables']['votes']['Row'];
export type VoteInsert = Database['public']['Tables']['votes']['Insert'];

export type WolfChatMessage = Database['public']['Tables']['wolf_chat']['Row'];
export type WolfChatInsert = Database['public']['Tables']['wolf_chat']['Insert'];

export type GameEvent = Database['public']['Tables']['game_events']['Row'];
export type GameEventInsert = Database['public']['Tables']['game_events']['Insert'];

export type PowerUse = Database['public']['Tables']['power_uses']['Row'];
export type PowerUseInsert = Database['public']['Tables']['power_uses']['Insert'];

// Enum types
export type GameStatus = Database['public']['Enums']['game_status'];
export type MissionStatus = Database['public']['Enums']['mission_status'];
export type MissionType = Database['public']['Enums']['mission_type'];
export type MissionCategory = Database['public']['Enums']['mission_category'];
export type MissionValidationType = Database['public']['Enums']['mission_validation_type'];
export type RewardType = Database['public']['Enums']['reward_type'];
export type PowerPhase = Database['public']['Enums']['power_phase'];
export type TeamType = Database['public']['Enums']['team_type'];
export type VoteType = Database['public']['Enums']['vote_type'];
