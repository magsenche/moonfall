/**
 * Mission System Types & Utilities
 * Modular mission system for Loup-Garou IRL
 */

import type { Database } from '@/types/database';

// Re-export DB types for convenience
export type Mission = Database['public']['Tables']['missions']['Row'];
export type MissionInsert = Database['public']['Tables']['missions']['Insert'];
export type MissionUpdate = Database['public']['Tables']['missions']['Update'];
export type MissionAssignment = Database['public']['Tables']['mission_assignments']['Row'];
export type MissionAssignmentInsert = Database['public']['Tables']['mission_assignments']['Insert'];

// Enums
export type MissionType = Database['public']['Enums']['mission_type'];
export type MissionCategory = Database['public']['Enums']['mission_category'];
export type MissionValidationType = Database['public']['Enums']['mission_validation_type'];
export type MissionStatus = Database['public']['Enums']['mission_status'];
export type RewardType = Database['public']['Enums']['reward_type'];

// Extended mission with relations
export interface MissionWithDetails extends Mission {
  assigned_player?: { id: string; pseudo: string } | null;
  validator?: { id: string; pseudo: string } | null;
  winner?: { id: string; pseudo: string } | null;
  assigned_players?: {
    id: string;
    pseudo: string;
    status: string;
    bid?: number;
    score?: number;
    submitted_at?: string;
  }[];
  assignments?: MissionAssignment[];
}

// Auction-specific data
export interface AuctionData {
  min_bid?: number;
  max_bid?: number;
  current_highest_bid?: number;
  current_highest_bidder?: string;
  bid_phase_ends_at?: string; // When bidding closes
  execution_phase_ends_at?: string; // When winner must complete
}

// Reward configuration
export interface RewardData {
  target_team?: 'village' | 'loups' | 'all';
  duration_phases?: number; // How long reward lasts
  specific_player_id?: string;
  custom_message?: string;
}

// Submission data from players
export interface SubmissionData {
  text?: string; // Text answer
  photo_url?: string; // Uploaded photo
  external_score?: number; // Score from external game
  external_url_visited?: boolean;
  custom_data?: Record<string, unknown>;
}

// Mission template interface (data comes from mission_templates table in DB)
// Note: MissionTemplate type is also exported from lib/api/games.ts for client use
export interface MissionTemplate {
  id?: string;
  title: string;
  description: string;
  mission_type: MissionType;
  category: MissionCategory;
  validation_type: MissionValidationType;
  time_limit_seconds?: number | null;
  reward_type?: RewardType | null;
  reward_description?: string | null;
  penalty_description?: string | null;
  external_url?: string | null;
  sabotage_allowed?: boolean;
}

// Templates are now stored in the `mission_templates` table in the database.
// To add/edit templates, use Supabase dashboard or migrations.
// See: supabase/migrations/002_mission_templates.sql

// Labels for UI
export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  individual: 'Individuelle',
  collective: 'Collective',
  competitive: 'Compétitive',
  auction: 'Enchère',
};

export const MISSION_CATEGORY_LABELS: Record<MissionCategory, string> = {
  social: '🤝 Social',
  challenge: '🎯 Défi',
  quiz: '🧠 Quiz',
  external: '🎮 Jeu externe',
  photo: '📸 Photo',
  auction: '💰 Enchère',
};

export const VALIDATION_TYPE_LABELS: Record<MissionValidationType, string> = {
  mj: 'Validation MJ',
  auto: 'Automatique',
  upload: 'Upload requis',
  external: 'Jeu externe',
  first_wins: 'Premier gagnant',
  best_score: 'Meilleur score',
  self: 'Auto-validation',
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  wolf_hint: '🐺 Indice loup',
  immunity: '🛡️ Immunité',
  double_vote: '✌️ Vote double',
  extra_vision: '👁️ Vision extra',
  silence: '🤫 Silence forcé',
  none: '🏆 Honneur seul',
};

export const CATEGORY_ICONS: Record<MissionCategory, string> = {
  social: '🤝',
  challenge: '🎯',
  quiz: '🧠',
  external: '🎮',
  photo: '📸',
  auction: '💰',
};
