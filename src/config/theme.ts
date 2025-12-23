// Theme configuration - easily customizable later
// This file centralizes all design tokens for future customization

export const theme = {
  // Colors by team - can be customized later
  teams: {
    village: {
      primary: '#3b82f6', // blue-500
      secondary: '#60a5fa', // blue-400
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/50',
    },
    loups: {
      primary: '#ef4444', // red-500
      secondary: '#f87171', // red-400
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/50',
    },
    solo: {
      primary: '#a855f7', // purple-500
      secondary: '#c084fc', // purple-400
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/50',
    },
  },

  // Game phases
  phases: {
    jour: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      icon: '☀️',
    },
    nuit: {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-400',
      icon: '🌙',
    },
    conseil: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      icon: '⚖️',
    },
    lobby: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      icon: '⏳',
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
