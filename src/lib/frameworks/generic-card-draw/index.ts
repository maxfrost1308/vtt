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
  deck: number[];
  discard: number[];
  currentCard: number | null;
}

const SLOTS: FrameworkSlot[] = [
  {
    name: 'deck',
    label: 'Deck',
    required: true,
    description: 'Card type used as the draw deck',
  },
];

export const genericCardDrawFramework: GameFramework = {
  id: 'generic-card-draw',
  name: 'Generic Card Draw',
  description: 'Draw cards from a deck. Supports draw, shuffle, and reset.',
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

    const shuffled = [...indices].sort(() => Math.random() - 0.5);

    return {
      phase: 'lobby',
      turnIndex: 0,
      playerOrder: [...playerIds],
      version: 0,
      deck: shuffled,
      discard: [],
      currentCard: null,
    };
  },

  reduce(state: GameState, action: GameAction): GenericCardDrawState | null {
    const s = state as GenericCardDrawState;

    if (action.type === 'draw') {
      if (s.deck.length === 0) return null;
      const [drawn, ...remaining] = s.deck;
      const discard =
        s.currentCard !== null ? [...s.discard, s.currentCard] : [...s.discard];
      return {
        ...s,
        version: s.version + 1,
        deck: remaining,
        discard,
        currentCard: drawn,
        phase: remaining.length === 0 ? 'ended' : s.phase,
      };
    }

    if (action.type === 'shuffle') {
      const allCards = [...s.deck, ...s.discard];
      if (s.currentCard !== null) allCards.push(s.currentCard);
      const reshuffled = [...allCards].sort(() => Math.random() - 0.5);
      return {
        ...s,
        version: s.version + 1,
        deck: reshuffled,
        discard: [],
        currentCard: null,
        phase: 'playing',
      };
    }

    if (action.type === 'reset') {
      const allCards = [...s.deck, ...s.discard];
      if (s.currentCard !== null) allCards.push(s.currentCard);
      const reshuffled = [...allCards].sort(() => Math.random() - 0.5);
      return {
        ...s,
        version: s.version + 1,
        deck: reshuffled,
        discard: [],
        currentCard: null,
        phase: 'playing',
      };
    }

    return null;
  },

  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const s = state as GenericCardDrawState;
    if (s.phase !== 'playing') return [];

    const currentPlayerId = s.playerOrder[s.turnIndex];
    if (currentPlayerId !== playerId) return [];

    const actions: GameAction[] = [];

    if (s.deck.length > 0) {
      actions.push({ type: 'draw', playerId });
    }

    if (s.discard.length > 0 || (s.deck.length === 0 && s.currentCard !== null)) {
      actions.push({ type: 'shuffle', playerId });
    }

    actions.push({ type: 'reset', playerId });

    return actions;
  },

  BoardComponent: GenericCardDrawBoard,
};
