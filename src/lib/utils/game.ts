// Generate a random game code (6 characters, uppercase)
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Format a date for display
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calculate time remaining until a deadline
export function getTimeRemaining(deadline: string | Date): {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const total = d.getTime() - Date.now();
  
  if (total <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  return {
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

// Shuffle an array (Fisher-Yates algorithm)
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Distribute roles to players
export function distributeRoles(
  playerIds: string[],
  rolesDistribution: { [roleId: string]: number }
): Map<string, string> {
  const distribution = new Map<string, string>();
  
  // Create array of roles based on distribution
  const roles: string[] = [];
  for (const [roleId, count] of Object.entries(rolesDistribution)) {
    for (let i = 0; i < count; i++) {
      roles.push(roleId);
    }
  }
  
  // Fill remaining with villageois
  while (roles.length < playerIds.length) {
    roles.push('villageois');
  }
  
  // Shuffle roles
  const shuffledRoles = shuffle(roles);
  
  // Assign to players
  playerIds.forEach((playerId, index) => {
    distribution.set(playerId, shuffledRoles[index]);
  });
  
  return distribution;
}

// Count votes and determine winner
export function countVotes(votes: { targetId: string | null }[]): {
  winner: string | null;
  counts: Map<string, number>;
  isTie: boolean;
} {
  const counts = new Map<string, number>();
  
  for (const vote of votes) {
    if (vote.targetId) {
      counts.set(vote.targetId, (counts.get(vote.targetId) || 0) + 1);
    }
  }
  
  if (counts.size === 0) {
    return { winner: null, counts, isTie: false };
  }
  
  // Find max votes
  let maxVotes = 0;
  let winners: string[] = [];
  
  for (const [targetId, count] of counts) {
    if (count > maxVotes) {
      maxVotes = count;
      winners = [targetId];
    } else if (count === maxVotes) {
      winners.push(targetId);
    }
  }
  
  return {
    winner: winners.length === 1 ? winners[0] : null,
    counts,
    isTie: winners.length > 1,
  };
}

// Check win conditions
export function checkWinCondition(players: { isAlive: boolean; role?: { team: string } }[]): {
  gameOver: boolean;
  winner: 'village' | 'loups' | 'solo' | null;
} {
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveWolves = alivePlayers.filter(p => p.role?.team === 'loups');
  const aliveVillagers = alivePlayers.filter(p => p.role?.team === 'village');
  
  // Wolves win if they equal or outnumber villagers
  if (aliveWolves.length >= aliveVillagers.length && aliveWolves.length > 0) {
    return { gameOver: true, winner: 'loups' };
  }
  
  // Village wins if all wolves are dead
  if (aliveWolves.length === 0) {
    return { gameOver: true, winner: 'village' };
  }
  
  // Game continues
  return { gameOver: false, winner: null };
}
