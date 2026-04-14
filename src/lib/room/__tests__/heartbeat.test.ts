import { describe, it, expect } from 'vitest';
import { getPlayerOnlineStatus } from '../store';
import type { ServerPlayer } from '../store';

function makePlayer(lastSeenAt?: string): ServerPlayer {
  return {
    userId: 'user-1',
    displayName: 'Test Player',
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
    role: 'player',
    lastSeenAt: lastSeenAt as string,
  };
}

describe('getPlayerOnlineStatus', () => {
  it('returns true when lastSeenAt is within 10 seconds', () => {
    const player = makePlayer(new Date(Date.now() - 5_000).toISOString());
    expect(getPlayerOnlineStatus(player)).toBe(true);
  });

  it('returns false when lastSeenAt is older than 10 seconds', () => {
    const player = makePlayer(new Date(Date.now() - 15_000).toISOString());
    expect(getPlayerOnlineStatus(player)).toBe(false);
  });

  it('returns false when lastSeenAt is missing', () => {
    const player = makePlayer(undefined);
    expect(getPlayerOnlineStatus(player)).toBe(false);
  });
});
