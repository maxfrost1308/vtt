HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- "I need help setting up a VTT application. I'll need supabase login for discord."
- "Check the forge repository, I'm thinking of using the forge files as an input to get the card/components loaded in"
- "I want it be extendable and hackable as possible except for the base system support of having users login with their discord to get the same sense of being in the same room together"
- "I'd like to limit our dependency on external store for such kind of interactions. Won't it be better to use server side handling to manage this?"
- "Can you review this as a Principal Product Manager who plays Storytelling games for a living on how you'll improve the experience"
- "Let's do it all." (referring to the PM critique recommendations)
- "Let's create a plan to get all of these." (referring to the roadmap items)

GOAL
----
Execute the VTT roadmap plan at .sisyphus/plans/vtt-roadmap.md — starting with Wave 1 (git commit, webhook setup, CLAUDE.md update, prod verification).

WORK COMPLETED
--------------
- I built the entire VTT app from scratch at /home/max/talekeeper/github/vtt/
- Next.js 16 + TypeScript + Tailwind 4 + Supabase (Discord OAuth only)
- Server-side in-memory game state (Map on globalThis) — no DB for game logic
- Framework plugin system: GameFramework interface with pure reducers
- DftQ framework: radically simplified — intro (Queen card) -> playing (one card at a time) -> ended (debrief)
- Generic card draw framework (needs updating to match simplified philosophy)
- Forge file integration: .forge ZIP files on server, admin config UI for framework/role mapping
- Card rendering via forge library (backTemplate support for card backs)
- Card dimensions are in mm (63.5mm x 88.9mm) — parsePx in board.tsx converts mm/cm/in/pt to px
- Infrastructure wired: Docker (build context ./github for forge sibling dep), Caddy routes, webhook scripts, .env
- Supabase tables (rooms, room_players) exist but are NO LONGER USED — game state is server-side only
- Supabase project: dxivxvqpqaqvvhcvaact.supabase.co
- Admin restricted to user ID 76a13220-cf52-4ec6-982b-7351c8cf0059
- Ports: 3013 (beta), 3014 (prod)
- Containers running and responding 200
- NOTHING IS COMMITTED TO GIT YET

CURRENT STATE
-------------
- Build passes (npm run build in /home/max/talekeeper/github/vtt)
- Both containers running: vtt (beta, port 3013), vtt-prod (prod, port 3014)
- Beta accessible at beta.talekeeper.in/vtt (behind Authelia 2FA)
- Prod accessible at talekeeper.in/hack/vtt (public)
- Caddy config loaded with VTT routes
- Webhook scripts created but GitHub webhook not yet configured on the repo
- Forge files directory: /home/max/talekeeper/forge-files/ (one file: oh-maker.forge)
- oh-maker.forge has type column with: Queen(11), Instruction(18), Prompt(53), End(1), XCard(1)
- Git status: all files untracked (new repo from template, never committed)

PENDING TASKS
-------------
- Wave 1: Git commit + push, GitHub webhook setup, update CLAUDE.md, verify prod
- Wave 2: Mobile responsiveness, Discord voice banner, card transitions, update generic framework, playtest
- Wave 3: Story log, session timer, room persistence, forge format extension, new frameworks
- Wave 4: Game library UI, spectator mode, story export
- Full plan at: .sisyphus/plans/vtt-roadmap.md

KEY FILES
---------
- /home/max/talekeeper/github/vtt/src/lib/frameworks/descended-from-queen/index.ts - DftQ state machine (3 phases, 3 actions)
- /home/max/talekeeper/github/vtt/src/lib/frameworks/descended-from-queen/board.tsx - DftQ board (single card focus UI)
- /home/max/talekeeper/github/vtt/src/lib/room/store.ts - Server-side in-memory room store (globalThis Map)
- /home/max/talekeeper/github/vtt/src/components/room/game-board.tsx - Game board client (polls server, dispatches actions)
- /home/max/talekeeper/github/vtt/src/app/api/rooms/[code]/action/route.ts - Server-side action dispatch (runs reducer)
- /home/max/talekeeper/github/vtt/src/lib/frameworks/registry.ts - Framework registry (globalThis Map)
- /home/max/talekeeper/github/vtt/src/app/home-client.tsx - Landing page with admin config UI
- /home/max/talekeeper/github/vtt/Dockerfile - Multi-stage build (wider context: ./github for forge dep)
- /home/max/talekeeper/docker-compose.yml - VTT services at lines ~282-320
- /home/max/talekeeper/github/vtt/.sisyphus/plans/vtt-roadmap.md - Full roadmap plan

IMPORTANT DECISIONS
-------------------
- Server-side state over Supabase DB: eliminates version conflicts, simpler, lower latency. Trade-off: rooms are ephemeral (lost on restart). Persistence planned for Wave 3.
- Supabase kept ONLY for Discord OAuth (cookie-based auth check in API routes)
- Framework registry uses globalThis to survive module re-evaluation in production builds
- DftQ radically simplified per PM review: one card at a time, anyone can advance, no rigid turns, anonymous X-Card, no deck count/previous card/rules toggle
- Forge card dimensions are in mm — parsePx function in board.tsx handles unit conversion
- Docker build uses wider context (context: ./github) because forge is a sibling directory dependency
- Next.js 16 uses proxy.ts instead of middleware.ts (breaking change from 15)

EXPLICIT CONSTRAINTS
--------------------
- "I want it be extendable and hackable as possible except for the base system support of having users login with their discord"
- "I'd like to limit our dependency on external store for such kind of interactions"
- Design philosophy: "A shared screen that shows one prompt at a time while friends tell stories together on voice chat"

CONTEXT FOR CONTINUATION
------------------------
- Start with /start-work to execute the roadmap plan
- Wave 1 is the priority: commit everything, set up webhook, update docs
- The forge library is plain JS with no types — forge.d.ts at src/lib/forge/forge.d.ts provides declarations
- Docker --no-cache is needed for rebuilds (Turbopack caching issues)
- WEBHOOK_SECRET for GitHub webhook is in docker-compose.yml environment section for the webhook service
- The home-client.tsx has the admin config UI where forge files are configured with framework + role mapping
- endCardPosition config was moved from per-session to the admin config panel (FrameworkConfigField with type: 'select')
