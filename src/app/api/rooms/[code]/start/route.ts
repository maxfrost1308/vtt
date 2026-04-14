import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';
import { createClient } from '@/lib/supabase/server';
import { getRoom, updateGameState } from '@/lib/room/store';
import { getFramework } from '@/lib/frameworks/index';
import { deserializeProject } from 'forge';

const FORGE_DIR = '/data/forge-files';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const room = getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.hostId !== user.id) {
    return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
  }

  if (room.phase !== 'lobby') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  const framework = getFramework(room.gameConfig.framework);
  if (!framework) {
    return NextResponse.json({ error: 'Unknown framework' }, { status: 400 });
  }

  const forgeFileName = decodeURIComponent(
    room.forgeFileUrl.split('/api/forge-files/')[1] ?? ''
  );
  const safeName = basename(forgeFileName);

  let forgeBuffer: Buffer;
  try {
    forgeBuffer = await readFile(join(FORGE_DIR, safeName));
  } catch {
    return NextResponse.json({ error: 'Forge file not found on server' }, { status: 404 });
  }

  let forgeProject;
  try {
    forgeProject = await deserializeProject(forgeBuffer.buffer as ArrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to parse forge file' }, { status: 500 });
  }

  const validation = framework.validate(forgeProject, room.gameConfig);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join('. ') }, { status: 400 });
  }

  const playerIds = room.players.map((p) => p.userId);
  const initialState = framework.createInitialState(forgeProject, room.gameConfig, playerIds);
  const playingState = { ...initialState, phase: 'playing' as const };

  updateGameState(code.toUpperCase(), playingState, 'playing');

  const updatedRoom = getRoom(code.toUpperCase());
  return NextResponse.json({ room: updatedRoom });
}
