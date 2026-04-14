import type { GameState } from '@/lib/frameworks/types';
import type { ForgeGameConfig } from '@/lib/forge/types';

export interface ServerPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  frameworkId: string;
  forgeFileUrl: string;
  gameConfig: ForgeGameConfig;
  gameState: GameState | null;
  phase: 'lobby' | 'playing' | 'ended';
  players: ServerPlayer[];
  createdAt: string;
}

const globalWithRooms = globalThis as unknown as { __vttRooms?: Map<string, ServerRoom> };
if (!globalWithRooms.__vttRooms) globalWithRooms.__vttRooms = new Map();
const rooms = globalWithRooms.__vttRooms;

export function createRoom(room: ServerRoom): void {
  rooms.set(room.code, room);
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function hasRoom(code: string): boolean {
  return rooms.has(code);
}

export function addPlayer(code: string, player: ServerPlayer): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  const alreadyIn = room.players.some((p) => p.userId === player.userId);
  if (alreadyIn) return true;
  room.players = [...room.players, player];
  rooms.set(code, room);
  return true;
}

export function updateGameState(
  code: string,
  state: GameState,
  phase: 'lobby' | 'playing' | 'ended'
): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  room.gameState = state;
  room.phase = phase;
  rooms.set(code, room);
  return true;
}
