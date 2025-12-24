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

// Mission template for quick creation
export interface MissionTemplate {
  title: string;
  description: string;
  mission_type: MissionType;
  category: MissionCategory;
  validation_type: MissionValidationType;
  time_limit_seconds?: number;
  reward_type?: RewardType;
  reward_description?: string;
  penalty_description?: string;
  external_url?: string;
  sabotage_allowed?: boolean;
}

// Pre-built mission templates organized by category
export const MISSION_TEMPLATES: Record<string, MissionTemplate[]> = {
  social: [
    {
      title: 'Compliment sincère',
      description: 'Faites un compliment sincère à 3 joueurs différents pendant la phase jour.',
      mission_type: 'individual',
      category: 'social',
      validation_type: 'mj',
      time_limit_seconds: 300, // 5 min
      reward_type: 'none',
      reward_description: 'Respect du village +10',
    },
    {
      title: 'Allié improbable',
      description: 'Passez 5 minutes à discuter avec un joueur avec qui vous n\'avez pas encore parlé.',
      mission_type: 'individual',
      category: 'social',
      validation_type: 'mj',
      reward_type: 'wolf_hint',
      reward_description: 'Indice sur l\'équipe d\'un joueur',
    },
  ],
  challenge: [
    {
      title: 'Imitation',
      description: 'Imitez un animal choisi par le MJ pendant 30 secondes.',
      mission_type: 'individual',
      category: 'challenge',
      validation_type: 'mj',
      time_limit_seconds: 60,
      reward_type: 'none',
    },
    {
      title: 'Chant du village',
      description: 'Chantez une chanson en y incluant le mot "loup".',
      mission_type: 'individual',
      category: 'challenge',
      validation_type: 'mj',
      reward_type: 'immunity',
      reward_description: 'Protection au prochain vote',
      sabotage_allowed: true,
    },
  ],
  quiz: [
    {
      title: 'Culture générale',
      description: 'Répondez correctement à 3 questions du MJ.',
      mission_type: 'competitive',
      category: 'quiz',
      validation_type: 'first_wins',
      reward_type: 'double_vote',
      reward_description: 'Vote double au prochain conseil',
    },
  ],
  auction: [
    {
      title: 'Capitales du monde',
      description: 'Citez des capitales du monde sans répétition ni erreur. Enchérissez sur le nombre que vous pensez pouvoir citer !',
      mission_type: 'auction',
      category: 'auction',
      validation_type: 'best_score',
      reward_type: 'extra_vision',
      reward_description: 'La voyante peut voir 2 rôles cette nuit',
    },
    {
      title: 'Pompes',
      description: 'Faites des pompes ! Enchérissez sur le nombre que vous pouvez faire.',
      mission_type: 'auction',
      category: 'auction',
      validation_type: 'best_score',
      reward_type: 'immunity',
      reward_description: 'Immunité au prochain vote',
    },
    {
      title: 'Apnée',
      description: 'Retenez votre respiration ! Enchérissez sur le temps en secondes.',
      mission_type: 'auction',
      category: 'auction',
      validation_type: 'best_score',
      reward_type: 'wolf_hint',
      reward_description: 'Savoir si un joueur est loup ou villageois',
    },
  ],
  external: [
    {
      title: 'Mini-jeu externe',
      description: 'Jouez au mini-jeu et obtenez le meilleur score !',
      mission_type: 'competitive',
      category: 'external',
      validation_type: 'external',
      external_url: 'https://example.com/game',
      reward_type: 'double_vote',
    },
  ],
  photo: [
    {
      title: 'Selfie de groupe',
      description: 'Prenez un selfie avec au moins 3 autres joueurs en faisant une pose ridicule.',
      mission_type: 'collective',
      category: 'photo',
      validation_type: 'upload',
      reward_type: 'none',
    },
  ],
};

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
