/**
 * MJControls - Game master control panel
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface MJControlsProps {
  gameStatus: string;
  wolfVoteCount: { voted: number; total: number };
  nightVoteResolveError: string | null;
  showForceConfirm: boolean;
  isChangingPhase: boolean;
  onChangePhase: (phase: string) => void;
  onResolveVote: () => void;
  onResolveNightVote: (force?: boolean) => void;
  onCancelForce: () => void;
  isAutoMode?: boolean;
}

export function MJControls({
  gameStatus,
  wolfVoteCount,
  nightVoteResolveError,
  showForceConfirm,
  isChangingPhase,
  onChangePhase,
  onResolveVote,
  onResolveNightVote,
  onCancelForce,
  isAutoMode = false,
}: MJControlsProps) {
  return (
    <Card className="border border-village-400/30">
      <CardHeader>
        <CardTitle className="text-village-300">
          🎭 Contrôles du Maître du jeu
          {isAutoMode && (
            <span className="ml-2 text-xs font-normal text-village-400">(Auto-Garou)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {gameStatus === 'nuit' && (
          <>
            <div className="text-sm text-moon-100/60 mb-2 text-center">
              🐺 Votes des loups : {wolfVoteCount.voted}/{wolfVoteCount.total}
            </div>
            {showForceConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-400 text-center">
                  ⚠️ {nightVoteResolveError}
                </p>
                <Button
                  className="w-full bg-blood-500 hover:bg-blood-700"
                  onClick={() => onResolveNightVote(true)}
                  disabled={isChangingPhase}
                >
                  ⚡ Forcer la résolution
                </Button>
                <Button
                  className="w-full"
                  variant="ghost"
                  onClick={onCancelForce}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full bg-blood-500 hover:bg-blood-700"
                  onClick={() => onResolveNightVote()}
                  disabled={isChangingPhase}
                >
                  🐺 Résoudre l&apos;attaque des loups
                </Button>
                {nightVoteResolveError && !showForceConfirm && (
                  <p className="text-sm text-blood-400 text-center mt-2">{nightVoteResolveError}</p>
                )}
              </>
            )}
            <Button
              className="w-full mt-2"
              onClick={() => onChangePhase('jour')}
              disabled={isChangingPhase}
            >
              ☀️ Passer au jour (sans attaque)
            </Button>
          </>
        )}

        {gameStatus === 'jour' && (
          <Button
            className="w-full"
            onClick={() => onChangePhase('conseil')}
            disabled={isChangingPhase}
          >
            ⚖️ Ouvrir le conseil
          </Button>
        )}

        {gameStatus === 'conseil' && (
          <Button
            className="w-full"
            onClick={onResolveVote}
            disabled={isChangingPhase}
          >
            🗳️ Résoudre le vote
          </Button>
        )}

        {isChangingPhase && (
          <p className="text-sm text-moon-100/60 text-center">⏳ Changement en cours...</p>
        )}
      </CardContent>
    </Card>
  );
}
