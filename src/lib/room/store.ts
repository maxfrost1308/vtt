import type { GameState } from '@/lib/frameworks/types';
import type { ForgeGameConfig } from '@/lib/forge/types';
import { mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export interface ServerPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  role: 'player' | 'spectator';
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

const ROOMS_DIR = '/data/forge-files/rooms/';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const globalWithRooms = globalThis as unknown as { __vttRooms?: Map<string, ServerRoom> };
if (!globalWithRooms.__vttRooms) {
  globalWithRooms.__vttRooms = new Map();

  // Load persisted rooms from disk
  try {
    mkdirSync(ROOMS_DIR, { recursive: true });
    const files = readdirSync(ROOMS_DIR).filter((f) => f.endsWith('.json'));
    const now = Date.now();

    for (const file of files) {
      try {
        const filePath = join(ROOMS_DIR, file);
        const raw = readFileSync(filePath, 'utf-8');
        const room: ServerRoom = JSON.parse(raw);

        if (now - new Date(room.createdAt).getTime() > MAX_AGE_MS) {
          unlinkSync(filePath);
        } else {
          globalWithRooms.__vttRooms.set(room.code, room);
        }
      } catch {
        // Skip malformed files
      }
    }
  } catch {
    console.warn('[vtt] Could not load persisted rooms from', ROOMS_DIR);
  }
}
const rooms = globalWithRooms.__vttRooms;

function persistRoom(room: ServerRoom): void {
  writeFile(join(ROOMS_DIR, room.code + '.json'), JSON.stringify(room, null, 2)).catch(() => {});
}

function removeRoomFile(code: string): void {
  unlink(join(ROOMS_DIR, code + '.json')).catch(() => {});
}

export function createRoom(room: ServerRoom): void {
  rooms.set(room.code, room);
  persistRoom(room);
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
  removeRoomFile(code);
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
  persistRoom(room);
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
  persistRoom(room);
  return true;
}
