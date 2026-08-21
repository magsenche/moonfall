/**
 * NightPhaseLayout - Night-specific layout
 * Y2K Sticker aesthetic
 *
 * Uses GameContext - no props needed.
 * Shows role-specific actions for wolves, seer, witch, salvateur, trublion, wild child, etc.
 */

'use client';

import { useGame } from '../context';

import {
  PhaseHint,
  PlayerRoleCard,
  WolfPack,
  WolfNightVote,
  WolfChatPanel,
  SeerPowerPanel,
  WitchNightPanel,
  SalvateurNightPanel,
  TrublionNightPanel,
  WildChildModelPanel,
  CupidonLoversPanel,
  IntuitionNightPanel,
} from './index';

export function NightPhaseLayout() {
  const {
    game,
    currentPlayerId,
    currentRole,
    roleConfig,
    isWolf,
    isSeer,
    isLittleGirl,
    isWitch,
    isSalvateur,
    isTrublion,
    isWildChild,
    isCupidon,
    wolves,
    alivePlayers,
    isAlive,
    nightActions,
    wolfChat,
  } = useGame();

  return (
    <div className="space-y-4">
      {/* Consigne de la nuit : une ligne, l'action reste au-dessus du fold */}
      <PhaseHint emoji="🌙" className="border-village-400/50">
        {isWolf
          ? 'Concertez-vous avec votre meute pour choisir une victime.'
          : isSeer
            ? "Vous pouvez sonder l'âme d'un joueur."
            : isWitch
              ? 'Utilisez vos potions avec sagesse.'
              : isSalvateur
                ? 'Protégez un villageois des loups.'
                : isTrublion
                  ? 'Semez le chaos en échangeant des rôles !'
                  : isWildChild
                    ? 'Votre modèle est-il toujours en vie ?'
                    : isCupidon
                      ? 'Choisissez deux joueurs qui tomberont amoureux !'
                      : isLittleGirl
                        ? 'Vous espionnez discrètement les loups...'
                        : 'La nuit porte conseil : confie ton intuition.'}
      </PhaseHint>

      {/* Rôle : grande carte tant qu'il n'est pas révélé (c'est alors LA chose
          à faire), pilule compacte ensuite */}
      {currentRole && roleConfig && <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />}

      {/* Wolf Night Vote - l'action de la meute, en premier */}
      {isWolf && isAlive && (
        <WolfNightVote
          alivePlayers={alivePlayers}
          wolves={wolves}
          confirmedNightTarget={nightActions.confirmedNightTarget}
          hasNightVoted={nightActions.hasNightVoted}
          isNightVoting={nightActions.isNightVoting}
          nightVoteError={nightActions.nightVoteError}
          onSubmitVote={nightActions.submitNightVote}
        />
      )}

      {/* Wolf teammates */}
      {isWolf && <WolfPack wolves={wolves} />}

      {/* Wolf Chat - Petite Fille et fantômes en lecture seule */}
      {(isWolf || isLittleGirl || !isAlive) && (
        <WolfChatPanel
          messages={wolfChat.wolfMessages}
          isSendingMessage={wolfChat.isSendingMessage}
          currentPlayerId={currentPlayerId}
          isAlive={isAlive}
          onSendMessage={wolfChat.sendWolfMessage}
          readOnly={isLittleGirl || !isAlive}
        />
      )}

      {/* Seer Power */}
      {isSeer && isAlive && (
        <SeerPowerPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          seerResult={nightActions.seerResult}
          seerHistory={nightActions.seerHistory}
          hasUsedSeerPower={nightActions.hasUsedSeerPower}
          isUsingSeerPower={nightActions.isUsingSeerPower}
          seerError={nightActions.seerError}
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

      {/* Salvateur Protection */}
      {isSalvateur && isAlive && (
        <SalvateurNightPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Trublion Role Swap */}
      {isTrublion && isAlive && (
        <TrublionNightPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Wild Child Model Selection/Status */}
      {isWildChild && isAlive && (
        <WildChildModelPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Cupidon Lovers Selection (first night) */}
      {isCupidon && isAlive && (
        <CupidonLoversPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}

      {/* Intuition de nuit : l'action des non-loups, pour que chaque téléphone
          soit actif la nuit (celui qui ne tapote pas se trahirait) */}
      {!isWolf && isAlive && (
        <IntuitionNightPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={game.code}
          gamePhase={game.current_phase ?? 1}
        />
      )}
    </div>
  );
}
