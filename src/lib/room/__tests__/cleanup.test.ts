import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoom, cleanupStaleRooms, getAllRoomCodes, deleteRoom } from '../store';
import type { ServerRoom, ServerPlayer } from '../store';

function makeRoom(code: string, createdAt: string, players: ServerPlayer[]): ServerRoom {
  return {
    code,
    hostId: 'host-1',
    frameworkId: 'framework-1',
    forgeFileUrl: 'http://example.com/forge.json',
    gameConfig: {} as any,
    gameState: null,
    phase: 'lobby',
    players,
    createdAt,
  };
}

function makePlayer(userId: string, lastSeenAt: string | null): ServerPlayer {
  return {
    userId,
    displayName: 'Test Player',
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
    role: 'player',
    lastSeenAt: lastSeenAt as string,
  };
}

describe('cleanupStaleRooms', () => {
  beforeEach(() => {
    // Clear all rooms before each test
    const codes = Array.from(getAllRoomCodes());
    codes.forEach((code) => deleteRoom(code));
  });

  it('deletes room with all players stale (>30min)', () => {
    const now = Date.now();
    const staleTime = new Date(now - 31 * 60 * 1000).toISOString();
    const room = makeRoom('TEST1', new Date().toISOString(), [
      makePlayer('user-1', staleTime),
      makePlayer('user-2', staleTime),
    ]);

    createRoom(room);
    expect(getAllRoomCodes().has('test1')).toBe(true);

    cleanupStaleRooms();

    expect(getAllRoomCodes().has('test1')).toBe(false);
  });

  it('keeps room with at least one active player (<30min)', () => {
    const now = Date.now();
    const activeTime = new Date(now - 5 * 60 * 1000).toISOString();
    const staleTime = new Date(now - 31 * 60 * 1000).toISOString();
    const room = makeRoom('TEST2', new Date().toISOString(), [
      makePlayer('user-1', activeTime),
      makePlayer('user-2', staleTime),
    ]);

    createRoom(room);
    expect(getAllRoomCodes().has('test2')).toBe(true);

    cleanupStaleRooms();

    expect(getAllRoomCodes().has('test2')).toBe(true);
  });

  it('deletes room older than 24 hours regardless of player activity', () => {
    const now = Date.now();
    const recentTime = new Date(now - 5 * 60 * 1000).toISOString();
    const oldCreatedAt = new Date(now - 25 * 60 * 60 * 1000).toISOString();
    const room = makeRoom('TEST3', oldCreatedAt, [makePlayer('user-1', recentTime)]);

    createRoom(room);
    expect(getAllRoomCodes().has('test3')).toBe(true);

    cleanupStaleRooms();

    expect(getAllRoomCodes().has('test3')).toBe(false);
  });

  it('deletes empty rooms', () => {
    const room = makeRoom('TEST4', new Date().toISOString(), []);

    createRoom(room);
    expect(getAllRoomCodes().has('test4')).toBe(true);

    cleanupStaleRooms();

    expect(getAllRoomCodes().has('test4')).toBe(false);
  });
});
