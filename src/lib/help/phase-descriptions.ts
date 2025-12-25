/**
 * Phase descriptions for contextual help
 * Used in PhaseHelpTooltip
 */

export interface PhaseDescription {
  name: string;
  icon: string;
  shortDescription: string;
  longDescription: string;
  whatToDo: string[];
  duration: string;
}

export const PHASE_DESCRIPTIONS: Record<string, PhaseDescription> = {
  lobby: {
    name: 'Lobby',
    icon: '⏳',
    shortDescription: "En attente des joueurs",
    longDescription: 
      "La partie n'a pas encore commencé. Attendez que tous les joueurs rejoignent " +
      "et que le MJ lance la partie.",
    whatToDo: [
      "Partage le code de la partie avec tes amis",
      "Attends que le MJ lance la partie",
      "Tu peux consulter les règles en attendant",
    ],
    duration: "Jusqu'au lancement",
  },

  nuit: {
    name: 'Nuit',
    icon: '🌙',
    shortDescription: "Les loups chassent dans l'ombre",
    longDescription:
      "Le village dort. Les loups-garous se réunissent secrètement pour choisir leur victime. " +
      "Les rôles avec des pouvoirs nocturnes (Voyante, Sorcière) peuvent agir.",
    whatToDo: [
      "🐺 Loups : Votez ensemble pour choisir une victime",
      "🔮 Voyante : Choisis un joueur pour découvrir son rôle",
      "🧪 Sorcière : Tu verras qui va mourir et pourras utiliser tes potions",
      "👧 Petite Fille : Lis le chat des loups pour les identifier",
      "Autres : Attends le lever du jour...",
    ],
    duration: "2 minutes par défaut",
  },

  jour: {
    name: 'Jour',
    icon: '☀️',
    shortDescription: "Le village se réveille",
    longDescription:
      "Le village découvre si quelqu'un a été tué pendant la nuit. " +
      "C'est le moment de discuter, d'accuser et de défendre !",
    whatToDo: [
      "Découvrez qui a été éliminé cette nuit",
      "Discutez avec les autres joueurs",
      "Partagez vos suspicions (sans révéler votre rôle si vous êtes spécial)",
      "Préparez-vous pour le vote du conseil",
    ],
    duration: "5 minutes par défaut",
  },

  conseil: {
    name: 'Conseil',
    icon: '⚖️',
    shortDescription: "Le village vote",
    longDescription:
      "Le moment crucial ! Le village doit voter pour éliminer un suspect. " +
      "La personne avec le plus de votes sera éliminée et son rôle révélé.",
    whatToDo: [
      "Vote pour le joueur que tu penses être un loup",
      "Tu peux changer ton vote jusqu'à la fin du temps",
      "En cas d'égalité, personne n'est éliminé",
      "Regarde qui vote pour qui - ça peut donner des indices !",
    ],
    duration: "2 minutes par défaut",
  },

  terminee: {
    name: 'Partie Terminée',
    icon: '🏁',
    shortDescription: "Une équipe a gagné !",
    longDescription:
      "La partie est terminée. Découvrez qui avait quel rôle et discutez de la partie !",
    whatToDo: [
      "Découvrez les rôles de chacun",
      "Discutez des moments clés de la partie",
      "Lancez une nouvelle partie !",
    ],
    duration: "-",
  },
};

/**
 * Get phase description by phase name
 */
export function getPhaseDescription(phase: string): PhaseDescription | null {
  return PHASE_DESCRIPTIONS[phase] || null;
}
