'use client';

import type { BoardProps, PlayerInfo } from '@/lib/frameworks/types';
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
  const isHost = players.find((p) => p.id === playerId)?.isHost ?? false;
  const deckTypeId = gameConfig.roles['deck'];
  const deckCardType = forgeProject.cardTypes.find((ct) => ct.id === deckTypeId);

  const orderedPlayers: PlayerInfo[] = s.playerOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerInfo => p !== undefined);

  if (s.genericPhase === 'intro') {
    const firstCardDataIndex = s.deck[0];
    const firstRow = firstCardDataIndex !== undefined ? forgeProject.data[firstCardDataIndex] : null;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-8 px-6 py-10">
        {deckCardType && firstRow && (
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <CardRenderer
              project={forgeProject}
              cardTypeId={deckCardType.id}
              row={firstRow}
            />
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Card Draw
          </p>
          <h1 className="text-2xl font-bold text-zinc-100">{forgeProject.name}</h1>
        </div>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-zinc-400">
          {orderedPlayers.map((p, i) => (
            <span key={p.id}>
              {i > 0 && <span className="mr-3 text-zinc-700">·</span>}
              <span className={clsx(p.id === playerId && 'text-zinc-200 font-medium')}>
                {p.id === playerId ? 'You' : p.displayName}
              </span>
            </span>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={() => onAction({ type: 'begin', playerId })}
            className="px-10 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-full text-base transition-colors shadow-lg shadow-amber-900/40"
          >
            Begin
          </button>
        ) : (
          <p className="text-sm text-zinc-500">Waiting for host to begin…</p>
        )}
      </div>
    );
  }

  if (s.genericPhase === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-8 px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-zinc-500 font-medium">
          The story ends here.
        </p>

        <div className="text-center space-y-3">
          <p className="text-zinc-300 text-lg">All cards drawn.</p>
          <p className="text-zinc-400 text-sm">What was your favorite moment?</p>
        </div>

        <p className="text-zinc-600 text-sm font-medium">{forgeProject.name}</p>

        <a
          href={process.env.NEXT_PUBLIC_BASEPATH || '/'}
          className="mt-2 px-7 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full border border-zinc-700 transition-colors text-sm"
        >
          Back to Home
        </a>
      </div>
    );
  }

  const currentCardDataIndex = s.currentIndex >= 0 ? s.deck[s.currentIndex] : undefined;
  const currentRow =
    currentCardDataIndex !== undefined ? forgeProject.data[currentCardDataIndex] : null;

  const canAdvance = s.currentIndex + 1 < s.deck.length;

  const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? '';

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      <a
        href={basePath || '/'}
        className="absolute top-4 left-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors"
        aria-label="Back to home"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </a>
      <div className="flex-1 flex items-center justify-center overflow-auto py-6 px-4">
        {deckCardType && currentRow ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/5">
            <CardRenderer
              project={forgeProject}
              cardTypeId={deckCardType.id}
              row={currentRow}
            />
          </div>
        ) : (
          <div className="text-zinc-700 text-sm">Loading…</div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-0 px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur">
        <div className="flex-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm overflow-hidden">
          {orderedPlayers.map((p, i) => {
            const isMe = p.id === playerId;
            return (
              <span key={p.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-700 mr-1">·</span>}
                <span className={clsx(isMe ? 'text-zinc-200' : 'text-zinc-500')}>
                  {isMe ? 'You' : p.displayName}
                </span>
              </span>
            );
          })}
        </div>

        {canAdvance && (
          <button
            onClick={() => onAction({ type: 'next', playerId })}
            className="ml-4 shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 rounded-full border border-zinc-700 text-sm font-medium transition-colors"
          >
            <span>Next</span>
            <span className="text-zinc-400">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
