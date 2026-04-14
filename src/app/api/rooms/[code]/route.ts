import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoom, updatePlayerHeartbeat, getPlayerOnlineStatus } from '@/lib/room/store';

export async function GET(
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

  updatePlayerHeartbeat(code.toLowerCase(), user.id);

  const roomWithOnlineStatus = {
    ...room,
    players: room.players.map((p) => ({
      ...p,
      isOnline: getPlayerOnlineStatus(p),
    })),
  };

  return NextResponse.json({ room: roomWithOnlineStatus });
}
