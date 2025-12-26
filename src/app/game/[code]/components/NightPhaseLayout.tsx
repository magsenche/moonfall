/**
 * NightPhaseLayout - Night-specific layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 * Shows role-specific actions for wolves, seer, witch, etc.
 */

'use client';

import { motion } from 'framer-motion';
import { MotionCard, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useGame } from '../context';

import {
  PlayerRoleCard,
  WolfPack,
  WolfNightVote,
  WolfChatPanel,
  SeerPowerPanel,
  WitchNightPanel,
} from './index';

export function NightPhaseLayout() {
  const {
    game,
    currentPlayerId,
    currentPlayer,
    currentRole,
    roleConfig,
    isWolf,
    isSeer,
    isLittleGirl,
    isWitch,
    wolves,
    alivePlayers,
    isAlive,
    nightActions,
    wolfChat,
  } = useGame();

  return (
    <div className="space-y-4">
      {/* Night atmosphere instruction */}
      <MotionCard
        variant="sticker"
        rotation={-0.5}
        className="border-indigo-500/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <motion.p 
              className="text-4xl mb-2"
              animate={{ opacity: [1, 0.5, 1], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🌙
            </motion.p>
            <h3 className="font-black text-white text-lg mb-2" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
              La nuit tombe sur le village
            </h3>
            <p className="text-slate-300 text-sm">
              {isWolf
                ? '🐺 Concertez-vous avec votre meute pour choisir une victime.'
                : isSeer
                  ? "👁️ Vous pouvez sonder l'âme d'un joueur."
                  : isWitch
                    ? '🧪 Utilisez vos potions avec sagesse.'
                    : isLittleGirl
                      ? '👀 Vous espionnez discrètement les loups...'
                      : '😴 Le village dort. Attendez le lever du jour...'}
            </p>
          </div>
        </CardContent>
      </MotionCard>

      {/* Player's Role Card */}
      {currentRole && roleConfig && <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />}

      {/* Wolf teammates */}
      {isWolf && <WolfPack wolves={wolves} />}

      {/* Wolf Night Vote */}
      {isWolf && isAlive && (
        <WolfNightVote
          alivePlayers={alivePlayers}
          wolves={wolves}
          nightTarget={nightActions.nightTarget}
          confirmedNightTarget={nightActions.confirmedNightTarget}
          hasNightVoted={nightActions.hasNightVoted}
          isNightVoting={nightActions.isNightVoting}
          nightVoteError={nightActions.nightVoteError}
          onSelectTarget={nightActions.setNightTarget}
          onSubmitVote={nightActions.submitNightVote}
        />
      )}

      {/* Wolf Chat - Also visible to Petite Fille (read-only) */}
      {(isWolf || isLittleGirl) && (
        <WolfChatPanel
          messages={wolfChat.wolfMessages}
          newMessage={wolfChat.newMessage}
          isSendingMessage={wolfChat.isSendingMessage}
          currentPlayerId={currentPlayerId}
          isAlive={isAlive}
          onMessageChange={wolfChat.setNewMessage}
          onSendMessage={wolfChat.sendWolfMessage}
          readOnly={isLittleGirl}
        />
      )}

      {/* Seer Power */}
      {isSeer && isAlive && (
        <SeerPowerPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          seerTarget={nightActions.seerTarget}
          seerResult={nightActions.seerResult}
          seerHistory={nightActions.seerHistory}
          hasUsedSeerPower={nightActions.hasUsedSeerPower}
          isUsingSeerPower={nightActions.isUsingSeerPower}
          seerError={nightActions.seerError}
          onSelectTarget={nightActions.setSeerTarget}
          onUsePower={nightActions.useSeerPower}
        />
      )}

      {/* Witch Power */}
      {isWitch && isAlive && (
        <WitchNightPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Villagers just wait */}
      {!isWolf && !isSeer && !isWitch && !isLittleGirl && (
        <MotionCard 
          variant="sticker" 
          rotation={0.5}
          className="border-zinc-600"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <CardContent className="py-8 text-center">
            <motion.p 
              className="text-5xl mb-3"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              😴
            </motion.p>
            <p className="text-slate-400 text-sm">
              Vous dormez paisiblement... en espérant vous réveiller demain.
            </p>
          </CardContent>
        </MotionCard>
      )}
    </div>
  );
}
