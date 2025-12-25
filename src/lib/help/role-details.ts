/**
 * Extended role details for the help system
 * Builds on top of roleConfigs from config/roles.ts to avoid duplication
 * 
 * @see config/roles.ts for base role info (name, icon, team, description)
 */

import { getRoleConfig } from '@/config/roles';

/**
 * Extended info for help modals - only the EXTRA fields not in RoleConfig
 */
export interface RoleHelpExtras {
  power: string | null;
  powerTiming: string | null;
  objective: string;
  tips: string[];
}

/**
 * Full role detail combining base config + help extras
 */
export interface RoleDetail {
  // From RoleConfig
  name: string;
  icon: string;
  team: 'village' | 'loups' | 'solo';
  teamLabel: string;
  description: string;
  // From RoleHelpExtras
  power: string | null;
  powerTiming: string | null;
  objective: string;
  tips: string[];
}

/**
 * Extended help info per role - only the extra fields
 * Base info (name, icon, team, description) comes from config/roles.ts
 */
const ROLE_HELP_EXTRAS: Record<string, RoleHelpExtras> = {
  villageois: {
    power: null,
    powerTiming: null,
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Observe qui accuse qui et les réactions de chacun",
      "Les loups-garous se défendent souvent mutuellement",
      "N'aie pas peur de prendre la parole et d'accuser si tu as des doutes",
    ],
  },

  loup_garou: {
    power: "Chaque nuit, vote avec ta meute pour dévorer un villageois.",
    powerTiming: "🌙 Phase de nuit - Chat privé avec les autres loups",
    objective: "Éliminez les villageois jusqu'à être au moins aussi nombreux qu'eux.",
    tips: [
      "Coordonne-toi avec les autres loups via le chat privé",
      "Ne défends pas trop ouvertement un autre loup suspecté",
      "Accuse parfois d'autres joueurs pour détourner les soupçons",
      "Évite de voter systématiquement pareil que tes coéquipiers loups",
    ],
  },

  voyante: {
    power: "Chaque nuit, découvre le rôle d'un joueur de ton choix.",
    powerTiming: "🌙 Phase de nuit - Le panneau de vision apparaît automatiquement",
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Garde tes informations secrètes pour ne pas devenir une cible prioritaire",
      "Si tu découvres un loup, trouve un moyen subtil de l'accuser",
      "Les loups peuvent mentir sur leur rôle - reste vigilant",
      "Évite de révéler que tu es Voyante trop tôt dans la partie",
    ],
  },

  petite_fille: {
    power: "Tu peux lire le chat privé des loups-garous (sans pouvoir écrire).",
    powerTiming: "🌙 Phase de nuit - Accès en lecture seule au chat des loups",
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Tu connais l'identité des loups - utilise cette info avec prudence",
      "Ne révèle pas immédiatement ce que tu sais, tu deviendrais une cible",
      "Oriente subtilement les votes sans te dévoiler",
      "Si tu te fais suspecter par les loups, ils te cibleront en priorité",
    ],
  },

  ancien: {
    power: "Tu survis automatiquement à la première attaque des loups.",
    powerTiming: "🌙 Passif - Se déclenche automatiquement une seule fois",
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Tu es un atout précieux pour le village - reste discret sur ton rôle",
      "Après avoir survécu, tu redeviens vulnérable comme un villageois normal",
      "Ta survie miraculeuse peut semer le doute chez les loups",
      "Profite de ta seconde chance pour aider à démasquer les loups",
    ],
  },

  chasseur: {
    power: "Quand tu meurs (vote ou attaque), tu tires sur un joueur de ton choix qui meurt aussi.",
    powerTiming: "💀 À ta mort - Un panneau apparaît pour choisir ta cible",
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Garde en tête qui tu veux viser si tu meurs",
      "Si tu es sûr de quelqu'un, révèle ton rôle et menace de tirer sur lui",
      "Ton tir peut retourner une partie perdue - choisis bien",
      "Tu peux tirer sur n'importe qui, même un villageois si tu te trompes",
    ],
  },

  sorciere: {
    power: 
      "• Potion de vie : Sauve la victime des loups cette nuit (1 seule fois)\n" +
      "• Potion de mort : Tue un joueur de ton choix (1 seule fois)",
    powerTiming: "🌙 Phase de nuit - Après le vote des loups, tu vois qui va mourir",
    objective: "Aide le village à identifier et éliminer tous les loups-garous.",
    tips: [
      "Garde ta potion de vie pour un moment critique, tu n'en as qu'une",
      "La potion de mort peut éliminer un loup confirmé",
      "Tu peux utiliser les deux potions la même nuit si nécessaire",
      "Ne révèle pas trop tôt que tu es Sorcière",
    ],
  },

  cupidon: {
    power: "Au début de la partie, désigne deux joueurs qui deviennent amoureux.",
    powerTiming: "🎬 Début de partie - Juste après la distribution des rôles",
    objective: "Aide le village, sauf si un amoureux est loup (ils doivent alors éliminer tout le monde).",
    tips: [
      "Tu peux te désigner toi-même comme amoureux",
      "Si tu lies un loup et un villageois, ils devront trahir leur camp",
      "Les amoureux connaissent leur statut mais pas forcément le rôle de l'autre",
      "Choisis avec stratégie ou avec le cœur !",
    ],
  },
};

/**
 * Default help extras for roles not yet documented
 */
const DEFAULT_HELP_EXTRAS: RoleHelpExtras = {
  power: null,
  powerTiming: null,
  objective: "Joue selon les règles de ton équipe.",
  tips: ["Observe les autres joueurs", "Participe aux discussions"],
};

/**
 * Get team label from team type
 */
function getTeamLabel(team: string): string {
  switch (team) {
    case 'loups': return 'Équipe Loups 🔴';
    case 'solo': return 'Équipe Solo ⚪';
    default: return 'Équipe Village 🔵';
  }
}

/**
 * Get full role detail by combining base config + help extras
 * This is the main function to use
 */
export function getRoleDetail(roleName: string): RoleDetail | null {
  const baseConfig = getRoleConfig(roleName);
  if (!baseConfig || baseConfig.id === roleName && baseConfig.displayName === roleName) {
    // Unknown role (fallback was used)
    return null;
  }

  const extras = ROLE_HELP_EXTRAS[roleName] || DEFAULT_HELP_EXTRAS;

  return {
    name: baseConfig.displayName,
    icon: baseConfig.assets.icon,
    team: baseConfig.team as 'village' | 'loups' | 'solo',
    teamLabel: getTeamLabel(baseConfig.team),
    description: baseConfig.description,
    ...extras,
  };
}

/**
 * Get all documented roles for a given team
 */
export function getRolesByTeam(team: 'village' | 'loups' | 'solo'): RoleDetail[] {
  return Object.keys(ROLE_HELP_EXTRAS)
    .map(getRoleDetail)
    .filter((r): r is RoleDetail => r !== null && r.team === team);
}

/**
 * Get all documented role details (for rules modal)
 */
export function getAllRoleDetails(): Record<string, RoleDetail> {
  const result: Record<string, RoleDetail> = {};
  for (const roleName of Object.keys(ROLE_HELP_EXTRAS)) {
    const detail = getRoleDetail(roleName);
    if (detail) {
      result[roleName] = detail;
    }
  }
  return result;
}
