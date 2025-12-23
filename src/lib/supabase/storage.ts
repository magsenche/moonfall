// Supabase Storage helpers
// Handles asset URLs for roles, players, and game assets

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Bucket names
export const STORAGE_BUCKETS = {
  ROLE_ASSETS: 'role-assets',
  PLAYER_AVATARS: 'player-avatars',
  GAME_ASSETS: 'game-assets',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Get the public URL for a storage object
 */
export function getStorageUrl(bucket: StorageBucket, path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Get role asset URL
 * @param roleId - The role identifier (e.g., 'loup_garou')
 * @param type - Asset type: 'icon' or 'card'
 */
export function getRoleAssetUrl(roleId: string, type: 'icon' | 'card' = 'icon'): string | null {
  // Will return null if no custom asset exists
  // The component should fall back to emoji/default
  const filename = type === 'icon' ? `${roleId}.png` : `${roleId}-card.png`;
  return getStorageUrl(STORAGE_BUCKETS.ROLE_ASSETS, filename);
}

/**
 * Get player avatar URL
 * @param playerId - The player's user ID
 * @param filename - Optional specific filename
 */
export function getPlayerAvatarUrl(playerId: string, filename?: string): string {
  const file = filename || 'avatar.png';
  return getStorageUrl(STORAGE_BUCKETS.PLAYER_AVATARS, `${playerId}/${file}`);
}

/**
 * Get game asset URL (backgrounds, icons, etc.)
 * @param path - Path within the game-assets bucket
 */
export function getGameAssetUrl(path: string): string {
  return getStorageUrl(STORAGE_BUCKETS.GAME_ASSETS, path);
}

/**
 * Helper to check if a URL is a Supabase storage URL
 */
export function isStorageUrl(url: string): boolean {
  return url.startsWith(SUPABASE_URL);
}

/**
 * Default asset paths for common game elements
 */
export const DEFAULT_ASSETS = {
  // Backgrounds
  backgrounds: {
    night: 'backgrounds/night.webp',
    day: 'backgrounds/day.webp',
    council: 'backgrounds/council.webp',
    lobby: 'backgrounds/lobby.webp',
  },
  // UI elements
  ui: {
    logo: 'ui/logo.png',
    moonIcon: 'ui/moon.svg',
    sunIcon: 'ui/sun.svg',
  },
  // Sound effects (future)
  sounds: {
    wolfHowl: 'sounds/wolf-howl.mp3',
    vote: 'sounds/vote.mp3',
    death: 'sounds/death.mp3',
  },
} as const;
