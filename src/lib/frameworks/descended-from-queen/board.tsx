'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { BoardProps, PlayerInfo } from '@/lib/frameworks/types';
import type { DftQState } from './index';
import { CardRenderer } from '@/components/card-renderer';

export function DftQBoard({
  state,
  playerId,
  players,
  forgeProject,
  gameConfig,
  onAction,
}: BoardProps) {
  const s = state as DftQState;
  const [showXOverlay, setShowXOverlay] = useState(false);

  const isHost = players.find((p) => p.id === playerId)?.isHost ?? false;
  const deckTypeId = gameConfig.roles['deck'];
  const deckCardType = forgeProject.cardTypes.find((ct) => ct.id === deckTypeId);

  const orderedPlayers: PlayerInfo[] = s.playerOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerInfo => p !== undefined);

  function handleXCard() {
    if (showXOverlay) return;
    setShowXOverlay(true);
  }

  useEffect(() => {
    if (!showXOverlay) return;
    const timer = setTimeout(() => {
      setShowXOverlay(false);
      onAction({ type: 'x-card', playerId });
    }, 2000);
    return () => clearTimeout(timer);
  }, [showXOverlay, onAction, playerId]);

  if (s.dftqPhase === 'intro') {
    const creatorRow = forgeProject.data[s.chosenCreator];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-8 px-6 py-10">
        {deckCardType && creatorRow && (
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <CardRenderer
              project={forgeProject}
              cardTypeId={deckCardType.id}
              row={creatorRow}
            />
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Descended from the Queen
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

  if (s.dftqPhase === 'ended') {
    const endRow =
      s.endIndex >= 0 && s.currentIndex >= 0 ? forgeProject.data[s.deck[s.currentIndex] ?? s.endIndex] : null;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-8 px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-zinc-500 font-medium">
          The story ends here.
        </p>

        {deckCardType && endRow && (
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-rose-900/60">
            <CardRenderer
              project={forgeProject}
              cardTypeId={deckCardType.id}
              row={endRow}
            />
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-zinc-300 text-lg">Take a breath.</p>
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

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      <button
        onClick={handleXCard}
        disabled={showXOverlay}
        className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-rose-950/80 hover:bg-rose-900 active:bg-rose-800 text-rose-400 hover:text-rose-300 border border-rose-900/60 text-sm font-bold transition-colors"
        aria-label="X-Card — skip this card"
      >
        ✕
      </button>

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
            const isTurn = i === s.turnIndex;
            const isMe = p.id === playerId;
            return (
              <span key={p.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-700 mr-1">·</span>}
                {isTurn && <span className="text-amber-400">▸</span>}
                <span
                  className={clsx(
                    isTurn ? 'text-amber-400 font-semibold' : isMe ? 'text-zinc-200' : 'text-zinc-500'
                  )}
                >
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

      {showXOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <p className="text-7xl font-bold text-white mb-3">✕</p>
          <p className="text-zinc-400 text-lg tracking-wide">Moving on</p>
        </div>
      )}
    </div>
  );
}
