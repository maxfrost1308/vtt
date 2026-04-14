'use client';

import type { BoardProps } from '@/lib/frameworks/types';
import type { GenericCardDrawState } from './index';
import { CardRenderer } from '@/components/card-renderer';
import clsx from 'clsx';

export function GenericCardDrawBoard({
  state,
  playerId,
  players,
  forgeProject,
  gameConfig,
  onAction,
}: BoardProps) {
  const s = state as GenericCardDrawState;
  const isMyTurn = s.playerOrder[s.turnIndex] === playerId;
  const currentPlayer = players.find((p) => p.id === s.playerOrder[s.turnIndex]);
  const deckCardTypeId = gameConfig.roles['deck'];
  const currentRow = s.currentCard !== null ? forgeProject.data[s.currentCard] : null;
  const currentCardType = forgeProject.cardTypes.find((ct) => ct.id === deckCardTypeId);

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen bg-zinc-900 text-zinc-100">
      <div className="flex items-center gap-3 w-full max-w-3xl flex-wrap">
        {players.map((p) => (
          <div
            key={p.id}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
              p.id === s.playerOrder[s.turnIndex]
                ? 'border-blue-400 bg-blue-400/10 text-blue-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            )}
          >
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                p.isOnline ? 'bg-green-400' : 'bg-zinc-600'
              )}
            />
            {p.displayName}
            {p.isHost && <span className="text-xs opacity-60 ml-1">host</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between w-full max-w-3xl text-sm text-zinc-400">
        <span>Deck: {s.deck.length} cards</span>
        <span>Discard: {s.discard.length} cards</span>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
        {s.phase === 'ended' ? (
          <div className="p-8 bg-zinc-800 rounded-2xl border border-zinc-700 text-center">
            <h2 className="text-2xl font-bold text-zinc-300">Deck exhausted.</h2>
            <p className="text-zinc-500 mt-2">Shuffle to play again.</p>
          </div>
        ) : s.currentCard === null ? (
          <div className="p-8 bg-zinc-800 rounded-2xl border border-zinc-700 border-dashed text-center">
            <p className="text-zinc-400">Draw the first card to begin.</p>
          </div>
        ) : currentRow && currentCardType ? (
          <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-600">
            <CardRenderer
              project={forgeProject}
              cardTypeId={currentCardType.id}
              row={currentRow}
            />
          </div>
        ) : null}
      </div>

      {isMyTurn && (
        <div className="flex gap-3 flex-wrap justify-center mt-4">
          {s.deck.length > 0 && (
            <button
              onClick={() => onAction({ type: 'draw', playerId })}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full transition-colors"
            >
              Draw
            </button>
          )}
          <button
            onClick={() => onAction({ type: 'shuffle', playerId })}
            className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-full transition-colors"
          >
            Shuffle All
          </button>
          <button
            onClick={() => onAction({ type: 'reset', playerId })}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-full border border-zinc-600 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {!isMyTurn && s.phase === 'playing' && (
        <p className="text-zinc-500 text-sm mt-4">
          Waiting for {currentPlayer?.displayName ?? 'another player'} to act…
        </p>
      )}
    </div>
  );
}
