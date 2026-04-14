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
import { GenericCardDrawBoard } from './board';

export interface GenericCardDrawState extends GameState {
  genericPhase: 'intro' | 'playing' | 'ended';
  deck: number[];
  currentIndex: number;
}

type GenericCardDrawActionType = 'begin' | 'next';

interface GenericCardDrawAction extends GameAction {
  type: GenericCardDrawActionType;
}

const GENERIC_ACTIONS = new Set<string>(['begin', 'next']);

function isGenericAction(action: GameAction): action is GenericCardDrawAction {
  return GENERIC_ACTIONS.has(action.type);
}

const SLOTS: FrameworkSlot[] = [
  {
    name: 'deck',
    label: 'Deck',
    required: true,
    description: 'Card type used as the draw deck',
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

export const genericCardDrawFramework: GameFramework = {
  id: 'generic-card-draw',
  name: 'Generic Card Draw',
  description: 'Draw cards from a deck one at a time. Conversation-first, no turn restrictions.',
  slots: SLOTS,
  configFields: [],

  validate(project: ForgeProject, config: ForgeGameConfig): ValidationResult {
    const errors: string[] = [];
    const cardTypeIds = new Set(project.cardTypes.map((ct) => ct.id));

    if (!config.roles['deck']) {
      errors.push('Missing required role: deck');
    } else if (!cardTypeIds.has(config.roles['deck'])) {
      errors.push(`Deck role references unknown card type: ${config.roles['deck']}`);
    }

    return { valid: errors.length === 0, errors };
  },

  createInitialState(
    project: ForgeProject,
    config: ForgeGameConfig,
    playerIds: string[]
  ): GenericCardDrawState {
    const deckCardTypeId = config.roles['deck'];
    const indices = project.data
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => row._type === deckCardTypeId)
      .map(({ i }) => i);

    const shuffled = shuffle(indices);

    return {
      phase: 'playing',
      turnIndex: 0,
      playerOrder: [...playerIds],
      version: 0,
      genericPhase: 'intro',
      deck: shuffled,
      currentIndex: -1,
    };
  },

  reduce(state: GameState, action: GameAction): GenericCardDrawState | null {
    const s = state as GenericCardDrawState;
    if (!isGenericAction(action)) return null;

    switch (action.type) {
      case 'begin': {
        if (s.genericPhase !== 'intro') return null;
        return { ...s, version: s.version + 1, genericPhase: 'playing', currentIndex: 0 };
      }

      case 'next': {
        if (s.genericPhase !== 'playing') return null;
        const newIndex = s.currentIndex + 1;
        if (newIndex >= s.deck.length) return null;
        const isEnded = newIndex >= s.deck.length - 1;
        return {
          ...s,
          version: s.version + 1,
          currentIndex: newIndex,
          genericPhase: isEnded ? 'ended' : 'playing',
        };
      }
    }

    return null;
  },

  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const s = state as GenericCardDrawState;
    const actions: GameAction[] = [];

    if (s.genericPhase === 'intro') {
      actions.push({ type: 'begin', playerId });
    }

    if (s.genericPhase === 'playing' && s.currentIndex + 1 < s.deck.length) {
      actions.push({ type: 'next', playerId });
    }

    return actions;
  },

  BoardComponent: GenericCardDrawBoard,
};
