import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoom, updateGameState } from '@/lib/room/store';
import { getFramework } from '@/lib/frameworks/index';
import type { GameAction } from '@/lib/frameworks/types';

export async function POST(
  request: Request,
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

  let body: { type: string; playerId: string; payload?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const room = getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (!room.gameState) {
    return NextResponse.json({ error: 'Game not started' }, { status: 400 });
  }

  const framework = getFramework(room.gameConfig.framework);
  if (!framework) {
    return NextResponse.json({ error: 'Unknown framework' }, { status: 400 });
  }

  const action: GameAction = {
    type: body.type,
    playerId: body.playerId,
    payload: body.payload,
  };

  const nextState = framework.reduce(room.gameState, action);
  if (!nextState) {
    return NextResponse.json({ error: 'Action not applicable' }, { status: 400 });
  }

  const phase = nextState.phase === 'ended' ? 'ended' : room.phase;
  updateGameState(code.toUpperCase(), nextState, phase);

  const updatedRoom = getRoom(code.toUpperCase());
  return NextResponse.json({ room: updatedRoom });
}
