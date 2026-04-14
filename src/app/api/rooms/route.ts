import { NextResponse } from 'next/server';
import { access } from 'fs/promises';
import { join, basename } from 'path';
import { createClient } from '@/lib/supabase/server';
import { createRoom, hasRoom } from '@/lib/room/store';
import type { ForgeGameConfig } from '@/lib/forge/types';

const FORGE_DIR = '/data/forge-files';
const ADMIN_IDS = (process.env.VTT_ADMIN_USER_IDS ?? '').split(',').filter(Boolean);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(user.id)) {
    return NextResponse.json({ error: 'Only admins can create rooms' }, { status: 403 });
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

  const basePath = process.env.NEXT_PUBLIC_BASEPATH || '';
  const forgeFileUrl = `${basePath}/api/forge-files/${encodeURIComponent(safeName)}`;

  let code = generateRoomCode();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    if (!hasRoom(code)) break;
    code = generateRoomCode();
    attempts++;
  }

  if (attempts >= MAX_ATTEMPTS) {
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
      },
    ],
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ code }, { status: 201 });
}
