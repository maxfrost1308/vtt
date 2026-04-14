import { NextResponse } from 'next/server';
import { access, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { createClient } from '@/lib/supabase/server';
import { createRoom, getAllRoomCodes } from '@/lib/room/store';
import { generateRoomCode } from '@/lib/room/words';
import type { ForgeGameConfig } from '@/lib/forge/types';

const FORGE_DIR = '/data/forge-files';
function getAdminIds(): string[] {
  return (process.env.VTT_ADMIN_USER_IDS ?? '').split(',').filter(Boolean);
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { forge_file: string; game_config: ForgeGameConfig };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const safeName = basename(body.forge_file);
  if (!safeName.endsWith('.forge')) {
    return NextResponse.json({ error: 'Invalid forge file name' }, { status: 400 });
  }

  try {
    await access(join(FORGE_DIR, safeName));
  } catch {
    return NextResponse.json({ error: 'Forge file not found on server' }, { status: 404 });
  }

  const adminIds = getAdminIds();
  if (adminIds.length > 0 && !adminIds.includes(user.id)) {
    // Non-admin: only allowed if game is marked free on the server
    const configPath = join(FORGE_DIR, safeName.replace(/\.forge$/, '.json'));
    let serverConfig: ForgeGameConfig | null = null;
    try {
      const raw = await readFile(configPath, 'utf-8');
      serverConfig = JSON.parse(raw) as ForgeGameConfig;
    } catch {}
    if (!serverConfig?.free) {
      return NextResponse.json({ error: 'Only admins can create rooms for this game' }, { status: 403 });
    }
  }

  const basePath = process.env.NEXT_PUBLIC_BASEPATH || '';
  const forgeFileUrl = `${basePath}/api/forge-files/${encodeURIComponent(safeName)}`;

  let code: string;
  try {
    code = generateRoomCode(getAllRoomCodes());
  } catch {
    return NextResponse.json({ error: 'Could not generate unique room code' }, { status: 500 });
  }

  const displayName: string =
    (user.user_metadata?.['full_name'] as string | undefined) ??
    (user.user_metadata?.['name'] as string | undefined) ??
    user.email ??
    'Host';

  const avatarUrl: string | null =
    (user.user_metadata?.['avatar_url'] as string | undefined) ?? null;

  createRoom({
    code,
    hostId: user.id,
    frameworkId: body.game_config.framework,
    forgeFileUrl,
    gameConfig: body.game_config,
    gameState: null,
    phase: 'lobby',
    players: [
      {
        userId: user.id,
        displayName,
        avatarUrl,
        joinedAt: new Date().toISOString(),
        role: 'player',
        lastSeenAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ code }, { status: 201 });
}
