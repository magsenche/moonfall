'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { submitMissionBid, submitMissionScore, updateMission, missionBidAction, ApiError } from '@/lib/api';
import {
  CATEGORY_ICONS,
  MISSION_TYPE_LABELS,
  REWARD_TYPE_LABELS,
  type AuctionData,
  type MissionType,
  type MissionCategory,
  type MissionValidationType,
  type RewardType,
} from '@/lib/missions';

interface AssignedPlayer {
  id: string;
  pseudo: string;
  status: string;
  bid?: number;
  score?: number;
  submitted_at?: string;
}

interface MissionCardProps {
  mission: {
    id: string;
    title: string;
    description: string;
    status: string;
    mission_type?: MissionType | null;
    category?: MissionCategory | null;
    validation_type?: MissionValidationType | null;
    reward_type?: RewardType | null;
    reward_description?: string | null;
    penalty_description?: string | null;
    external_url?: string | null;
    time_limit_seconds?: number | null;
    deadline?: string | null;
    auction_data?: AuctionData | null;
    winner?: { id: string; pseudo: string } | null;
    assigned_players: AssignedPlayer[];
    difficulty?: number | null;
  };
  currentPlayerId: string;
  isMJ: boolean;
  isAutoMode?: boolean;
  gameCode: string;
  onUpdate: () => void;
}

export function MissionCard({
  mission,
  currentPlayerId,
  isMJ,
  isAutoMode = false,
  gameCode,
  onUpdate,
}: MissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);

  const isAuction = mission.mission_type === 'auction';
  const isActive = mission.status === 'in_progress';
  const auctionData = mission.auction_data as AuctionData | null;
  const biddingClosed = !!auctionData?.bid_phase_ends_at;
  
  const myAssignment = mission.assigned_players.find(p => p.id === currentPlayerId);
  const isAssigned = !!myAssignment;
  const hasSubmitted = !!myAssignment?.submitted_at;
  const amHighestBidder = auctionData?.current_highest_bidder === currentPlayerId;

  // Timer countdown
  useEffect(() => {
    if (!mission.deadline || mission.status !== 'in_progress') {
      setTimeRemaining(null);
      return;
    }

    const deadline = new Date(mission.deadline).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [mission.deadline, mission.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Status badge colors
  const statusColors: Record<string, string> = {
    pending: 'bg-slate-500/20 text-slate-300',
    in_progress: 'bg-amber-500/20 text-amber-300',
    success: 'bg-green-500/20 text-green-300',
    failed: 'bg-red-500/20 text-red-300',
    cancelled: 'bg-slate-500/20 text-slate-400',
  };

  const handleBid = async () => {
    if (!bidAmount || bidAmount < 1) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await submitMissionBid(gameCode, mission.id, currentPlayerId, bidAmount);
      onUpdate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitScore = async () => {
    const score = parseInt(scoreInput);
    if (isNaN(score)) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await submitMissionScore(gameCode, mission.id, currentPlayerId, score);
      onUpdate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMJAction = async (action: 'validate' | 'fail' | 'cancel' | 'close_bidding' | 'declare_winner' | 'declare_failure', winnerId?: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (['close_bidding', 'declare_winner', 'declare_failure'].includes(action)) {
        await missionBidAction(gameCode, mission.id, currentPlayerId, action as 'close_bidding' | 'declare_winner' | 'declare_failure');
      } else {
        await updateMission(gameCode, mission.id, { 
          playerId: currentPlayerId, 
          action,
          winnerId: action === 'validate' ? winnerId : undefined,
        });
      }
      setSelectedWinnerId(null);
      onUpdate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card 
      className={`p-3 transition-all ${
        mission.status === 'success' ? 'bg-green-500/10 border-green-500/30' :
        mission.status === 'failed' ? 'bg-red-500/10 border-red-500/30' :
        mission.status === 'cancelled' ? 'bg-slate-500/10 border-slate-500/30 opacity-50' :
        isActive ? 'bg-amber-500/10 border-amber-500/30' :
        'bg-slate-800/50 border-slate-700'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">
              {CATEGORY_ICONS[mission.category as MissionCategory] || '📋'}
            </span>
            <h4 className="font-medium text-white">{mission.title}</h4>
            {mission.mission_type && (
              <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                {MISSION_TYPE_LABELS[mission.mission_type]}
              </span>
            )}
            {/* Difficulty stars */}
            {mission.difficulty && mission.difficulty > 0 && (
              <span className="text-xs text-amber-400" title={`${mission.difficulty * 2} points`}>
                {'⭐'.repeat(mission.difficulty)}
              </span>
            )}
          </div>
          
          {/* Timer & Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded ${statusColors[mission.status] || ''}`}>
              {mission.status === 'pending' && '⏳ En attente'}
              {mission.status === 'in_progress' && '🔥 En cours'}
              {mission.status === 'success' && '✅ Réussie'}
              {mission.status === 'failed' && '❌ Échouée'}
              {mission.status === 'cancelled' && '🚫 Annulée'}
            </span>
            
            {timeRemaining !== null && isActive && (
              <span className={`font-mono ${timeRemaining < 60 ? 'text-red-400' : 'text-slate-400'}`}>
                ⏱️ {formatTime(timeRemaining)}
              </span>
            )}
          </div>
        </div>
        
        <span className="text-slate-400 text-sm">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
          <p className="text-sm text-slate-300">{mission.description}</p>
          
          {/* Reward */}
          {mission.reward_type && mission.reward_type !== 'none' && (
            <div className="text-sm text-amber-400">
              🏆 {REWARD_TYPE_LABELS[mission.reward_type]}
              {mission.reward_description && ` - ${mission.reward_description}`}
            </div>
          )}

          {/* External URL */}
          {mission.external_url && isActive && (
            <a
              href={mission.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-400 hover:underline"
            >
              🔗 Ouvrir le mini-jeu
            </a>
          )}

          {/* Winner display */}
          {mission.winner && (
            <div className="text-sm text-green-400 font-medium">
              👑 Gagnant : {mission.winner.pseudo}
            </div>
          )}

          {/* Auction section */}
          {isAuction && isActive && (
            <div className="bg-amber-500/10 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-amber-400">
                💰 Enchère en cours
              </div>
              
              {/* Current highest bid */}
              <div className="text-sm text-slate-300">
                Meilleure offre : <span className="font-bold text-white">
                  {auctionData?.current_highest_bid ?? 0}
                </span>
                {auctionData?.current_highest_bidder && (
                  <span className="text-slate-400 ml-1">
                    par {mission.assigned_players.find(p => p.id === auctionData.current_highest_bidder)?.pseudo || 'joueur'}
                  </span>
                )}
              </div>

              {/* Player bidding interface (MJ can bid in auto mode) */}
              {(!isMJ || isAutoMode) && isAssigned && !biddingClosed && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={(auctionData?.current_highest_bid ?? 0) + 1}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                    className="w-20 bg-slate-700 border-slate-600"
                  />
                  <Button
                    size="sm"
                    onClick={handleBid}
                    disabled={isSubmitting || bidAmount <= (auctionData?.current_highest_bid ?? 0)}
                  >
                    {isSubmitting ? '...' : 'Enchérir'}
                  </Button>
                  {amHighestBidder && (
                    <span className="text-xs text-green-400">✓ Meilleure offre</span>
                  )}
                </div>
              )}

              {/* Bidding closed - awaiting execution */}
              {biddingClosed && (!isMJ || isAutoMode) && amHighestBidder && (
                <div className="text-sm text-amber-300">
                  🎯 C'est à vous ! Réalisez votre défi de {auctionData?.current_highest_bid}.
                </div>
              )}

              {/* MJ controls for auction */}
              {isMJ && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/30">
                  {!biddingClosed ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMJAction('close_bidding')}
                        disabled={isSubmitting || !auctionData?.current_highest_bidder}
                      >
                        🔒 Clôturer les enchères
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMJAction('cancel')}
                        disabled={isSubmitting}
                      >
                        🚫 Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleMJAction('declare_winner')}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Défi réussi
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleMJAction('declare_failure')}
                        disabled={isSubmitting}
                      >
                        ❌ Défi échoué
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Score submission for competitive missions */}
          {!isAuction && isActive && isAssigned && !hasSubmitted && 
            (mission.validation_type === 'best_score' || mission.validation_type === 'external') && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="Votre score"
                className="w-24 bg-slate-700 border-slate-600"
              />
              <Button
                size="sm"
                onClick={handleSubmitScore}
                disabled={isSubmitting || !scoreInput}
              >
                {isSubmitting ? '...' : 'Soumettre'}
              </Button>
            </div>
          )}

          {/* Assigned players */}
          {mission.assigned_players.length > 0 && !isAuction && (
            <div className="text-sm">
              <span className="text-slate-400">Joueurs :</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {mission.assigned_players.map(player => (
                  <span 
                    key={player.id}
                    className={`px-2 py-0.5 rounded text-xs ${
                      player.status === 'completed' ? 'bg-green-600/30 text-green-300' :
                      player.status === 'failed' ? 'bg-red-600/30 text-red-300' :
                      'bg-slate-600/30 text-slate-300'
                    }`}
                  >
                    {player.pseudo}
                    {player.score !== undefined && ` (${player.score})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MJ standard controls */}
          {isMJ && isActive && !isAuction && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              {/* Winner selection for multi-player non-collective missions */}
              {mission.assigned_players.length > 1 && mission.mission_type !== 'collective' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Gagnant :</span>
                  <select
                    value={selectedWinnerId || ''}
                    onChange={(e) => setSelectedWinnerId(e.target.value || null)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {mission.assigned_players.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.pseudo}
                        {player.score !== undefined && ` (score: ${player.score})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Collective mission note */}
              {mission.mission_type === 'collective' && (
                <p className="text-xs text-slate-400">
                  👥 Mission collective - le village entier réussit ou échoue ensemble
                </p>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleMJAction('validate', mission.mission_type === 'collective' ? undefined : (selectedWinnerId || mission.assigned_players[0]?.id))}
                  disabled={isSubmitting || (mission.assigned_players.length > 1 && mission.mission_type !== 'collective' && !selectedWinnerId)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Valider{mission.mission_type !== 'collective' && mission.assigned_players.length > 1 && selectedWinnerId && ` (${mission.assigned_players.find(p => p.id === selectedWinnerId)?.pseudo})`}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleMJAction('fail')}
                  disabled={isSubmitting}
                >
                  ❌ Échouer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMJAction('cancel')}
                  disabled={isSubmitting}
                >
                  🚫 Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
