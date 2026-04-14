import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import * as supabaseServer from '@/lib/supabase/server';
import * as roomStore from '@/lib/room/store';
import * as roomWords from '@/lib/room/words';
import * as fsPromises from 'fs/promises';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/room/store');
vi.mock('@/lib/room/words');
vi.mock('fs/promises');

const ADMIN_ID = 'admin-user-id';
const NON_ADMIN_ID = 'regular-user-id';

function setAdminIds(ids: string) {
  vi.stubEnv('VTT_ADMIN_USER_IDS', ids);
}

function mockAuth(userId: string | null) {
  const user = userId
    ? { id: userId, email: 'test@example.com', user_metadata: { full_name: 'Tester' } }
    : null;
  vi.mocked(supabaseServer.createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as any);
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/rooms — self-service free games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(roomWords.generateRoomCode).mockReturnValue('brave-panda-sunset');
    vi.mocked(roomStore.getAllRoomCodes).mockReturnValue(new Set());
    vi.mocked(roomStore.createRoom).mockReturnValue(undefined as any);
    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
  });

  it('non-admin can create room for free game', async () => {
    setAdminIds(ADMIN_ID);
    mockAuth(NON_ADMIN_ID);

    const sidecarConfig = { framework: 'test', roles: {}, free: true };
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(sidecarConfig));

    const req = makeRequest({
      forge_file: 'mygame.forge',
      game_config: { framework: 'test', roles: {}, free: true },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.code).toBe('brave-panda-sunset');
    expect(roomStore.createRoom).toHaveBeenCalled();
  });

  it('non-admin cannot create room for non-free game (403)', async () => {
    setAdminIds(ADMIN_ID);
    mockAuth(NON_ADMIN_ID);

    const sidecarConfig = { framework: 'test', roles: {} };
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(sidecarConfig));

    const req = makeRequest({
      forge_file: 'mygame.forge',
      game_config: { framework: 'test', roles: {} },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admin/i);
    expect(roomStore.createRoom).not.toHaveBeenCalled();
  });

  it('non-admin blocked when client claims free but server config disagrees', async () => {
    setAdminIds(ADMIN_ID);
    mockAuth(NON_ADMIN_ID);

    const sidecarConfig = { framework: 'test', roles: {} };
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(sidecarConfig));

    const req = makeRequest({
      forge_file: 'mygame.forge',
      game_config: { framework: 'test', roles: {}, free: true },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(roomStore.createRoom).not.toHaveBeenCalled();
  });

  it('admin can create room for any game', async () => {
    setAdminIds(ADMIN_ID);
    mockAuth(ADMIN_ID);

    vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('ENOENT'));

    const req = makeRequest({
      forge_file: 'mygame.forge',
      game_config: { framework: 'test', roles: {} },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.code).toBe('brave-panda-sunset');
    expect(roomStore.createRoom).toHaveBeenCalled();
  });
});
