'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import type { BoardProps, PlayerInfo, GameAction } from '@/lib/frameworks/types';
import type { DftQState } from './index';
import { CardRenderer } from '@/components/card-renderer';

/** Convert a CSS dimension (e.g. "63.5mm") to pixels. */
function parsePx(v: string): number {
  const m = v.match(/^([\d.]+)\s*mm$/);
  if (m) return parseFloat(m[1]) * (96 / 25.4);
  return parseFloat(v) || 0;
}

function ScaledCard({
  cardType,
  children,
}: {
  cardType: { cardSize: { width: string; height: string } };
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const nativeW = parsePx(cardType.cardSize.width);
  const nativeH = parsePx(cardType.cardSize.height);

  useEffect(() => {
    const el = ref.current;
    if (!el || !nativeW) return;

    const update = () => {
      setScale(Math.min(1, el.clientWidth / nativeW));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nativeW]);

  return (
    <div ref={ref} className="w-full">
      <div
        style={{
          width: nativeW * scale,
          height: nativeH * scale,
          margin: '0 auto',
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [cardVisible, setCardVisible] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [storyCopied, setStoryCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const isHost = players.find((p) => p.id === playerId)?.isHost ?? false;
  const isSpectator = players.find((p) => p.id === playerId)?.isSpectator ?? false;
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

  useEffect(() => {
    setCardVisible(false);
    const timer = setTimeout(() => setCardVisible(true), 150);
    return () => clearTimeout(timer);
  }, [s.currentIndex]);

  useEffect(() => {
    setNoteInput('');
  }, [s.currentIndex]);

  useEffect(() => {
    if (!s.timerDurationMs || !s.timerStartedAt) {
      setRemainingMs(null);
      return;
    }
    const compute = () => {
      const end = new Date(s.timerStartedAt!).getTime() + s.timerDurationMs!;
      setRemainingMs(end - Date.now());
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [s.timerDurationMs, s.timerStartedAt]);

  if (s.dftqPhase === 'intro') {
    const creatorRow = forgeProject.data[s.chosenCreator];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-8 px-6 py-10">
        {!bannerDismissed && (
          <div className="w-full max-w-md flex items-start gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-300">
            <span className="text-amber-400 mt-0.5">🎙</span>
            <p className="flex-1">This game is played over voice chat. Join your Discord call to begin.</p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-zinc-500 hover:text-zinc-300 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {deckCardType && creatorRow && (
          <ScaledCard cardType={deckCardType}>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <CardRenderer
                project={forgeProject}
                cardTypeId={deckCardType.id}
                row={creatorRow}
              />
            </div>
          </ScaledCard>
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
                {p.id === playerId ? 'You' : p.displayName}{p.isSpectator ? ' (watching)' : ''}
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

  function generateStoryText(): string {
    const entries = s.storyLog.filter((e) => e.note.trim());
    const playerNames = orderedPlayers.map((p) => p.displayName).join(', ');
    const date = new Date().toLocaleDateString();
    const notesText = entries.map((e) => `• ${e.note}`).join('\n');
    return `${forgeProject.name}\n${date}\nPlayers: ${playerNames}\n\n${notesText}`;
  }

  function downloadStory(text: string, gameName: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameName.replace(/\s+/g, '-').toLowerCase()}-story.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          <ScaledCard cardType={deckCardType}>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-rose-900/60">
              <CardRenderer
                project={forgeProject}
                cardTypeId={deckCardType.id}
                row={endRow}
              />
            </div>
          </ScaledCard>
        )}

        <div className="text-center space-y-3">
          <p className="text-zinc-300 text-lg">Take a breath.</p>
          <p className="text-zinc-400 text-sm">What was your favorite moment?</p>
        </div>

        {s.storyLog.filter((e) => e.note.trim()).length > 0 && (
          <div className="w-full max-w-md space-y-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium text-center">
              Your Story
            </p>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              {s.storyLog
                .filter((e) => e.note.trim())
                .map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">•</span>
                    <span>{e.note}</span>
                  </li>
                ))}
            </ul>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  const text = generateStoryText();
                  navigator.clipboard.writeText(text).then(() => {
                    setStoryCopied(true);
                    setTimeout(() => setStoryCopied(false), 2000);
                  });
                }}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border border-zinc-700 text-sm transition-colors"
              >
                {storyCopied ? 'Copied!' : 'Copy story'}
              </button>
              <button
                onClick={() => {
                  const text = generateStoryText();
                  downloadStory(text, forgeProject.name);
                }}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border border-zinc-700 text-sm transition-colors"
              >
                Download .txt
              </button>
            </div>
          </div>
        )}

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
      {!isSpectator && (
        <button
          onClick={handleXCard}
          disabled={showXOverlay}
          className="absolute top-4 right-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-rose-950/80 hover:bg-rose-900 active:bg-rose-800 text-rose-400 hover:text-rose-300 border border-rose-900/60 text-base font-bold transition-colors"
          aria-label="X-Card — skip this card"
        >
          ✕
        </button>
      )}

      <div className="flex-1 flex items-center justify-center overflow-auto py-6 px-4">
        {deckCardType && currentRow ? (
          <div className={clsx('transition-opacity duration-150', cardVisible ? 'opacity-100' : 'opacity-0')}>
            <ScaledCard cardType={deckCardType}>
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/5">
                <CardRenderer
                  project={forgeProject}
                  cardTypeId={deckCardType.id}
                  row={currentRow}
                />
              </div>
            </ScaledCard>
          </div>
        ) : (
          <div className="text-zinc-700 text-sm">Loading…</div>
        )}
      </div>

      <div className="px-4 pb-2">
        <input
          type="text"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && noteInput.trim()) {
              const a = { type: 'add-note', playerId, note: noteInput.trim(), cardIndex: s.currentIndex };
              onAction(a as GameAction);
              setNoteInput('');
            }
          }}
          onBlur={() => {
            if (noteInput.trim()) {
              const a = { type: 'add-note', playerId, note: noteInput.trim(), cardIndex: s.currentIndex };
              onAction(a as GameAction);
              setNoteInput('');
            }
          }}
          placeholder="What happened? (optional)"
          className="w-full bg-transparent border-b border-zinc-700 focus:border-zinc-500 outline-none text-sm text-zinc-300 placeholder-zinc-600 py-1.5 transition-colors"
          maxLength={200}
        />
      </div>

      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur">
        {s.dftqPhase === 'playing' && (() => {
          const progress = Math.min(s.currentIndex / Math.max(s.deck.length - 1, 1), 1);
          const isNearEnd = progress > 0.75;
          return (
            <div className="w-full h-0.5 bg-zinc-700 overflow-hidden">
              <div
                className={clsx('h-full transition-all duration-500', isNearEnd ? 'bg-amber-700' : 'bg-zinc-500')}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          );
        })()}
        <div className="flex items-center gap-0 px-4 py-3">
        <div className="flex-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm overflow-hidden">
          {orderedPlayers.map((p, i) => {
            const isMe = p.id === playerId;
            return (
              <span key={p.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-700 mr-1">·</span>}
                <span className={clsx(isMe ? 'text-zinc-200' : 'text-zinc-500')}>
                  {isMe ? 'You' : p.displayName}{p.isSpectator ? ' (watching)' : ''}
                </span>
              </span>
            );
          })}
        </div>

        {canAdvance && !isSpectator && (
          <button
            onClick={() => onAction({ type: 'next', playerId })}
            className="ml-4 shrink-0 flex items-center gap-1.5 px-5 py-2.5 min-h-11 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 rounded-full border border-zinc-700 text-sm font-medium transition-colors"
          >
            <span>Next</span>
            <span className="text-zinc-400">→</span>
          </button>
        )}

        {s.timerDurationMs && s.timerStartedAt && remainingMs !== null && (
          <span className={clsx(
            'ml-3 text-xs font-mono tabular-nums shrink-0',
            remainingMs <= 0 ? 'text-rose-400' : remainingMs <= 10 * 60 * 1000 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'
          )}>
            {remainingMs <= 0 ? "Time\u2019s up" : formatTime(remainingMs)}
          </span>
        )}
        </div>
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
