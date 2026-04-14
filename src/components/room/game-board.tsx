'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { deserializeProject } from 'forge';
import type { ForgeProject } from 'forge';
import type { ServerRoom } from '@/lib/room/store';
import type { GameState, GameAction, PlayerInfo } from '@/lib/frameworks/types';
import type { ForgeGameConfig } from '@/lib/forge/types';
import { getFramework } from '@/lib/frameworks/index';
import { Lobby } from './lobby';

const POLL_INTERVAL_MS = 2000;

interface GameBoardProps {
  initialRoom: ServerRoom;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  gameConfig: ForgeGameConfig;
}

export function GameBoard({
  initialRoom,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  gameConfig,
}: GameBoardProps) {
  const [room, setRoom] = useState<ServerRoom>(initialRoom);
  const [forgeProject, setForgeProject] = useState<ForgeProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timerDurationMs, setTimerDurationMs] = useState<number | null>(null);
  const versionRef = useRef<number>(
    (initialRoom.gameState as GameState | null)?.version ?? -1
  );
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? '';

  useEffect(() => {
    let cancelled = false;
    fetch(initialRoom.forgeFileUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => deserializeProject(buf))
      .then((project) => {
        if (!cancelled) setForgeProject(project);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load game file');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialRoom.forgeFileUrl]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${basePath}/api/rooms/${room.code}`);
        if (!res.ok) return;
        const data = (await res.json()) as { room: ServerRoom };
        const incoming = data.room;
        const incomingVersion = (incoming.gameState as GameState | null)?.version ?? -1;
        if (
          incomingVersion !== versionRef.current ||
          incoming.phase !== room.phase ||
          incoming.players.length !== room.players.length
        ) {
          versionRef.current = incomingVersion;
          setRoom(incoming);
        }
      } catch {
      }
    };

    const id = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [basePath, room.code, room.phase, room.players.length]);

  const players: PlayerInfo[] = room.players.map((sp) => ({
    id: sp.userId,
    displayName: sp.displayName,
    avatarUrl: sp.avatarUrl,
    isHost: sp.userId === room.hostId,
    isOnline: true,
    isSpectator: sp.role === 'spectator',
  }));

  const framework = getFramework(gameConfig.framework);

  const handleStartGame = useCallback(async () => {
    setIsStarting(true);
    setStartError(null);

    try {
      const res = await fetch(`${basePath}/api/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timerDurationMs }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to start game');
      }
      const data = (await res.json()) as { room: ServerRoom };
      const incomingVersion = (data.room.gameState as GameState | null)?.version ?? -1;
      versionRef.current = incomingVersion;
      setRoom(data.room);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  }, [basePath, room.code]);

  const handleAction = useCallback(
    async (action: GameAction) => {
      try {
        const res = await fetch(`${basePath}/api/rooms/${room.code}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setActionError(data.error ?? 'Action failed');
          return;
        }
        const data = (await res.json()) as { room: ServerRoom };
        const incomingVersion = (data.room.gameState as GameState | null)?.version ?? -1;
        versionRef.current = incomingVersion;
        setRoom(data.room);
        setActionError(null);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Action failed');
      }
    },
    [basePath, room.code]
  );

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-red-400 gap-4 p-8">
        <p className="text-lg font-medium">Failed to load game file</p>
        <p className="text-sm text-red-500">{loadError}</p>
      </div>
    );
  }

  const gameState = room.gameState as GameState | null;

  if (room.phase === 'lobby' || !gameState) {
    return (
      <Lobby
        roomCode={room.code}
        players={players}
        hostId={room.hostId}
        currentUserId={currentUserId}
        frameworkName={framework?.name ?? gameConfig.framework}
        onStartGame={handleStartGame}
        isStarting={isStarting}
        isLoadingForge={!forgeProject}
        startError={startError}
        selectedTimer={timerDurationMs}
        onTimerChange={setTimerDurationMs}
      />
    );
  }

  if (room.phase === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 gap-6">
        <h1 className="text-3xl font-bold">Game Over</h1>
        <a
          href={basePath || '/'}
          className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-full transition-colors"
        >
          Back to Home
        </a>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-red-400 gap-4">
        <p>Unknown framework: {gameConfig.framework}</p>
      </div>
    );
  }

  if (!forgeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-400">
        <p>Loading game…</p>
      </div>
    );
  }

  const BoardComponent = framework.BoardComponent;

  return (
    <div className="flex flex-col min-h-screen">
      <BoardComponent
        state={gameState}
        playerId={currentUserId}
        players={players}
        forgeProject={forgeProject}
        gameConfig={gameConfig}
        onAction={handleAction}
      />
      {actionError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-900/90 border border-red-700 text-red-200 text-sm rounded-lg shadow-lg">
          {actionError}
        </div>
      )}
    </div>
  );
}
