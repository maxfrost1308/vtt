'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { PlayerInfo } from '@/lib/frameworks/types';
import { PlayerList } from './player-list';

const TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: '60 min', value: 60 * 60 * 1000 },
  { label: '90 min', value: 90 * 60 * 1000 },
  { label: '120 min', value: 120 * 60 * 1000 },
  { label: 'None', value: null },
];

interface LobbyProps {
  roomCode: string;
  players: PlayerInfo[];
  hostId: string;
  currentUserId: string;
  frameworkName: string;
  onStartGame: () => void;
  isStarting: boolean;
  isLoadingForge: boolean;
  startError: string | null;
  selectedTimer: number | null;
  onTimerChange: (ms: number | null) => void;
}

export function Lobby({
  roomCode,
  players,
  hostId,
  currentUserId,
  frameworkName,
  onStartGame,
  isStarting,
  isLoadingForge,
  startError,
  selectedTimer,
  onTimerChange,
}: LobbyProps) {
  const isHost = currentUserId === hostId;
  const [copied, setCopied] = useState(false);

  const handleCopyInviteLink = () => {
    const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? '';
    const inviteUrl = `${window.location.origin}${basePath}/room/${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 min-h-screen bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Lobby</h1>
          <p className="text-zinc-400 mt-1 text-sm">{frameworkName}</p>
        </div>

        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">Invite Link</p>
          <div className="flex flex-col gap-3">
            <p className="text-2xl font-mono font-bold tracking-widest text-zinc-100">
              {roomCode}
            </p>
            <button
              onClick={handleCopyInviteLink}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-full text-sm font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-400 mb-3">
            Players ({players.length})
          </p>
          <PlayerList players={players} hostId={hostId} />
        </div>

        {isHost && (
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-2">Session Timer</p>
            <div className="flex gap-1.5">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onTimerChange(opt.value)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                    selectedTimer === opt.value
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isHost ? (
          <div className="flex flex-col gap-2">
            {isLoadingForge && (
              <p className="text-center text-zinc-500 text-sm">Loading game file…</p>
            )}
            <button
              onClick={onStartGame}
              disabled={isStarting || isLoadingForge || players.length < 1}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-xl transition-colors text-lg"
            >
              {isStarting ? 'Starting…' : isLoadingForge ? 'Loading game…' : 'Start Game'}
            </button>
            {startError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {startError}
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-zinc-500 text-sm">
            Waiting for the host to start the game…
          </p>
        )}
      </div>
    </div>
  );
}
