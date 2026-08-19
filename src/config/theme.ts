// Theme configuration - easily customizable later
// This file centralizes all design tokens for future customization

export const theme = {
  // Colors by team - can be customized later
  teams: {
    village: {
      primary: '#7da7d9', // village-400
      secondary: '#a7c4e4', // village-300
      bg: 'bg-village-400/20',
      text: 'text-village-300',
      border: 'border-village-400/50',
    },
    loups: {
      primary: '#b03a3a', // blood-500
      secondary: '#d05555', // blood-400
      bg: 'bg-blood-500/20',
      text: 'text-blood-400',
      border: 'border-blood-500/50',
    },
    solo: {
      primary: '#a2a8b3', // solo-400
      secondary: '#a2a8b3', // solo-400
      bg: 'bg-solo-400/20',
      text: 'text-solo-400',
      border: 'border-solo-400/50',
    },
  },

  // Game phases
  phases: {
    jour: {
      bg: 'bg-moon-500/20',
      text: 'text-moon-500',
    },
    nuit: {
      bg: 'bg-village-600/20',
      text: 'text-village-300',
    },
    conseil: {
      bg: 'bg-blood-500/20',
      text: 'text-blood-400',
    },
    lobby: {
      bg: 'bg-solo-400/20',
      text: 'text-solo-400',
    },
  },

  // Player states
  playerStates: {
    alive: {
      opacity: 'opacity-100',
      filter: '',
    },
    dead: {
      opacity: 'opacity-50',
      filter: 'grayscale',
    },
  },
} as const;

export type TeamType = keyof typeof theme.teams;
export type PhaseType = keyof typeof theme.phases;
