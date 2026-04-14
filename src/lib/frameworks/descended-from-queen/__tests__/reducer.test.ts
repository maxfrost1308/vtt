import { describe, it, expect } from 'vitest';
import { descendedFromQueenFramework } from '../index';
import type { DftQState } from '../index';

describe('DftQ Reducer - Turn Enforcement Removal', () => {
  const createInitialState = (): DftQState => ({
    phase: 'playing',
    dftqPhase: 'playing',
    turnIndex: 0,
    playerOrder: ['player1', 'player2', 'player3'],
    version: 1,
    chosenCreator: 0,
    deck: [1, 2, 3, 4, 5],
    currentIndex: 0,
    endIndex: 5,
    xCardIndices: [],
    instructionIndices: [],
    storyLog: [],
    timerDurationMs: null,
    timerStartedAt: null,
  });

  it('should NOT increment turnIndex on "next" action', () => {
    const state = createInitialState();
    const action = { type: 'next', playerId: 'player1' };

    const newState = descendedFromQueenFramework.reduce(state, action) as DftQState | null;

    expect(newState).not.toBeNull();
    expect(newState!.turnIndex).toBe(state.turnIndex);
    expect(newState!.currentIndex).toBe(1);
  });

  it('should NOT increment turnIndex on "x-card" action', () => {
    const state = createInitialState();
    const action = { type: 'x-card', playerId: 'player1' };

    const newState = descendedFromQueenFramework.reduce(state, action) as DftQState | null;

    expect(newState).not.toBeNull();
    expect(newState!.turnIndex).toBe(state.turnIndex);
    expect(newState!.currentIndex).toBe(1);
  });

  it('should keep turnIndex unchanged after multiple "next" actions', () => {
    let state = createInitialState();
    const initialTurnIndex = state.turnIndex;

    for (let i = 0; i < 3; i++) {
      const action = { type: 'next', playerId: 'player1' };
      state = descendedFromQueenFramework.reduce(state, action) as DftQState;
      expect(state.turnIndex).toBe(initialTurnIndex);
    }
  });

  it('should preserve playerOrder after "next" action', () => {
    const state = createInitialState();
    const action = { type: 'next', playerId: 'player1' };

    const newState = descendedFromQueenFramework.reduce(state, action) as DftQState | null;

    expect(newState).not.toBeNull();
    expect(newState!.playerOrder).toEqual(state.playerOrder);
  });
});
