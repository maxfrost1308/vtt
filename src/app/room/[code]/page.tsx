import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRoom, addPlayer } from '@/lib/room/store';
import type { ForgeGameConfig } from '@/lib/forge/types';
import { GameBoard } from '@/components/room/game-board';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? '';
    redirect(`${basePath}/`);
  }

  const room = getRoom(code.toLowerCase());
  if (!room) {
    notFound();
  }

  const displayName =
    (user.user_metadata?.['full_name'] as string | undefined) ??
    (user.user_metadata?.['name'] as string | undefined) ??
    user.email ??
    'Player';

  const avatarUrl: string | null =
    (user.user_metadata?.['avatar_url'] as string | undefined) ?? null;

  addPlayer(code.toLowerCase(), {
    userId: user.id,
    displayName,
    avatarUrl,
    joinedAt: new Date().toISOString(),
    role: 'player',
    lastSeenAt: new Date().toISOString(),
  });

  const freshRoom = getRoom(code.toLowerCase())!;

  return (
    <GameBoard
      initialRoom={freshRoom}
      currentUserId={user.id}
      currentUserName={displayName}
      currentUserAvatar={avatarUrl}
      gameConfig={freshRoom.gameConfig as ForgeGameConfig}
    />
  );
}
