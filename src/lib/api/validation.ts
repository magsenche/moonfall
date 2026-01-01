/**
 * API Validation Schemas - Zod schemas for API input validation
 * 
 * Usage in API routes:
 * import { createGameSchema, parseBody } from '@/lib/api/validation';
 * const result = parseBody(await request.json(), createGameSchema);
 * if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
 * const { name, pseudo } = result.data;
 */

import { z } from 'zod';

// ============================================================================
// Common schemas
// ============================================================================

export const uuidSchema = z.string().uuid('ID invalide');

export const pseudoSchema = z
  .string()
  .min(1, 'Pseudo requis')
  .max(20, 'Pseudo trop long (max 20 caractères)')
  .trim();

export const gameCodeSchema = z
  .string()
  .length(4, 'Code invalide')
  .toUpperCase();

// ============================================================================
// Game routes
// ============================================================================

/** POST /api/games - Create game */
export const createGameSchema = z.object({
  name: z.string().min(1, 'Nom de partie requis').max(50, 'Nom trop long'),
  pseudo: pseudoSchema,
});

/** POST /api/games/[code]/join */
export const joinGameSchema = z.object({
  pseudo: pseudoSchema,
  rejoin: z.boolean().optional(),
});

/** PATCH /api/games/[code]/phase */
export const changePhaseSchema = z.object({
  status: z.enum(['lobby', 'jour', 'nuit', 'conseil', 'terminee']),
  winner: z.enum(['village', 'loups', 'solo']).optional(),
});

/** POST /api/games/[code]/vote */
export const voteSchema = z.object({
  visitorId: uuidSchema,
  targetId: uuidSchema.nullable(),
});

/** POST /api/games/[code]/wolf-chat */
export const wolfChatSchema = z.object({
  playerId: uuidSchema,
  message: z.string().min(1, 'Message vide').max(500, 'Message trop long'),
});

// ============================================================================
// Mission routes
// ============================================================================

/** POST /api/games/[code]/missions */
export const createMissionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  type: z.string().optional(),
  category: z.enum([
    'social', 'challenge', 'quiz', 'external', 
    'photo', 'auction', 'comportement', 'physique', 
    'gameplay', 'viral'
  ]).optional(),
  missionType: z.enum(['individual', 'collective', 'competitive', 'auction']).optional(),
  validationType: z.enum(['mj', 'auto', 'upload', 'external', 'first_wins', 'best_score', 'self']).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  rewardPoints: z.number().min(0).optional(),
  assignedTo: uuidSchema.optional(),
  assignedPlayerIds: z.array(uuidSchema).optional(),
  templateId: uuidSchema.optional(),
});

/** POST /api/games/[code]/missions/[id]/submit */
export const submitMissionSchema = z.object({
  playerId: uuidSchema,
  submissionData: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/games/[code]/missions/[id]/bid */
export const bidMissionSchema = z.object({
  playerId: uuidSchema,
  bidAmount: z.number().min(1),
});

// ============================================================================
// Power routes
// ============================================================================

/** POST /api/games/[code]/power/seer */
export const seerPowerSchema = z.object({
  visitorId: uuidSchema,
  targetId: uuidSchema,
});

/** POST /api/games/[code]/power/witch */
export const witchPowerSchema = z.object({
  playerId: uuidSchema,
  action: z.enum(['heal', 'kill']),
  targetId: uuidSchema.optional(),
});

/** POST /api/games/[code]/power/hunter */
export const hunterPowerSchema = z.object({
  hunterId: uuidSchema,
  targetId: uuidSchema,
});

/** POST /api/games/[code]/power/salvateur */
export const salvateurPowerSchema = z.object({
  salvateurId: uuidSchema,
  targetId: uuidSchema,
});

/** POST /api/games/[code]/power/cupidon */
export const cupidonPowerSchema = z.object({
  cupidonId: uuidSchema,
  player1Id: uuidSchema,
  player2Id: uuidSchema,
});

/** POST /api/games/[code]/power/assassin */
export const assassinPowerSchema = z.object({
  assassinId: uuidSchema,
  targetId: uuidSchema,
});

/** POST /api/games/[code]/power/trublion */
export const trublionPowerSchema = z.object({
  trublionId: uuidSchema,
  player1Id: uuidSchema,
  player2Id: uuidSchema,
});

/** POST /api/games/[code]/power/wild-child */
export const wildChildPowerSchema = z.object({
  childId: uuidSchema,
  modelId: uuidSchema,
});

// ============================================================================
// Shop routes
// ============================================================================

/** POST /api/games/[code]/shop */
export const purchaseItemSchema = z.object({
  playerId: uuidSchema,
  shopItemId: uuidSchema,
});

/** POST /api/games/[code]/shop/[purchaseId]/use */
export const useItemSchema = z.object({
  targetPlayerId: uuidSchema.optional(),
});

// ============================================================================
// Helper function
// ============================================================================

export type ParseResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Parse and validate request body
 * Returns typed data or error message
 */
export function parseBody<T>(body: unknown, schema: z.ZodSchema<T>): ParseResult<T> {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    // Get first error message
    const firstError = result.error.issues[0];
    const path = firstError.path.join('.');
    const message = path ? `${path}: ${firstError.message}` : firstError.message;
    
    return { success: false, error: message };
  }
  
  return { success: true, data: result.data };
}
