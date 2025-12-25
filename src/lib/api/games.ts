/**
 * Games API - All game-related API calls
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { GameSettings } from '@/types/game';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JoinGameResponse {
  player: {
    id: string;
    pseudo: string;
    game_id: string;
  };
}

export interface VoteResponse {
  success: boolean;
  votesCount: number;
  totalPlayers: number;
}

export interface VoteResolveResponse {
  eliminated: string | null;
  voteCounts: Record<string, number>;
}

export interface NightVoteResponse {
  success: boolean;
}

export interface NightVoteStatusResponse {
  voted: number;
  total: number;
  canResolve: boolean;
}

export interface NightResolveResponse {
  killed: string | null;
  // Error case
  error?: string;
  canForce?: boolean;
  voted?: number;
  total?: number;
}

export interface SeerPowerResponse {
  result: {
    targetName: string;
    roleName: string;
    team: string;
  };
}

export interface WolfMessage {
  id: string;
  message: string;
  created_at: string;
  player: { id: string; pseudo: string } | null;
}

export interface WolfChatResponse {
  messages: WolfMessage[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  mission_type?: string | null;
  category?: string | null;
  validation_type?: string | null;
  reward_type?: string | null;
  reward_description?: string | null;
  penalty_description?: string | null;
  time_limit_seconds?: number | null;
  external_url?: string | null;
  deadline?: string | null;
  auction_data?: {
    min_bid?: number;
    max_bid?: number;
    current_highest_bid?: number;
    current_highest_bidder?: string;
  } | null;
  assigned_players?: {
    id: string;
    pseudo: string;
    status: string;
    bid?: number;
    score?: number;
  }[];
  winner?: { id: string; pseudo: string } | null;
}

export interface MissionsResponse {
  missions: Mission[];
}

export interface SettingsResponse {
  settings: GameSettings;
}

export interface StartGameResponse {
  success: boolean;
  game: {
    id: string;
    status: string;
  };
}

export interface PhaseChangeResponse {
  success: boolean;
  phase: string;
  phase_ends_at: string | null;
}

export interface BidResponse {
  success: boolean;
  current_bid: number;
}

export interface SubmitMissionResponse {
  success: boolean;
  status: string;
}

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  mission_type: string;
  category: string;
  validation_type: string;
  time_limit_seconds?: number | null;
  reward_type?: string | null;
  reward_description?: string | null;
  penalty_description?: string | null;
  external_url?: string | null;
  sabotage_allowed?: boolean;
}

export interface MissionTemplatesResponse {
  templates: MissionTemplate[];
  byCategory: Record<string, MissionTemplate[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Join / Create
// ─────────────────────────────────────────────────────────────────────────────

export function joinGame(gameCode: string, pseudo: string) {
  return apiPost<JoinGameResponse>(`/api/games/${gameCode}/join`, { pseudo });
}

export function rejoinGame(gameCode: string, pseudo: string) {
  return apiPost<JoinGameResponse>(`/api/games/${gameCode}/join`, { 
    pseudo, 
    rejoin: true 
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Actions
// ─────────────────────────────────────────────────────────────────────────────

export function startGame(gameCode: string) {
  return apiPost<StartGameResponse>(`/api/games/${gameCode}/start`);
}

export function changePhase(gameCode: string, phase: string) {
  return apiPost<PhaseChangeResponse>(`/api/games/${gameCode}/phase`, { phase });
}

// ─────────────────────────────────────────────────────────────────────────────
// Voting
// ─────────────────────────────────────────────────────────────────────────────

export function submitVote(gameCode: string, voterId: string, targetId: string | null) {
  return apiPost<VoteResponse>(`/api/games/${gameCode}/vote`, {
    voterId,
    targetId,
    voteType: 'jour',
  });
}

export function resolveVote(gameCode: string) {
  return apiPost<VoteResolveResponse>(`/api/games/${gameCode}/vote/resolve`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Night Actions
// ─────────────────────────────────────────────────────────────────────────────

export function submitNightVote(gameCode: string, visitorId: string, targetId: string) {
  return apiPost<NightVoteResponse>(`/api/games/${gameCode}/vote/night`, {
    visitorId,
    targetId,
  });
}

export function getNightVoteStatus(gameCode: string) {
  return apiGet<NightVoteStatusResponse>(`/api/games/${gameCode}/vote/night/resolve`);
}

export function resolveNightVote(gameCode: string, force = false) {
  return apiPost<NightResolveResponse>(`/api/games/${gameCode}/vote/night/resolve`, { force });
}

export function useSeerPower(gameCode: string, playerId: string, targetId: string) {
  return apiPost<SeerPowerResponse>(`/api/games/${gameCode}/power/seer`, {
    playerId,
    targetId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wolf Chat
// ─────────────────────────────────────────────────────────────────────────────

export function getWolfChat(gameCode: string) {
  return apiGet<WolfChatResponse>(`/api/games/${gameCode}/wolf-chat`);
}

export function sendWolfMessage(gameCode: string, playerId: string, message: string) {
  return apiPost<{ success: boolean }>(`/api/games/${gameCode}/wolf-chat`, {
    playerId,
    message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Missions
// ─────────────────────────────────────────────────────────────────────────────

export function getMissionTemplates() {
  return apiGet<MissionTemplatesResponse>('/api/mission-templates');
}

export function getMissions(gameCode: string) {
  return apiGet<MissionsResponse>(`/api/games/${gameCode}/missions`);
}

export function createMission(gameCode: string, missionData: {
  creatorId: string;
  title: string;
  description: string;
  assignedPlayerIds?: string[];
  missionType?: string;
  category?: string;
  validationType?: string;
  rewardType?: string;
  rewardDescription?: string;
  penaltyDescription?: string;
  timeLimitSeconds?: number;
  externalUrl?: string;
  deadline?: string;
  auctionData?: { min_bid?: number; max_bid?: number };
  difficulty?: number;
}) {
  return apiPost<{ mission: Mission }>(`/api/games/${gameCode}/missions`, missionData);
}

export function updateMission(gameCode: string, missionId: string, updates: {
  status?: string;
  validatorId?: string;
  action?: string;
  playerId?: string;
  winnerId?: string;
}) {
  return apiPatch<{ success: boolean }>(`/api/games/${gameCode}/missions/${missionId}`, updates);
}

export function submitMissionBid(gameCode: string, missionId: string, playerId: string, bid: number) {
  return apiPost<BidResponse>(`/api/games/${gameCode}/missions/${missionId}/bid`, {
    playerId,
    bid,
  });
}

export function missionBidAction(gameCode: string, missionId: string, playerId: string, action: 'close_bidding' | 'declare_winner' | 'declare_failure') {
  return apiPatch<{ success: boolean }>(`/api/games/${gameCode}/missions/${missionId}/bid`, {
    playerId,
    action,
  });
}

export function submitMissionScore(gameCode: string, missionId: string, playerId: string, score: number) {
  return apiPost<SubmitMissionResponse>(`/api/games/${gameCode}/missions/${missionId}/submit`, {
    playerId,
    score,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

export function getSettings(gameCode: string) {
  return apiGet<SettingsResponse>(`/api/games/${gameCode}/settings`);
}

export function updateSettings(gameCode: string, playerId: string, settings: Partial<GameSettings>) {
  return apiPatch<{ success: boolean }>(`/api/games/${gameCode}/settings`, {
    playerId,
    settings,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop & Points
// ─────────────────────────────────────────────────────────────────────────────

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect_type: string;
  icon: string | null;
  max_per_player: number | null;
  max_per_game: number | null;
  available_phases: string[] | null;
  usable_phases: string[] | null;
  // Enriched fields when playerId provided
  purchased_count_player?: number;
  purchased_count_game?: number;
  can_buy?: boolean;
}

export interface PlayerPurchase {
  id: string;
  shop_item_id: string;
  cost_paid: number;
  purchased_at: string;
  used_at: string | null;
  phase_used: number | null;
  target_player_id: string | null;
  item_name?: string;
  item_icon?: string;
  effect_type?: string | null;
}

export interface ShopPlayerData {
  id: string;
  pseudo: string;
  points: number;
  purchases: PlayerPurchase[];
  purchaseCounts: Record<string, number>;
  unusedPowers: PlayerPurchase[];
}

export interface ShopResponse {
  items: ShopItem[];
  player: ShopPlayerData | null;
}

export interface PurchaseResponse {
  success: boolean;
  purchase: {
    id: string;
    item: {
      name: string;
      icon: string | null;
      effect_type: string;
    };
    cost_paid: number;
  };
  new_balance: number;
}

export interface UsePowerResponse {
  success: boolean;
  effect_type: string;
  result: {
    message: string;
    target_name?: string;
    is_wolf?: boolean;
    expires_at?: string;
    [key: string]: unknown;
  };
}

export function getShop(gameCode: string, playerId?: string) {
  const params = playerId ? `?playerId=${playerId}` : '';
  return apiGet<ShopResponse>(`/api/games/${gameCode}/shop${params}`);
}

export function purchaseItem(gameCode: string, playerId: string, itemId: string) {
  return apiPost<PurchaseResponse>(`/api/games/${gameCode}/shop`, {
    playerId,
    itemId,
  });
}

export function activatePower(gameCode: string, purchaseId: string, playerId: string, targetPlayerId?: string) {
  return apiPost<UsePowerResponse>(`/api/games/${gameCode}/shop/${purchaseId}/use`, {
    playerId,
    targetPlayerId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bots (dev/test helpers)
// ─────────────────────────────────────────────────────────────────────────────

interface BotsResponse {
  success: boolean;
  botsCreated?: number;
  botsRemoved?: number;
  bots?: Array<{ id: string; pseudo: string }>;
}

export function addBots(gameCode: string, mjPlayerId: string, count: number = 5) {
  return apiPost<BotsResponse>(`/api/games/${gameCode}/bots`, {
    mjPlayerId,
    count,
  });
}

export function removeBots(gameCode: string, mjPlayerId: string) {
  return apiDelete<BotsResponse>(`/api/games/${gameCode}/bots`, {
    mjPlayerId,
  });
}
