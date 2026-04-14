# VTT

Virtual Tabletop platform for playing storygames and TTRPGs online. An admin uploads `.forge` files (card game projects) to the server, configures them with a framework and role mapping, then players create rooms and play together with Discord auth.

## Tech Stack

- Next.js 16 (App Router, standalone output)
- TypeScript (strict mode)
- Tailwind CSS 4
- Supabase (Discord OAuth only — no DB tables, no Realtime, no Storage)
- Forge library (local: `file:../forge`) for card rendering

## Architecture

```
src/
  app/
    page.tsx                          # Landing (server) → home-client.tsx (client)
    home-client.tsx                   # Discord login, admin config panel, create/join room
    auth/callback/route.ts            # Discord OAuth callback
    room/[code]/page.tsx              # Room page (server: fetch room, auto-join player)
    api/
      rooms/
        route.ts                      # POST: create room
        [code]/
          route.ts                    # GET: room state (polled every 2s)
          join/route.ts               # POST: join room
          start/route.ts              # POST: start game (host only)
          action/route.ts             # POST: dispatch action (server runs reducer)
      forge-files/
        route.ts                      # GET: list forge files (admin only)
        [name]/
          route.ts                    # GET: serve raw .forge file bytes
          config/route.ts             # PUT: save framework config for a forge file (admin only)
  lib/
    supabase/
      client.ts                       # Browser client (createBrowserClient)
      server.ts                       # Server client (createServerClient + cookies)
    forge/
      forge.d.ts                      # Type declarations for the plain-JS forge library
      types.ts                        # ForgeGameConfig (game.json schema)
      loader.ts                       # loadForgeFile() — deserialize + extract game config
    frameworks/
      types.ts                        # GameFramework interface, GameState, GameAction, BoardProps
      registry.ts                     # Map-based framework registry (stored on globalThis)
      index.ts                        # Auto-registers all built-in frameworks
      descended-from-queen/           # DftQ: prompt deck + hidden end card
        index.ts                      # Reducer, validate, createInitialState
        board.tsx                     # Game board UI
      generic-card-draw/              # Simple draw-from-deck framework
        index.ts
        board.tsx
    room/
      store.ts                        # Server-side in-memory Map on globalThis.__vttRooms
      types.ts                        # Re-exports ServerRoom, ServerPlayer from store
  components/
    card-renderer.tsx                 # Wraps forge renderCard() + scopeCss()
    room/
      lobby.tsx                       # Pre-game lobby (players, start button)
      player-list.tsx                 # Player list with online indicators
      game-board.tsx                  # Loads framework BoardComponent, polls state every 2s
  proxy.ts                            # Token refresh (Next.js 16 renamed middleware → proxy)
```

### Key Patterns

- **Framework plugins**: Each framework implements `GameFramework` with a pure `reduce()` function. New frameworks = one directory + register in `index.ts`.
- **Forge integration**: `.forge` files are stored on the server filesystem at `/data/forge-files/`. Config (framework + role mapping) is saved as a sidecar `.json` file next to each `.forge` file. Falls back to `generic-card-draw` if no config.
- **State management**: All room state lives in a server-side `Map<string, ServerRoom>` on `globalThis.__vttRooms`. Rooms are ephemeral — lost on server restart. No database.
- **State sync**: Clients poll `GET /api/rooms/[code]` every 2 seconds. Actions go to `POST /api/rooms/[code]/action`, which runs the framework reducer server-side and returns the updated room.
- **Admin config**: Only user ID `76a13220-cf52-4ec6-982b-7351c8cf0059` sees the Game Configuration panel. Admins pick a forge file, load it, assign a framework and role mappings, then save. Only configured forge files can be used to create rooms.
- **Server/client split**: Pages are server components for auth checks; client components handle interactivity.

### Supabase Usage

Supabase is used **only** for Discord OAuth. Cookie-based sessions via `@supabase/ssr`. There are no `rooms` or `room_players` tables. No Realtime channels. No Storage buckets.

## Commands

```bash
npm ci            # Install dependencies
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Lint
npm test          # Run tests (vitest)
```

## Setup Required

### Supabase

Enable Discord in Supabase Dashboard > Authentication > Providers. Set callback URL to `https://<project>.supabase.co/auth/v1/callback` in Discord Developer Portal.

Set env vars:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Forge Files Directory

The app reads `.forge` files from `/data/forge-files/` inside the container. Mount a host directory there:

```yaml
volumes:
  - /home/max/talekeeper/forge-files:/data/forge-files
```

Place `.forge` files in that directory. Config is saved as sidecar `.json` files (e.g., `game.forge` → `game.json`) by the admin UI.

## Coding Conventions

- Named exports everywhere (no default exports except pages)
- `'use client'` only on files that need browser APIs
- Tailwind 4 utility classes, no CSS modules
- Framework state reducers are pure functions (no side effects)
- `@/` path alias for all imports from `src/`

## Deployment

Deployed via talekeeper homelab infrastructure. See `/home/max/talekeeper/CLAUDE.md` for infra details.

- **Beta**: beta.talekeeper.in/vtt (2FA via Authelia)
- **Prod**: talekeeper.in/hack/vtt (public)

Docker build uses wider context (`context: ./github`) because forge is a sibling directory dependency. The Dockerfile copies forge to `/forge/` and the app resolves `file:../forge` from `/app/`.

Ports: 3013 (beta), 3014 (prod).

## Adding a New Framework

1. Create `src/lib/frameworks/{name}/index.ts` implementing `GameFramework`
2. Create `src/lib/frameworks/{name}/board.tsx` implementing `BoardProps`
3. Register in `src/lib/frameworks/index.ts`
4. Framework receives forge data via `BoardProps.forgeProject` and renders cards via `CardRenderer`
5. Game state management is pure: `reduce(state, action) → newState | null`
