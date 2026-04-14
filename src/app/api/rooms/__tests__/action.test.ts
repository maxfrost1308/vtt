import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../[code]/action/route';
import * as supabaseServer from '@/lib/supabase/server';
import * as roomStore from '@/lib/room/store';
import * as frameworkIndex from '@/lib/frameworks/index';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/room/store');
vi.mock('@/lib/frameworks/index');

describe('POST /api/rooms/[code]/action', () => {
  const mockUserId = 'user-123';
  const mockRoomCode = 'TEST';
  const mockGameState = {
    phase: 'playing' as const,
    turnIndex: 0,
    playerOrder: ['user-123', 'user-456'],
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use user.id from auth session instead of body.playerId', async () => {
    const mockUser = { id: mockUserId, email: 'test@example.com' };
    const mockRoom = {
      code: mockRoomCode,
      gameState: mockGameState,
      gameConfig: { framework: 'test-framework' },
      phase: 'playing',
      players: [
        { userId: mockUserId, displayName: 'Player 1', avatarUrl: null, joinedAt: '2025-01-01', role: 'player' as const, lastSeenAt: '2025-01-01' },
        { userId: 'user-456', displayName: 'Player 2', avatarUrl: null, joinedAt: '2025-01-01', role: 'player' as const, lastSeenAt: '2025-01-01' },
      ],
    };
    const mockFramework = {
      reduce: vi.fn().mockReturnValue(mockGameState),
    };

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as any);

    vi.mocked(roomStore.getRoom).mockReturnValue(mockRoom as any);
    vi.mocked(frameworkIndex.getFramework).mockReturnValue(mockFramework as any);

    const request = new Request('http://localhost:3000/api/rooms/TEST/action', {
      method: 'POST',
      body: JSON.stringify({
        type: 'move',
        playerId: 'attacker-user-456', // This should be ignored
        payload: { x: 1, y: 2 },
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: mockRoomCode }),
    });

    expect(response.status).toBe(200);
    expect(mockFramework.reduce).toHaveBeenCalledWith(
      mockGameState,
      expect.objectContaining({
        type: 'move',
        playerId: mockUserId, // Should use user.id, not body.playerId
        payload: { x: 1, y: 2 },
      })
    );
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any);

    const request = new Request('http://localhost:3000/api/rooms/TEST/action', {
      method: 'POST',
      body: JSON.stringify({
        type: 'move',
        playerId: 'user-456',
        payload: {},
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: mockRoomCode }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid request body', async () => {
    const mockUser = { id: mockUserId, email: 'test@example.com' };

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as any);

    const request = new Request('http://localhost:3000/api/rooms/TEST/action', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: mockRoomCode }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid request body');
  });

  it('should return 404 when room does not exist', async () => {
    const mockUser = { id: mockUserId, email: 'test@example.com' };

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as any);

    vi.mocked(roomStore.getRoom).mockReturnValue(undefined);

    const request = new Request('http://localhost:3000/api/rooms/NOTFOUND/action', {
      method: 'POST',
      body: JSON.stringify({
        type: 'move',
        playerId: 'user-456',
        payload: {},
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: 'NOTFOUND' }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe('Room not found');
  });

  it('should return 403 when user is not a member of the room', async () => {
    const mockUser = { id: 'user-not-in-room', email: 'test@example.com' };
    const mockRoom = {
      code: mockRoomCode,
      gameState: mockGameState,
      gameConfig: { framework: 'test-framework' },
      phase: 'playing',
      players: [
        { userId: 'user-123', displayName: 'Player 1', avatarUrl: null, joinedAt: '2025-01-01', role: 'player' as const, lastSeenAt: '2025-01-01' },
        { userId: 'user-456', displayName: 'Player 2', avatarUrl: null, joinedAt: '2025-01-01', role: 'player' as const, lastSeenAt: '2025-01-01' },
      ],
    };

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as any);

    vi.mocked(roomStore.getRoom).mockReturnValue(mockRoom as any);

    const request = new Request('http://localhost:3000/api/rooms/TEST/action', {
      method: 'POST',
      body: JSON.stringify({
        type: 'move',
        payload: { x: 1, y: 2 },
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: mockRoomCode }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Not a member of this room');
  });

  it('should return 403 when user is a spectator', async () => {
    const mockUser = { id: 'spectator-user', email: 'spectator@example.com' };
    const mockRoom = {
      code: mockRoomCode,
      gameState: mockGameState,
      gameConfig: { framework: 'test-framework' },
      phase: 'playing',
      players: [
        { userId: 'user-123', displayName: 'Player 1', avatarUrl: null, joinedAt: '2025-01-01', role: 'player' as const, lastSeenAt: '2025-01-01' },
        { userId: 'spectator-user', displayName: 'Spectator', avatarUrl: null, joinedAt: '2025-01-01', role: 'spectator' as const, lastSeenAt: '2025-01-01' },
      ],
    };

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as any);

    vi.mocked(roomStore.getRoom).mockReturnValue(mockRoom as any);

    const request = new Request('http://localhost:3000/api/rooms/TEST/action', {
      method: 'POST',
      body: JSON.stringify({
        type: 'move',
        payload: { x: 1, y: 2 },
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: mockRoomCode }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Spectators cannot perform actions');
  });
});
