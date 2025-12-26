/**
 * GameLayout - Main game UI orchestrator
 *
 * Uses GameContext to render the appropriate view based on game state.
 * Does NOT use TimerContext - timer logic is in GameLogic component.
 * This prevents GameLayout from re-rendering every second.
 * 
 * Only GameHeader uses useTimerContext() for displaying the timer.
 */

'use client';

import { useGame } from '../context';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { GameOver, TipToast, RulesButton } from '@/components/game';

import { SessionRecovery } from './SessionRecovery';
import { HunterDeathModal } from './HunterDeathModal';
import { GameHeader } from './GameHeader';
import { GameFooter } from './GameFooter';
import { LobbyView } from './LobbyView';
import { NightPhaseLayout } from './NightPhaseLayout';
import { DayPhaseLayout } from './DayPhaseLayout';
import { CouncilPhaseLayout } from './CouncilPhaseLayout';

export function GameLayout() {
  const {
    game,
    roles,
    gameStatus,
    currentPlayerId,
    sessionRecovery,
    tips,
    ui,
    router,
  } = useGame();

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Session Recovery
  // ─────────────────────────────────────────────────────────────────────────────

  if (sessionRecovery.showRecovery && !currentPlayerId) {
    return <SessionRecovery />;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Lobby
  // ─────────────────────────────────────────────────────────────────────────────

  if (gameStatus === 'lobby') {
    return <LobbyView />;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Game Over
  // ─────────────────────────────────────────────────────────────────────────────

  if (gameStatus === 'terminee' && ui.gameWinner) {
    const playersForGameOver = game.players
      .filter((p) => !p.is_mj)
      .map((p) => {
        const role = roles.find((r) => r.id === p.role_id);
        const roleConf = role ? getRoleConfig(role.name) : null;
        return {
          pseudo: p.pseudo,
          roleName: roleConf?.displayName || roleConf?.name || role?.name || 'Inconnu',
          team: role?.team || 'village',
          isAlive: p.is_alive !== false,
        };
      });

    return (
      <GameOver
        winner={ui.gameWinner}
        gameName={game.name}
        players={playersForGameOver}
        onPlayAgain={() => router.push('/')}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Game in Progress
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-4">
      {/* Phase-specific background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className={cn(
            'absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-1000',
            gameStatus === 'nuit'
              ? 'bg-indigo-900/30'
              : gameStatus === 'conseil'
                ? 'bg-purple-900/20'
                : 'bg-amber-500/10'
          )}
        />
        <div
          className={cn(
            'absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-1000',
            gameStatus === 'nuit'
              ? 'bg-purple-900/30'
              : gameStatus === 'conseil'
                ? 'bg-red-900/20'
                : 'bg-orange-500/10'
          )}
        />
      </div>

      <div className="max-w-lg mx-auto pt-8">
        {/* Unified Header */}
        <GameHeader />

        {/* Phase-specific layout */}
        {gameStatus === 'nuit' && <NightPhaseLayout />}

        {gameStatus === 'jour' && <DayPhaseLayout />}

        {gameStatus === 'conseil' && <CouncilPhaseLayout />}

        {/* Common Footer */}
        <GameFooter />
      </div>

      {/* Hunter Death Modal */}
      {ui.showHunterModal && currentPlayerId && <HunterDeathModal />}

      {/* Tip Toast */}
      {tips.currentTipId && (
        <TipToast tipId={tips.currentTipId} show={true} onDismiss={tips.dismissCurrentTip} />
      )}

      {/* Floating Rules Button */}
      <RulesButton variant="floating" />
    </main>
  );
}
