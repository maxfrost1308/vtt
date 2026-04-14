'use client';

import type { ForgeProject } from 'forge';
import type { ForgeGameConfig } from '@/lib/forge/types';
import type {
  GameFramework,
  GameState,
  GameAction,
  ValidationResult,
  FrameworkSlot,
} from '@/lib/frameworks/types';
import { WanderingBoard } from './board';

export interface WanderingState extends GameState {
  wanderingPhase: 'intro' | 'playing' | 'ended';
  deck: number[];
  currentIndex: number;
}

type WanderingActionType = 'begin' | 'next';

interface WanderingAction extends GameAction {
  type: WanderingActionType;
}

const WANDERING_ACTIONS = new Set<string>(['begin', 'next']);

function isWanderingAction(action: GameAction): action is WanderingAction {
  return WANDERING_ACTIONS.has(action.type);
}

const SLOTS: FrameworkSlot[] = [
  {
    name: 'cards',
    label: 'Card Type',
    required: true,
    description: 'Card type for all location/encounter cards',
  },
];

function shuffle(arr: number[]): number[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export const wanderingFramework: GameFramework = {
  id: 'the-wandering',
  name: 'The Wandering',
  description:
    "A journey-based collaborative storytelling game. Draw cards to discover places and encounters, and narrate your character's story together.",
  slots: SLOTS,
  configFields: [],

  validate(project: ForgeProject, config: ForgeGameConfig): ValidationResult {
    const errors: string[] = [];
    const cardTypeIds = new Set(project.cardTypes.map((ct) => ct.id));

    if (!config.roles['cards']) {
      errors.push('Missing required role: cards');
    } else if (!cardTypeIds.has(config.roles['cards'])) {
      errors.push(`Cards role references unknown card type: ${config.roles['cards']}`);
    }

    return { valid: errors.length === 0, errors };
  },

  createInitialState(
    project: ForgeProject,
    config: ForgeGameConfig,
    playerIds: string[]
  ): WanderingState {
    const cardsTypeId = config.roles['cards'];
    const indices = project.data
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => row._type === cardsTypeId)
      .map(({ i }) => i);

    const shuffled = shuffle(indices);

    return {
      phase: 'playing',
      turnIndex: 0,
      playerOrder: [...playerIds],
      version: 0,
      wanderingPhase: 'intro',
      deck: shuffled,
      currentIndex: -1,
    };
  },

  reduce(state: GameState, action: GameAction): WanderingState | null {
    const s = state as WanderingState;
    if (!isWanderingAction(action)) return null;

    switch (action.type) {
      case 'begin': {
        if (s.wanderingPhase !== 'intro') return null;
        return { ...s, version: s.version + 1, wanderingPhase: 'playing', currentIndex: 0 };
      }

      case 'next': {
        if (s.wanderingPhase !== 'playing') return null;
        const newIndex = s.currentIndex + 1;
        if (newIndex >= s.deck.length) return null;
        const isEnded = newIndex + 1 >= s.deck.length;
        return {
          ...s,
          version: s.version + 1,
          currentIndex: newIndex,
          wanderingPhase: isEnded ? 'ended' : 'playing',
        };
      }
    }

    return null;
  },

  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const s = state as WanderingState;
    const actions: GameAction[] = [];

    if (s.wanderingPhase === 'intro') {
      actions.push({ type: 'begin', playerId });
    }

    if (s.wanderingPhase === 'playing' && s.currentIndex + 1 < s.deck.length) {
      actions.push({ type: 'next', playerId });
    }

    return actions;
  },

  BoardComponent: WanderingBoard,
};
