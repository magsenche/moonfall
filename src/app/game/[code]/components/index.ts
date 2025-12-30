/**
 * Game components - Extracted from lobby-client.tsx
 * 
 * Layout components:
 * - GameHeader: Unified header with phase badge and timer
 * - NightPhaseLayout: Night-specific layout
 * - DayPhaseLayout: Day discussion layout
 * - CouncilPhaseLayout: Voting layout
 * - GameFooter: Common footer (MJ controls, missions, players, wallet)
 * 
 * Feature components:
 * - PhaseTimer: Countdown timer
 * - PhaseInstructions: Current phase info
 * - PlayerRoleCard: Player's role display
 * - WolfPack: Wolf teammates list
 * - WolfNightVote: Wolf night vote UI
 * - WolfChatPanel: Wolf private chat
 * - SeerPowerPanel: Voyante power UI
 * - VotingPanel: Day vote UI
 * - MJControls: Game master controls
 * - MJOverview: Game master overview
 * - PlayersList: Players list
 * - SessionRecovery: Session recovery screen
 * - MissionsSection: Missions display
 * - PlayerWallet: Points and active powers
 * - Shop: Purchase powers with points
 */

// Layout components
export * from './GameHeader';
export * from './NightPhaseLayout';
export * from './DayPhaseLayout';
export * from './CouncilPhaseLayout';
export * from './GameFooter';

// Feature components
export * from './PhaseTimer';
export * from './PhaseInstructions';
export * from './PlayerRoleCard';
export * from './WolfPack';
export * from './WolfNightVote';
export * from './WolfChatPanel';
export * from './SeerPowerPanel';
export * from './VotingPanel';
export * from './MJControls';
export * from './MJOverview';
export * from './PlayersList';
export * from './SessionRecovery';
export * from './MissionsSection';
export * from './LobbyView';
export * from './PlayerWallet';
export * from './Shop';
export * from './VoteResults';
export * from './HunterDeathModal';
export * from './WitchNightPanel';
export * from './SeerHistoryPanel';
export * from './GameLayout';

// New roles panels
export * from './SalvateurNightPanel';
export * from './AssassinPowerPanel';
export * from './TrublionNightPanel';
export * from './WildChildModelPanel';
