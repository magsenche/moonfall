'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MISSION_TEMPLATES, 
  MISSION_TYPE_LABELS, 
  MISSION_CATEGORY_LABELS,
  VALIDATION_TYPE_LABELS,
  REWARD_TYPE_LABELS,
  CATEGORY_ICONS,
  type MissionType,
  type MissionCategory,
  type MissionValidationType,
  type RewardType,
  type AuctionData,
  type MissionTemplate
} from '@/lib/missions';

interface Player {
  id: string;
  pseudo: string;
  is_alive: boolean;
  is_mj: boolean;
}

interface MissionFormProps {
  gameCode: string;
  players: Player[];
  creatorId: string;
  onMissionCreated: () => void;
  onCancel: () => void;
}

type FormMode = 'template' | 'custom';

export function MissionForm({ 
  gameCode, 
  players, 
  creatorId, 
  onMissionCreated, 
  onCancel 
}: MissionFormProps) {
  const [mode, setMode] = useState<FormMode>('template');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MissionTemplate | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [missionType, setMissionType] = useState<MissionType>('individual');
  const [category, setCategory] = useState<MissionCategory>('challenge');
  const [validationType, setValidationType] = useState<MissionValidationType>('mj');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | undefined>(undefined);
  const [rewardType, setRewardType] = useState<RewardType>('none');
  const [rewardDescription, setRewardDescription] = useState('');
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [sabotageAllowed, setSabotageAllowed] = useState(false);
  const [assignedToMultiple, setAssignedToMultiple] = useState<string[]>([]);
  
  // Auction state
  const [auctionMinBid, setAuctionMinBid] = useState(1);
  const [auctionMaxBid, setAuctionMaxBid] = useState<number | undefined>(undefined);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alivePlayers = players.filter(p => p.is_alive && !p.is_mj);

  const handleSelectTemplate = (template: MissionTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description);
    setMissionType(template.mission_type);
    setCategory(template.category);
    setValidationType(template.validation_type);
    setTimeLimitSeconds(template.time_limit_seconds);
    setRewardType(template.reward_type ?? 'none');
    setRewardDescription(template.reward_description ?? '');
    setPenaltyDescription(template.penalty_description ?? '');
    setExternalUrl(template.external_url ?? '');
    setSabotageAllowed(template.sabotage_allowed ?? false);
    setMode('custom'); // Switch to custom to allow editing
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Titre et description requis');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build auction data if applicable
      let auctionData: AuctionData | undefined;
      if (missionType === 'auction') {
        auctionData = {
          min_bid: auctionMinBid,
          max_bid: auctionMaxBid,
          current_highest_bid: 0,
        };
      }

      const response = await fetch(`/api/games/${gameCode}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          missionType,
          category,
          validationType,
          timeLimitSeconds,
          rewardType,
          rewardDescription: rewardDescription || undefined,
          penaltyDescription: penaltyDescription || undefined,
          externalUrl: externalUrl || undefined,
          sabotageAllowed,
          auctionData,
          assignedToMultiple: missionType === 'auction' ? [] : assignedToMultiple, // Auction auto-assigns all
          creatorId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      onMissionCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setAssignedToMultiple(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Template selection view
  if (mode === 'template' && !selectedTemplate) {
    return (
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">🎯 Nouvelle Mission</h3>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMode('custom')}
              className="text-xs"
            >
              ✏️ Mission libre
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Category selector */}
        {!selectedCategory ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-3">Choisir une catégorie :</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MISSION_TEMPLATES).map(([cat, templates]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors"
                >
                  <div className="text-lg mb-1">{CATEGORY_ICONS[cat as MissionCategory] || '📋'}</div>
                  <div className="text-sm font-medium text-white capitalize">{cat}</div>
                  <div className="text-xs text-slate-400">{templates.length} modèle{templates.length > 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-slate-400 hover:text-white"
              >
                ← 
              </button>
              <p className="text-sm text-slate-400">
                {CATEGORY_ICONS[selectedCategory as MissionCategory]} {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {MISSION_TEMPLATES[selectedCategory]?.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium text-white text-sm">{template.title}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{template.description}</div>
                  {template.reward_type && template.reward_type !== 'none' && (
                    <div className="text-xs text-amber-400 mt-1">
                      {REWARD_TYPE_LABELS[template.reward_type]}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Custom form view
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">
          {selectedTemplate ? '📝 Modifier le modèle' : '✏️ Mission libre'}
        </h3>
        <div className="flex gap-2">
          {selectedTemplate && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSelectedTemplate(null);
                setMode('template');
              }}
            >
              ← Modèles
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel}>✕</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-2 rounded mb-3">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title & Description */}
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la mission"
            className="bg-slate-700 border-slate-600"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description détaillée..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm min-h-[80px]"
          />
        </div>

        {/* Type & Category */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Type</label>
            <select
              value={missionType}
              onChange={(e) => setMissionType(e.target.value as MissionType)}
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              {Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MissionCategory)}
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              {Object.entries(MISSION_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation & Reward */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Validation</label>
            <select
              value={validationType}
              onChange={(e) => setValidationType(e.target.value as MissionValidationType)}
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              {Object.entries(VALIDATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Récompense</label>
            <select
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value as RewardType)}
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              {Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time limit */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            ⏱️ Temps limite (optionnel)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={timeLimitSeconds ? Math.floor(timeLimitSeconds / 60) : ''}
              onChange={(e) => setTimeLimitSeconds(e.target.value ? parseInt(e.target.value) * 60 : undefined)}
              placeholder="Minutes"
              className="bg-slate-700 border-slate-600 w-24"
            />
            <span className="text-slate-400 text-sm">minutes</span>
          </div>
        </div>

        {/* Auction specific */}
        {missionType === 'auction' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="text-sm font-medium text-amber-400 mb-2">💰 Paramètres enchère</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Enchère min</label>
                <Input
                  type="number"
                  min={1}
                  value={auctionMinBid}
                  onChange={(e) => setAuctionMinBid(parseInt(e.target.value) || 1)}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Enchère max (optionnel)</label>
                <Input
                  type="number"
                  value={auctionMaxBid ?? ''}
                  onChange={(e) => setAuctionMaxBid(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Illimité"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Tous les joueurs vivants peuvent enchérir. Le plus offrant devra réaliser son défi.
            </p>
          </div>
        )}

        {/* External URL */}
        {(category === 'external' || validationType === 'external') && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">🔗 URL du jeu externe</label>
            <Input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="bg-slate-700 border-slate-600"
            />
          </div>
        )}

        {/* Reward description */}
        {rewardType !== 'none' && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description récompense</label>
            <Input
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="Détail de la récompense..."
              className="bg-slate-700 border-slate-600"
            />
          </div>
        )}

        {/* Player assignment (not for auction) */}
        {missionType !== 'auction' && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              👥 Assigner à des joueurs (optionnel)
            </label>
            <div className="flex flex-wrap gap-1">
              {alivePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => togglePlayerSelection(player.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    assignedToMultiple.includes(player.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {player.pseudo}
                </button>
              ))}
            </div>
            {missionType === 'competitive' && assignedToMultiple.length < 2 && (
              <p className="text-xs text-amber-400 mt-1">
                ⚠️ Une mission compétitive nécessite au moins 2 joueurs
              </p>
            )}
          </div>
        )}

        {/* Sabotage toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sabotageAllowed}
            onChange={(e) => setSabotageAllowed(e.target.checked)}
            className="rounded border-slate-600"
          />
          <span className="text-sm text-slate-300">🎭 Sabotage autorisé</span>
        </label>

        {/* Submit */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="flex-1"
          >
            {isSubmitting ? '⏳ Création...' : '✓ Lancer la mission'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>
    </Card>
  );
}
