// Player customization configuration
// This file prepares for future player avatars/customization

// Default avatar options - emojis for now, will be images later
export const defaultAvatars = [
  '👤', '🧑', '👩', '👨', '🧔', '👱', '👸', '🤴',
  '🧙', '🧝', '🧛', '🧟', '🦊', '🐻', '🦁', '🐯',
] as const;

// Color options for player customization
export const playerColors = [
  { name: 'blue', class: 'bg-blue-500', text: 'text-blue-400' },
  { name: 'red', class: 'bg-red-500', text: 'text-red-400' },
  { name: 'green', class: 'bg-green-500', text: 'text-green-400' },
  { name: 'purple', class: 'bg-purple-500', text: 'text-purple-400' },
  { name: 'amber', class: 'bg-amber-500', text: 'text-amber-400' },
  { name: 'pink', class: 'bg-pink-500', text: 'text-pink-400' },
  { name: 'cyan', class: 'bg-cyan-500', text: 'text-cyan-400' },
  { name: 'orange', class: 'bg-orange-500', text: 'text-orange-400' },
] as const;

export interface PlayerCustomization {
  avatar: string; // Emoji or image URL
  color: string; // Color class name
  // Future additions:
  // backgroundColor?: string;
  // borderStyle?: string;
  // customImage?: string;
}

// Get a consistent avatar based on player ID (for non-customized players)
export function getDefaultAvatar(playerId: string): string {
  // Use a hash of the player ID to get a consistent emoji
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % defaultAvatars.length;
  return defaultAvatars[index];
}

// Get a consistent color based on player ID
export function getDefaultColor(playerId: string): typeof playerColors[number] {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % playerColors.length;
  return playerColors[index];
}

// Future: load player customization from DB or localStorage
export function getPlayerCustomization(playerId: string): PlayerCustomization {
  // For now, return defaults based on player ID
  return {
    avatar: getDefaultAvatar(playerId),
    color: getDefaultColor(playerId).name,
  };
}
