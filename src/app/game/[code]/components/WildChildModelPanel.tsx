/**
 * WildChildModelPanel - Wild Child model selection at game start
 * Shows during the first night or lobby to select a "model" player
 * Y2K Sticker aesthetic
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardHeader, CardTitle, CardContent, MotionButton } from '@/components/ui';
import { PlayerAvatar } from '@/components/game';
import { cn } from '@/lib/utils';
import type { PartialPlayer } from '../hooks/types';

interface WildChildModelPanelProps {
  alivePlayers: PartialPlayer[];
  currentPlayerId: string | null;
  gameCode: string;
  gamePhase: number;
}

interface WildChildStatus {
  hasChosenModel: boolean;
  modelPlayerId: string | null;
  modelPlayerName: string | null;
  isTransformed: boolean;
}

export function WildChildModelPanel({
  alivePlayers,
  currentPlayerId,
  gameCode,
  gamePhase,
}: WildChildModelPanelProps) {
  const [status, setStatus] = useState<WildChildStatus>({
    hasChosenModel: false,
    modelPlayerId: null,
    modelPlayerName: null,
    isTransformed: false,
  });
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/games/${gameCode}/power/wild-child?playerId=${currentPlayerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus({
            hasChosenModel: data.hasChosenModel,
            modelPlayerId: data.modelPlayerId,
            modelPlayerName: data.modelPlayerName,
            isTransformed: data.isTransformed,
          });
        }
      } catch (err) {
        console.error('Error fetching wild child status:', err);
      }
    };

    if (currentPlayerId) {
      fetchStatus();
    }
  }, [gameCode, currentPlayerId, gamePhase]);

  const chooseModel = async () => {
    if (!selectedModel || status.hasChosenModel) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameCode}/power/wild-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          modelPlayerId: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du choix du modèle');
      }

      const modelName = alivePlayers.find(p => p.id === selectedModel)?.pseudo;
      setStatus({
        hasChosenModel: true,
        modelPlayerId: selectedModel,
        modelPlayerName: modelName || null,
        isTransformed: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter targets (can't choose self)
  const validTargets = alivePlayers.filter(
    p => p.id !== currentPlayerId && !p.is_mj
  );

  // Check if model is still alive
  const modelPlayer = alivePlayers.find(p => p.id === status.modelPlayerId);
  const isModelAlive = modelPlayer?.is_alive !== false;

  // If transformed, show wolf message
  if (status.isTransformed) {
    return (
      <MotionCard
        variant="sticker"
        rotation={2}
        className="mb-6 border-red-500/50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🐺
            </motion.span>
            Transformation !
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 360] }}
            transition={{ type: 'spring', damping: 10 }}
            className="text-6xl mb-4"
          >
            🐺
          </motion.div>
          <p className="text-red-400 font-bold text-lg mb-2">
            Votre modèle est mort !
          </p>
          <p className="text-white font-medium mb-4">
            Vous êtes maintenant un Loup-Garou !
          </p>
          <p className="text-slate-400 text-sm">
            La rage vous envahit... Rejoignez la meute et dévorez le village !
          </p>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      variant="sticker"
      rotation={-0.5}
      className="mb-6 border-emerald-500/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <CardHeader>
        <CardTitle className="text-emerald-400 flex items-center gap-2">
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🧒
          </motion.span>
          Enfant Sauvage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {status.hasChosenModel ? (
            <motion.div
              key="chosen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.p
                className="text-4xl mb-3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isModelAlive ? '💚' : '💔'}
              </motion.p>
              <p className="text-emerald-400 font-bold text-lg mb-2">
                Votre modèle : {status.modelPlayerName}
              </p>
              {isModelAlive ? (
                <>
                  <p className="text-slate-400 text-sm mb-4">
                    Tant qu'il/elle vit, vous restez du côté du village.
                  </p>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-xs">
                      ⚠️ Si votre modèle meurt, vous deviendrez un Loup-Garou !
                    </p>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
                >
                  <p className="text-red-400 text-sm font-medium">
                    🐺 Votre modèle est mort... La transformation approche !
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 text-sm text-center">
                  🧒 Choisissez un joueur comme modèle. S'il meurt, vous deviendrez un Loup-Garou !
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {validTargets.map((player, i) => (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedModel(player.id)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                      selectedModel === player.id
                        ? 'bg-emerald-500/30 border-2 border-emerald-500 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.5)]'
                        : 'bg-zinc-800/50 hover:bg-emerald-900/20 border-2 border-transparent'
                    )}
                  >
                    <PlayerAvatar
                      playerId={player.id}
                      pseudo={player.pseudo}
                      isAlive={player.is_alive ?? true}
                      size="md"
                    />
                    <span className="text-sm text-white font-medium truncate max-w-full">
                      {player.pseudo}
                    </span>
                  </motion.button>
                ))}
              </div>

              <MotionButton
                variant="sticker"
                onClick={chooseModel}
                disabled={!selectedModel || isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 border-emerald-400"
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    Choix en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    💚 Choisir comme modèle
                  </span>
                )}
              </MotionButton>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </MotionCard>
  );
}
