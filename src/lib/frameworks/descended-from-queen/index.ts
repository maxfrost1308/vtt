'use client';

import type { ForgeProject } from 'forge';
import type { ForgeGameConfig } from '@/lib/forge/types';
import type {
  GameFramework,
  GameState,
  GameAction,
  ValidationResult,
  FrameworkSlot,
  FrameworkConfigField,
} from '@/lib/frameworks/types';
import { DftQBoard } from './board';

export interface DftQState extends GameState {
  dftqPhase: 'intro' | 'playing' | 'ended';

  chosenCreator: number;
  deck: number[];
  currentIndex: number;
  endIndex: number;
  xCardIndices: number[];
  instructionIndices: number[];
  storyLog: Array<{ cardIndex: number; note: string; author: string }>;
  timerDurationMs: number | null;
  timerStartedAt: string | null;
}

type DftQActionType = 'begin' | 'next' | 'x-card' | 'add-note';

interface DftQAction extends GameAction {
  type: DftQActionType;
}

const DFTQ_ACTIONS = new Set<string>(['begin', 'next', 'x-card', 'add-note']);

function isDftQAction(action: GameAction): action is DftQAction {
  return DFTQ_ACTIONS.has(action.type);
}

function getConfig(config: ForgeGameConfig) {
  const c = config.config ?? {};
  return {
    typeColumn: (c['typeColumn'] as string) || 'type',
    creatorValue: (c['creatorValue'] as string) || 'Queen',
    promptValue: (c['promptValue'] as string) || 'Prompt',
    instructionValue: (c['instructionValue'] as string) || 'Instruction',
    endValue: (c['endValue'] as string) || 'End',
    xCardValue: (c['xCardValue'] as string) || 'XCard',
    endCardPosition: ((c['endCardPosition'] as string) === 'middle' ? 'middle' : 'end') as 'end' | 'middle',
  };
}

const SLOTS: FrameworkSlot[] = [
  {
    name: 'deck',
    label: 'Card Type',
    required: true,
    description: 'The card type containing all cards (prompts, queen/creator, instructions, end, x-card)',
  },
];

const CONFIG_FIELDS: FrameworkConfigField[] = [
  {
    name: 'typeColumn',
    label: 'Type Column',
    type: 'text',
    defaultValue: 'type',
    description: 'Data column that categorizes each card',
  },
  {
    name: 'creatorValue',
    label: 'Creator (Queen) Value',
    type: 'text',
    defaultValue: 'Queen',
    description: 'Value in the type column for creator/queen cards shown during selection',
  },
  {
    name: 'promptValue',
    label: 'Prompt Value',
    type: 'text',
    defaultValue: 'Prompt',
    description: 'Value in the type column for prompt cards',
  },
  {
    name: 'instructionValue',
    label: 'Instruction Value',
    type: 'text',
    defaultValue: 'Instruction',
    description: 'Value in the type column for instruction/rules cards',
  },
  {
    name: 'endValue',
    label: 'End Card Value',
    type: 'text',
    defaultValue: 'End',
    description: 'Value in the type column for the end card',
  },
  {
    name: 'xCardValue',
    label: 'X-Card Value',
    type: 'text',
    defaultValue: 'XCard',
    description: 'Value in the type column for X-Card safety tool cards',
  },
  {
    name: 'endCardPosition',
    label: 'End Card Position',
    type: 'select',
    defaultValue: 'end',
    description: 'Where the end card is shuffled into the prompt deck',
    options: ['end', 'middle'],
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

export const descendedFromQueenFramework: GameFramework = {
  id: 'descended-from-queen',
  name: 'Descended from the Queen',
  description: 'A collaborative storytelling game. One prompt at a time, told together on voice chat.',
  slots: SLOTS,
  configFields: CONFIG_FIELDS,

  validate(project: ForgeProject, config: ForgeGameConfig): ValidationResult {
    const errors: string[] = [];
    const c = getConfig(config);

    if (!config.roles['deck']) {
      errors.push('Missing required slot: deck');
      return { valid: false, errors };
    }

    const cardTypeIds = new Set(project.cardTypes.map((ct) => ct.id));
    if (!cardTypeIds.has(config.roles['deck'])) {
      errors.push(`Deck slot references unknown card type: ${config.roles['deck']}`);
      return { valid: false, errors };
    }

    const deckTypeId = config.roles['deck'];
    const rows = project.data.filter((row) => row._type === deckTypeId);
    const creators = rows.filter((r) => String(r[c.typeColumn] ?? '') === c.creatorValue);
    const prompts = rows.filter((r) => String(r[c.typeColumn] ?? '') === c.promptValue);
    const instructions = rows.filter((r) => String(r[c.typeColumn] ?? '') === c.instructionValue);
    const endCards = rows.filter((r) => String(r[c.typeColumn] ?? '') === c.endValue);

    if (creators.length === 0)
      errors.push(`No creator cards found (column "${c.typeColumn}" = "${c.creatorValue}")`);
    if (prompts.length === 0)
      errors.push(`No prompt cards found (column "${c.typeColumn}" = "${c.promptValue}")`);
    if (instructions.length === 0)
      errors.push(`No instruction cards found (column "${c.typeColumn}" = "${c.instructionValue}")`);
    if (endCards.length === 0)
      errors.push(`No end card found (column "${c.typeColumn}" = "${c.endValue}")`);

    return { valid: errors.length === 0, errors };
  },

  createInitialState(
    project: ForgeProject,
    config: ForgeGameConfig,
    playerIds: string[]
  ): DftQState {
    const c = getConfig(config);
    const deckTypeId = config.roles['deck'];

    const creatorIndices: number[] = [];
    const promptIndices: number[] = [];
    const instructionIndices: number[] = [];
    let endIndex = -1;
    const xCardIndices: number[] = [];

    project.data.forEach((row, i) => {
      if (row._type !== deckTypeId) return;
      const typeVal = String(row[c.typeColumn] ?? '');
      if (typeVal === c.creatorValue) creatorIndices.push(i);
      else if (typeVal === c.promptValue) promptIndices.push(i);
      else if (typeVal === c.instructionValue) instructionIndices.push(i);
      else if (typeVal === c.endValue) endIndex = i;
      else if (typeVal === c.xCardValue) xCardIndices.push(i);
    });

    const chosenCreator =
      creatorIndices.length > 0
        ? creatorIndices[Math.floor(Math.random() * creatorIndices.length)]!
        : 0;

    const sortedInstructions = [...instructionIndices].sort((a, b) => a - b);
    const shuffledPrompts = shuffle(promptIndices);

    let insertAt: number;
    if (c.endCardPosition === 'middle') {
      const lo = Math.floor(shuffledPrompts.length * 0.4);
      const hi = Math.floor(shuffledPrompts.length * 0.6);
      insertAt = lo + Math.floor(Math.random() * (hi - lo + 1));
    } else {
      insertAt = Math.max(0, Math.floor(shuffledPrompts.length * 0.75));
    }

    const promptsWithEnd =
      endIndex >= 0
        ? [...shuffledPrompts.slice(0, insertAt), endIndex, ...shuffledPrompts.slice(insertAt)]
        : shuffledPrompts;

    const deck = [...sortedInstructions, ...promptsWithEnd];

    const timerDurationMs = (config.config?.['timerDurationMs'] as number | null) ?? null;

    return {
      phase: 'playing',
      turnIndex: 0,
      playerOrder: [...playerIds],
      version: 0,
      dftqPhase: 'intro',
      chosenCreator,
      deck,
      currentIndex: -1,
      endIndex,
      xCardIndices,
      instructionIndices,
      storyLog: [],
      timerDurationMs,
      timerStartedAt: null,
    };
  },

  reduce(state: GameState, action: GameAction): DftQState | null {
    const s = state as DftQState;
    if (!isDftQAction(action)) return null;

    switch (action.type) {
      case 'begin': {
        if (s.dftqPhase !== 'intro') return null;
        return {
          ...s,
          version: s.version + 1,
          dftqPhase: 'playing',
          currentIndex: 0,
          timerStartedAt: s.timerDurationMs ? new Date().toISOString() : null,
        };
      }

      case 'next':
      case 'x-card': {
        if (s.dftqPhase !== 'playing') return null;
        const newIndex = s.currentIndex + 1;
        if (newIndex >= s.deck.length) return null;
        const nextCard = s.deck[newIndex];
        const isEnd = nextCard === s.endIndex;
        return {
          ...s,
          version: s.version + 1,
          currentIndex: newIndex,
          dftqPhase: isEnd ? 'ended' : 'playing',
        };
      }

      case 'add-note': {
        if (s.dftqPhase !== 'playing') return null;
        const note = (action as { note?: string }).note ?? '';
        const cardIndex = (action as { cardIndex?: number }).cardIndex ?? s.currentIndex;
        if (!note.trim()) return null;
        const existing = s.storyLog.findIndex((e) => e.cardIndex === cardIndex);
        const newLog = [...s.storyLog];
        if (existing >= 0) {
          newLog[existing] = { cardIndex, note: note.trim(), author: action.playerId };
        } else {
          newLog.push({ cardIndex, note: note.trim(), author: action.playerId });
        }
        return { ...s, version: s.version + 1, storyLog: newLog };
      }
    }

    return null;
  },

  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const s = state as DftQState;
    const actions: GameAction[] = [];

    if (s.dftqPhase === 'intro') {
      actions.push({ type: 'begin', playerId });
    }

    if (s.dftqPhase === 'playing' && s.currentIndex + 1 < s.deck.length) {
      actions.push({ type: 'next', playerId });
      actions.push({ type: 'x-card', playerId });
    }

    return actions;
  },

  BoardComponent: DftQBoard,
};
