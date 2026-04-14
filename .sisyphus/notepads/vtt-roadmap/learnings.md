# Learnings — vtt-roadmap

## Architecture
- Game state is server-side in-memory Map (globalThis) — no DB for game logic
- Supabase used ONLY for Discord OAuth (cookie-based auth)
- Framework reducers run on server; client POSTs actions, polls GET every 2s
- Forge files stored on server filesystem at /home/max/talekeeper/forge-files/
- Card dimensions in mm (63.5mm x 88.9mm) — parsePx function in board.tsx converts units

## Key File Locations
- Framework: /home/max/talekeeper/github/vtt/src/lib/frameworks/descended-from-queen/
- Room store: /home/max/talekeeper/github/vtt/src/lib/room/store.ts
- Game board client: /home/max/talekeeper/github/vtt/src/components/room/game-board.tsx
- Action route: /home/max/talekeeper/github/vtt/src/app/api/rooms/[code]/action/route.ts
- Framework registry: /home/max/talekeeper/github/vtt/src/lib/frameworks/registry.ts
- Admin UI: /home/max/talekeeper/github/vtt/src/app/home-client.tsx
- Dockerfile: multi-stage, build context is ./github (wider, for forge sibling dep)

## Infrastructure
- Docker: vtt (beta, port 3013), vtt-prod (prod, port 3014)
- Beta: beta.talekeeper.in/vtt (behind Authelia 2FA)
- Prod: talekeeper.in/hack/vtt (public)
- Docker compose: /home/max/talekeeper/docker-compose.yml (VTT at ~lines 282-320)
- Docker --no-cache needed for rebuilds (Turbopack caching issues)
- Webhook scripts: /home/max/talekeeper/webhook/scripts/

## Conventions
- Admin restricted to user ID 76a13220-cf52-4ec6-982b-7351c8cf0059
- Next.js 16 uses proxy.ts instead of middleware.ts (breaking change from 15)
- Forge library is plain JS — forge.d.ts at src/lib/forge/forge.d.ts
- oh-maker.forge types: Queen(11), Instruction(18), Prompt(53), End(1), XCard(1)
- DftQ phases: intro -> playing -> ended
- Git repo: maxfrost1308/vtt (GitHub)
- WEBHOOK_SECRET is in docker-compose.yml environment section for webhook service

## [2026-04-14] Task: claude-md-update

- CLAUDE.md was completely stale — described Supabase DB tables (rooms, room_players), Realtime Presence, postgres_changes, optimistic locking, and Supabase Storage. None of these exist.
- Actual architecture: server-side in-memory Map on globalThis, client polls every 2s, Supabase for Discord OAuth only.
- Forge files live at /data/forge-files/ (container path, mounted from /home/max/talekeeper/forge-files/ on host). Config saved as sidecar .json files.
- Admin panel restricted to hardcoded user ID 76a13220-cf52-4ec6-982b-7351c8cf0059.
- API routes: POST /api/rooms, GET+action+join+start under /api/rooms/[code], GET /api/forge-files, GET+PUT config under /api/forge-files/[name].
- Framework registry also uses globalThis pattern (same as room store).
- proxy.ts is Next.js 16 middleware (renamed from middleware.ts in v15 → v16 breaking change).

## [2026-04-14] Task: git-initial-commit
- Initial commit pushed to main and beta branches
- Commit: feat: initial VTT — DftQ storytelling game with Discord auth
- Commit hash: 01799c2
- 56 files staged and committed (including .sisyphus/ directory)
- No .env files committed (properly gitignored)
- Both main and beta branches pushed to GitHub

## Generic Card Draw Framework Rewrite (Conversation-First)

**Date**: 2026-04-14

### Pattern Applied
Followed DftQ (Descended from the Queen) pattern exactly:
- State: `phase: 'playing'` (inherited) + custom `genericPhase: 'intro' | 'playing' | 'ended'`
- Actions: `'begin'` (host-only, intro→playing) and `'next'` (anyone, no turn gate)
- Shuffle: Fisher-Yates algorithm in `shuffle()` helper function

### Key Changes
1. **State Shape**: Removed `discard` array and `currentCard` field. Added `genericPhase` and `currentIndex` (index into deck array).
2. **Actions**: Replaced `'draw'`, `'shuffle'`, `'reset'` with `'begin'` and `'next'`.
3. **Reduce Logic**:
   - `'begin'`: Only in intro phase, sets `genericPhase: 'playing'`, `currentIndex: 0`
   - `'next'`: Only in playing phase, increments `currentIndex`; transitions to `'ended'` when `currentIndex >= deck.length - 1`
4. **getAvailableActions**: Returns `['begin']` in intro (host-only via board check), `['next']` in playing (for ANYONE, no turn restriction).
5. **Board Phases**:
   - **Intro**: Shows first card (deck[0]) + title + player list + "Begin" button (host only)
   - **Playing**: Full-screen card + bottom bar with player names + "Next →" button (always visible, no turn gate)
   - **Ended**: Simple "The story ends here." message + "Back to Home" link
6. **Removed**: Deck/discard counters, shuffle button, reset button, turn-based restrictions, X-Card overlay.

### Visual Style
Matched DftQ board exactly:
- Dark zinc palette (bg-zinc-950, bg-zinc-900, etc.)
- Card centered in flex container with shadow-2xl and ring-1 ring-white/5
- Bottom bar: shrink-0, flex items-center, border-t border-zinc-800/60, bg-zinc-900/80 backdrop-blur
- Player list: flex-wrap, gap-x-2, text-sm, no turn indicator (removed amber highlight)
- Button: "Next →" with arrow, zinc-800 hover:zinc-700, rounded-full, border border-zinc-700

### Build Status
✓ `npm run build` passes with zero TypeScript errors
✓ All 7 static pages generated successfully
✓ No diagnostics or warnings

### Notes
- `createInitialState` now starts with `phase: 'playing'` (inherited) and `genericPhase: 'intro'` (custom)
- `currentIndex: -1` initially; becomes 0 on 'begin' action
- No turn rotation logic; anyone can tap Next at any time
- First card shown in intro is `deck[0]` (already shuffled in initial state)

## [2026-04-14] Task: mobile-responsiveness
- ScaledCard component in board.tsx wraps card instances with ResizeObserver-based scaling
- Uses `transform: scale()` with a sizing wrapper div (`width: nativeW * scale, height: nativeH * scale`) to maintain correct layout flow
- parsePx helper: 1mm = 96/25.4 px ≈ 3.7795px (standard 63.5mm → ~240px, 88.9mm → ~336px)
- Standard card fits 375px viewport at scale=1 (240px card + 48px padding from px-6 = 288px < 375px)
- ScaledCard uses `w-full` to measure parent container width, `margin: 0 auto` on inner div for centering
- Tap targets: X-Card w-11 h-11 (44px), Next button min-h-11 py-2.5 px-5 (44px min height)
- Begin button already met 44px target (py-3 = 12px padding × 2 + text ≈ 48px)
- Tailwind 4: `min-h-11` works as standard utility (11 = 2.75rem = 44px), no arbitrary value needed

## [2026-04-14] Task: discord-banner
- Added dismissible voice chat banner to intro phase
- Banner appears at top of intro screen with 🎙 icon and "Join your Discord call" message
- Manual dismiss button (✕) with 44px touch target
- Auto-disappears when intro phase unmounts (Begin button tapped)
- State: local useState(false), no server persistence needed
- Design: zinc-800 bg, amber accent, subtle border
- Build: ✓ passed with zero errors

## [2026-04-14] Task: card-transitions
- Added fade-out/in transition (150ms each) when Next is tapped in DftQ playing phase
- Implementation: `cardVisible` state (useState) + useEffect watching `s.currentIndex`
- When currentIndex changes: setCardVisible(false) → wait 150ms → setCardVisible(true)
- Wrapper div around ScaledCard with `transition-opacity duration-150` and dynamic `opacity-0`/`opacity-100` classes
- Fade applied only to PLAYING phase (not intro or ended)
- Total transition time: 150ms fade-out + 150ms fade-in = 300ms total
- No layout shift during fade (wrapper maintains dimensions via ScaledCard's sizing)
- Build: ✓ passed with zero errors, no LSP diagnostics
