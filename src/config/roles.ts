// Role configuration - local fallback for when DB is unavailable
// Primary source of truth is the `roles` table in Supabase
// This file provides fallback values and type definitions

import type { TeamType } from '@/types/database';
import type { Tables } from '@/types/supabase';

// DB Role type from Supabase
export type DBRole = Tables<'roles'>;

export interface RoleAssets {
  icon: string;
  image?: string;
  color: string;
  bgColor: string;
}

export interface RoleConfig {
  id: string;
  name: string;
  displayName: string;
  team: TeamType;
  description: string;
  shortDescription: string;
  assets: RoleAssets;
}

// Convert DB role to RoleConfig (used when DB data is available)
export function dbRoleToConfig(dbRole: DBRole): RoleConfig {
  return {
    id: dbRole.name,
    name: dbRole.name,
    displayName: dbRole.display_name,
    team: dbRole.team,
    description: dbRole.description,
    shortDescription: dbRole.short_description || dbRole.description.slice(0, 50) + '...',
    assets: {
      icon: dbRole.icon || '❓',
      image: dbRole.image_url || undefined,
      color: dbRole.color || 'text-gray-400',
      bgColor: dbRole.bg_color || 'bg-gray-500/20',
    },
  };
}

// Minimal fallback configs (used when DB is unavailable)
// Only essential roles for offline/error scenarios
const FALLBACK_CONFIGS: Record<string, RoleConfig> = {
  villageois: {
    id: 'villageois',
    name: 'villageois',
    displayName: 'Villageois',
    team: 'village',
    description: 'Simple habitant du village sans pouvoir spécial.',
    shortDescription: 'Habitant sans pouvoir',
    assets: { icon: '👤', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  },
  loup_garou: {
    id: 'loup_garou',
    name: 'loup_garou',
    displayName: 'Loup-Garou',
    team: 'loups',
    description: 'Chaque nuit, les loups-garous dévorent un villageois.',
    shortDescription: 'Dévore un villageois chaque nuit',
    assets: { icon: '🐺', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  },
  voyante: {
    id: 'voyante',
    name: 'voyante',
    displayName: 'Voyante',
    team: 'village',
    description: 'Chaque nuit, découvre le vrai rôle d\'un joueur.',
    shortDescription: 'Découvre un rôle chaque nuit',
    assets: { icon: '🔮', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  },
  sorciere: {
    id: 'sorciere',
    name: 'sorciere',
    displayName: 'Sorcière',
    team: 'village',
    description: 'Possède une potion de vie et une potion de mort.',
    shortDescription: 'Potion de vie + potion de mort',
    assets: { icon: '🧪', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  },
  chasseur: {
    id: 'chasseur',
    name: 'chasseur',
    displayName: 'Chasseur',
    team: 'village',
    description: 'Quand il meurt, tire sur un joueur et l\'élimine.',
    shortDescription: 'Tire sur quelqu\'un en mourant',
    assets: { icon: '🏹', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  },
  cupidon: {
    id: 'cupidon',
    name: 'cupidon',
    displayName: 'Cupidon',
    team: 'village',
    description: 'Désigne deux amoureux qui devront survivre ensemble.',
    shortDescription: 'Crée un couple d\'amoureux',
    assets: { icon: '💘', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  },
  petite_fille: {
    id: 'petite_fille',
    name: 'petite_fille',
    displayName: 'Petite Fille',
    team: 'village',
    description: 'Peut lire le chat des loups-garous sans pouvoir écrire.',
    shortDescription: 'Lit le chat des loups',
    assets: { icon: '👧', color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  },
  ancien: {
    id: 'ancien',
    name: 'ancien',
    displayName: 'Ancien',
    team: 'village',
    description: 'Survit à la première attaque des loups-garous.',
    shortDescription: 'Survit à une attaque',
    assets: { icon: '👴', color: 'text-stone-400', bgColor: 'bg-stone-500/20' },
  },
};

// Unknown role fallback
const UNKNOWN_ROLE: RoleConfig = {
  id: 'unknown',
  name: 'unknown',
  displayName: 'Inconnu',
  team: 'village',
  description: 'Rôle inconnu',
  shortDescription: 'Inconnu',
  assets: { icon: '❓', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

// Get role config from fallback (when no DB data available)
export function getRoleConfig(roleId: string): RoleConfig {
  return FALLBACK_CONFIGS[roleId] || { ...UNKNOWN_ROLE, id: roleId, name: roleId };
}

// Get role assets only
export function getRoleAssets(roleId: string): RoleAssets {
  return getRoleConfig(roleId).assets;
}

// For components that need the full list of fallback roles
export const roleConfigs = FALLBACK_CONFIGS;

