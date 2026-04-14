import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoom, addPlayer } from '@/lib/room/store';

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

  const room = getRoom(code.toLowerCase());
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const displayName =
    (user.user_metadata?.['full_name'] as string | undefined) ??
    (user.user_metadata?.['name'] as string | undefined) ??
    user.email ??
    'Player';

  const avatarUrl: string | null =
    (user.user_metadata?.['avatar_url'] as string | undefined) ?? null;

  let spectator = false;
  try {
    const body = (await _request.json()) as { spectator?: boolean };
    spectator = body.spectator === true;
  } catch {
    // No body or invalid JSON — default to player
  }

  addPlayer(code.toLowerCase(), {
    userId: user.id,
    displayName,
    avatarUrl,
    joinedAt: new Date().toISOString(),
    role: spectator ? 'spectator' : 'player',
    lastSeenAt: new Date().toISOString(),
  });

  const updatedRoom = getRoom(code.toLowerCase());
  return NextResponse.json({ room: updatedRoom });
}
