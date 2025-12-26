/**
 * GameLayout - Main game UI orchestrator (Y2K Edition)
 *
 * Uses GameContext to render the appropriate view based on game state.
 * Implements the Y2K/Sticker/Scrapbook aesthetic with PhaseBackground.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context';
import { getRoleConfig } from '@/config/roles';
import { cn } from '@/lib/utils';
import { GameOver, TipToast, RulesButton, PhaseBackground } from '@/components/game';

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
    <main className="min-h-screen safe-area-top safe-area-bottom">
      {/* Y2K Phase Background with floating avatars */}
      <PhaseBackground 
        phase={gameStatus as 'lobby' | 'jour' | 'nuit' | 'conseil' | 'terminee'} 
        players={game.players}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Unified Header - Dynamic Island style */}
        <GameHeader />

        {/* Phase-specific layout with animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={gameStatus}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {gameStatus === 'nuit' && <NightPhaseLayout />}
            {gameStatus === 'jour' && <DayPhaseLayout />}
            {gameStatus === 'conseil' && <CouncilPhaseLayout />}
          </motion.div>
        </AnimatePresence>

        {/* Common Footer - Floating action bar at bottom */}
        <GameFooter />
      </div>

      {/* Hunter Death Modal */}
      <AnimatePresence>
        {ui.showHunterModal && currentPlayerId && <HunterDeathModal />}
      </AnimatePresence>

      {/* Tip Toast */}
      <AnimatePresence>
        {tips.currentTipId && (
          <TipToast tipId={tips.currentTipId} show={true} onDismiss={tips.dismissCurrentTip} />
        )}
      </AnimatePresence>

      {/* Floating Rules Button - Sticker style */}
      <RulesButton variant="floating" />
    </main>
  );
}
