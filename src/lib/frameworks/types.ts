import type { ForgeProject } from 'forge';
import type { ForgeGameConfig } from '@/lib/forge/types';

export interface FrameworkSlot {
  name: string;
  label: string;
  required: boolean;
  description: string;
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'ended';
  turnIndex: number;
  playerOrder: string[];
  version: number;
  [key: string]: unknown;
}

export interface GameAction {
  type: string;
  playerId: string;
  payload?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PlayerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
  isOnline: boolean;
  isSpectator?: boolean;
}

export interface BoardProps {
  state: GameState;
  playerId: string;
  players: PlayerInfo[];
  forgeProject: ForgeProject;
  gameConfig: ForgeGameConfig;
  onAction: (action: GameAction) => void;
}

export interface FrameworkConfigField {
  name: string;
  label: string;
  type: 'text' | 'select';
  defaultValue: string;
  description: string;
  options?: string[];
}

export interface GameFramework {
  id: string;
  name: string;
  description: string;
  slots: FrameworkSlot[];
  configFields: FrameworkConfigField[];
  validate(project: ForgeProject, config: ForgeGameConfig): ValidationResult;
  createInitialState(project: ForgeProject, config: ForgeGameConfig, playerIds: string[]): GameState;
  reduce(state: GameState, action: GameAction): GameState | null;
  getAvailableActions(state: GameState, playerId: string): GameAction[];
  BoardComponent: React.ComponentType<BoardProps>;
}
