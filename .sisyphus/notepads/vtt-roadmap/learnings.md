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
