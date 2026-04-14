'use client';

import type { PlayerInfo } from '@/lib/frameworks/types';
import clsx from 'clsx';

interface PlayerListProps {
  players: PlayerInfo[];
  hostId: string;
}

export function PlayerList({ players, hostId }: PlayerListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700"
        >
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-sm font-bold text-zinc-300">
              {player.displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span className="flex-1 text-zinc-100 font-medium">{player.displayName}</span>
          <div className="flex items-center gap-2">
            {player.id === hostId && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                host
              </span>
            )}
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                player.isOnline ? 'bg-green-400' : 'bg-zinc-600'
              )}
              title={player.isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
