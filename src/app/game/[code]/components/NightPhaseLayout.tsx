/**
 * NightPhaseLayout - Night-specific layout
 * 
 * Shows role-specific actions for wolves, seer, witch, etc.
 * Dark themed with moon atmosphere.
 */

'use client';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Role, PartialPlayer, WolfMessage, SeerResult } from '../hooks';
import type { RoleConfig } from '@/config/roles';

import {
  PlayerRoleCard,
  WolfPack,
  WolfNightVote,
  WolfChatPanel,
  SeerPowerPanel,
  WitchNightPanel,
} from './index';

interface NightPhaseLayoutProps {
  // Player info
  currentPlayerId: string | null;
  currentPlayer: PartialPlayer | null | undefined;
  currentRole: Role | null | undefined;
  roleConfig: RoleConfig | null;
  
  // Role booleans
  isWolf: boolean;
  isSeer: boolean;
  isLittleGirl: boolean;
  isWitch: boolean;
  
  // Wolf data
  wolves: PartialPlayer[];
  alivePlayers: PartialPlayer[];
  
  // Night actions
  nightTarget: string | null;
  confirmedNightTarget: string | null;
  hasNightVoted: boolean;
  isNightVoting: boolean;
  nightVoteError: string | null;
  onSelectNightTarget: (id: string | null) => void;
  onSubmitNightVote: () => void;
  
  // Wolf chat
  wolfMessages: WolfMessage[];
  newMessage: string;
  isSendingMessage: boolean;
  onMessageChange: (msg: string) => void;
  onSendMessage: () => void;
  
  // Seer power
  seerTarget: string | null;
  seerResult: SeerResult | null;
  hasUsedSeerPower: boolean;
  isUsingSeerPower: boolean;
  seerError: string | null;
  onSelectSeerTarget: (id: string | null) => void;
  onUseSeerPower: () => void;
  
  // Witch
  gameCode: string;
  gamePhase: number;
}

export function NightPhaseLayout({
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
  nightTarget,
  confirmedNightTarget,
  hasNightVoted,
  isNightVoting,
  nightVoteError,
  onSelectNightTarget,
  onSubmitNightVote,
  wolfMessages,
  newMessage,
  isSendingMessage,
  onMessageChange,
  onSendMessage,
  seerTarget,
  seerResult,
  hasUsedSeerPower,
  isUsingSeerPower,
  seerError,
  onSelectSeerTarget,
  onUseSeerPower,
  gameCode,
  gamePhase,
}: NightPhaseLayoutProps) {
  const isAlive = currentPlayer?.is_alive !== false;

  return (
    <div className="space-y-4">
      {/* Night atmosphere instruction */}
      <Card className={cn(
        "border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 to-slate-900/50"
      )}>
        <CardContent className="pt-5 pb-4">
          <div className="text-center">
            <p className="text-3xl mb-2">🌙</p>
            <h3 className="font-bold text-white mb-2">La nuit tombe sur le village</h3>
            <p className="text-slate-400 text-sm">
              {isWolf
                ? "Concertez-vous avec votre meute pour choisir une victime."
                : isSeer
                ? "Vous pouvez sonder l'âme d'un joueur."
                : isWitch
                ? "Utilisez vos potions avec sagesse."
                : isLittleGirl
                ? "Vous espionnez discrètement les loups..."
                : "Le village dort. Attendez le lever du jour..."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Player's Role Card */}
      {currentRole && roleConfig && (
        <PlayerRoleCard role={currentRole} roleConfig={roleConfig} />
      )}

      {/* Wolf teammates */}
      {isWolf && <WolfPack wolves={wolves} />}

      {/* Wolf Night Vote */}
      {isWolf && isAlive && (
        <WolfNightVote
          alivePlayers={alivePlayers}
          wolves={wolves}
          nightTarget={nightTarget}
          confirmedNightTarget={confirmedNightTarget}
          hasNightVoted={hasNightVoted}
          isNightVoting={isNightVoting}
          nightVoteError={nightVoteError}
          onSelectTarget={onSelectNightTarget}
          onSubmitVote={onSubmitNightVote}
        />
      )}

      {/* Wolf Chat - Also visible to Petite Fille (read-only) */}
      {(isWolf || isLittleGirl) && (
        <WolfChatPanel
          messages={wolfMessages}
          newMessage={newMessage}
          isSendingMessage={isSendingMessage}
          currentPlayerId={currentPlayerId}
          isAlive={isAlive}
          onMessageChange={onMessageChange}
          onSendMessage={onSendMessage}
          readOnly={isLittleGirl}
        />
      )}

      {/* Seer Power */}
      {isSeer && isAlive && (
        <SeerPowerPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          seerTarget={seerTarget}
          seerResult={seerResult}
          hasUsedSeerPower={hasUsedSeerPower}
          isUsingSeerPower={isUsingSeerPower}
          seerError={seerError}
          onSelectTarget={onSelectSeerTarget}
          onUsePower={onUseSeerPower}
        />
      )}

      {/* Witch Power */}
      {isWitch && isAlive && (
        <WitchNightPanel
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          gameCode={gameCode}
          gamePhase={gamePhase}
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
