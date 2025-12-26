/**
 * NightPhaseLayout - Night-specific layout
 *
 * Uses GameContext - no props needed.
 * Shows role-specific actions for wolves, seer, witch, etc.
 */

'use client';

import { Card, CardContent } from '@/components/ui';
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
      <Card
        className={cn(
          'border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 to-slate-900/50'
        )}
      >
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <p className="text-3xl mb-2">🌙</p>
            <h3 className="font-bold text-white mb-2">La nuit tombe sur le village</h3>
            <p className="text-slate-400 text-sm">
              {isWolf
                ? 'Concertez-vous avec votre meute pour choisir une victime.'
                : isSeer
                  ? "Vous pouvez sonder l'âme d'un joueur."
                  : isWitch
                    ? 'Utilisez vos potions avec sagesse.'
                    : isLittleGirl
                      ? 'Vous espionnez discrètement les loups...'
                      : 'Le village dort. Attendez le lever du jour...'}
            </p>
          </div>
        </CardContent>
      </Card>

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
        <Card className="border-slate-700/50">
          <CardContent className="py-8 text-center">
            <p className="text-4xl mb-3">😴</p>
            <p className="text-slate-400 text-sm">
              Vous dormez paisiblement... en espérant vous réveiller demain.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
