// Role configuration - assets and display info
// This file will be extended with custom images/icons later

import type { TeamType } from '@/types/database';

export interface RoleAssets {
  // Placeholder for future custom images
  icon: string; // Emoji for now, will be replaced with image paths
  image?: string; // Future: path to role illustration
  color: string; // Tailwind color class
  bgColor: string; // Tailwind background class
}

export interface RoleConfig {
  id: string;
  name: string;
  displayName: string;
  team: TeamType;
  description: string;
  shortDescription: string; // For tooltips/cards
  assets: RoleAssets;
}

// Default role configurations
// These can be overridden by DB values, but provide fallback assets
export const roleConfigs: Record<string, RoleConfig> = {
  villageois: {
    id: 'villageois',
    name: 'villageois',
    displayName: 'Villageois',
    team: 'village',
    description: 'Simple habitant du village sans pouvoir spécial. Doit trouver et éliminer les loups-garous.',
    shortDescription: 'Habitant sans pouvoir',
    assets: {
      icon: '👤',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
  },
  loup_garou: {
    id: 'loup_garou',
    name: 'loup_garou',
    displayName: 'Loup-Garou',
    team: 'loups',
    description: 'Chaque nuit, les loups-garous se réunissent pour dévorer un villageois.',
    shortDescription: 'Dévore un villageois chaque nuit',
    assets: {
      icon: '🐺',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
  },
  voyante: {
    id: 'voyante',
    name: 'voyante',
    displayName: 'Voyante',
    team: 'village',
    description: 'Chaque nuit, la voyante peut découvrir le vrai rôle d\'un joueur de son choix.',
    shortDescription: 'Découvre un rôle chaque nuit',
    assets: {
      icon: '🔮',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
  },
  // Future roles - placeholders
  sorciere: {
    id: 'sorciere',
    name: 'sorciere',
    displayName: 'Sorcière',
    team: 'village',
    description: 'Possède une potion de vie et une potion de mort, utilisables une fois chacune.',
    shortDescription: 'Potion de vie + potion de mort',
    assets: {
      icon: '🧪',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
  },
  chasseur: {
    id: 'chasseur',
    name: 'chasseur',
    displayName: 'Chasseur',
    team: 'village',
    description: 'Quand il meurt, le chasseur peut tirer sur un joueur et l\'éliminer.',
    shortDescription: 'Tire sur quelqu\'un en mourant',
    assets: {
      icon: '🏹',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
  },
  cupidon: {
    id: 'cupidon',
    name: 'cupidon',
    displayName: 'Cupidon',
    team: 'village',
    description: 'La première nuit, Cupidon désigne deux amoureux qui devront survivre ensemble.',
    shortDescription: 'Crée un couple d\'amoureux',
    assets: {
      icon: '💘',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
    },
  },
  salvateur: {
    id: 'salvateur',
    name: 'salvateur',
    displayName: 'Salvateur',
    team: 'village',
    description: 'Chaque nuit, le salvateur peut protéger un joueur de l\'attaque des loups.',
    shortDescription: 'Protège un joueur chaque nuit',
    assets: {
      icon: '🛡️',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
  },
  petite_fille: {
    id: 'petite_fille',
    name: 'petite_fille',
    displayName: 'Petite Fille',
    team: 'village',
    description: 'Peut lire le chat des loups-garous la nuit sans pouvoir écrire. Doit rester discrète.',
    shortDescription: 'Lit le chat des loups',
    assets: {
      icon: '👧',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/20',
    },
  },
  ancien: {
    id: 'ancien',
    name: 'ancien',
    displayName: 'Ancien',
    team: 'village',
    description: 'Survit à la première attaque des loups-garous.',
    shortDescription: 'Survit à une attaque',
    assets: {
      icon: '👴',
      color: 'text-stone-400',
      bgColor: 'bg-stone-500/20',
    },
  },
  loup_blanc: {
    id: 'loup_blanc',
    name: 'loup_blanc',
    displayName: 'Loup Blanc',
    team: 'solo',
    description: 'Loup solitaire qui doit éliminer tout le monde pour gagner seul.',
    shortDescription: 'Doit gagner seul',
    assets: {
      icon: '🐺',
      color: 'text-slate-200',
      bgColor: 'bg-slate-500/20',
    },
  },
  ange: {
    id: 'ange',
    name: 'ange',
    displayName: 'Ange',
    team: 'solo',
    description: 'Doit se faire éliminer au premier conseil pour gagner.',
    shortDescription: 'Doit mourir au 1er conseil',
    assets: {
      icon: '😇',
      color: 'text-sky-300',
      bgColor: 'bg-sky-500/20',
    },
  },
};

// Helper to get role config with fallback
export function getRoleConfig(roleId: string): RoleConfig {
  return roleConfigs[roleId] || {
    id: roleId,
    name: roleId,
    displayName: roleId,
    team: 'village' as TeamType,
    description: 'Rôle inconnu',
    shortDescription: 'Inconnu',
    assets: {
      icon: '❓',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
    },
  };
}

// Future: Function to load custom assets
export function getRoleAssets(roleId: string): RoleAssets {
  const config = getRoleConfig(roleId);
  return config.assets;
}
