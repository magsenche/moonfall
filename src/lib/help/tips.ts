/**
 * First-time tips configuration
 * Used with useTips hook
 */

export interface Tip {
  id: string;
  message: string;
  icon: string;
}

export const TIPS: Record<string, Tip> = {
  welcome: {
    id: 'welcome',
    message: "Bienvenue ! Clique sur ta carte de rôle pour plus de détails.",
    icon: '💡',
  },
  first_vote: {
    id: 'first_vote',
    message: "Clique sur un joueur pour voter contre lui.",
    icon: '🗳️',
  },
  wolf_chat: {
    id: 'wolf_chat',
    message: "Coordonne-toi avec ta meute via le chat privé !",
    icon: '🐺',
  },
  seer_power: {
    id: 'seer_power',
    message: "Choisis un joueur pour découvrir son rôle.",
    icon: '🔮',
  },
  hunter_death: {
    id: 'hunter_death',
    message: "Tu peux emporter quelqu'un avec toi ! Choisis bien.",
    icon: '🏹',
  },
  witch_potions: {
    id: 'witch_potions',
    message: "Tu vois qui va mourir. Utilise tes potions avec sagesse !",
    icon: '🧪',
  },
  little_girl_spy: {
    id: 'little_girl_spy',
    message: "Tu peux lire le chat des loups mais pas écrire. Reste discrète !",
    icon: '👧',
  },
  phase_help: {
    id: 'phase_help',
    message: "Clique sur le ? à côté de la phase pour comprendre ce qui se passe.",
    icon: '❓',
  },
  rules_available: {
    id: 'rules_available',
    message: "Tu peux consulter les règles à tout moment via le bouton 📖",
    icon: '📖',
  },
};

/**
 * LocalStorage key for dismissed tips
 */
export const TIPS_STORAGE_KEY = 'moonfall_tips_dismissed';

/**
 * Get initial tips state from localStorage
 */
export function getStoredTipsState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(TIPS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save tip as dismissed
 */
export function dismissTip(tipId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getStoredTipsState();
    current[tipId] = true;
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a tip has been dismissed
 */
export function isTipDismissed(tipId: string): boolean {
  const state = getStoredTipsState();
  return state[tipId] === true;
}

/**
 * Reset all tips (for testing)
 */
export function resetAllTips(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TIPS_STORAGE_KEY);
}
