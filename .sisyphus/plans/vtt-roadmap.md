# VTT Roadmap

## TL;DR

> Ship the VTT, then iterate. Commit everything, set up CI/CD, playtest, then add polish, persistence, and new frameworks.
>
> **Estimated Effort**: Large (multi-session)
> **Parallel Execution**: YES - 4 waves

---

## Context

### What Exists
- Full VTT app at /home/max/talekeeper/github/vtt/
- Next.js 16 + Supabase (auth only) + server-side in-memory state
- DftQ framework: radically simplified single-card-focus experience
- Generic card draw framework (needs updating to match new philosophy)
- Infrastructure wired: Docker, Caddy, webhooks scripts, .env
- Forge file integration: server-side files, admin config UI
- Running at beta.talekeeper.in/vtt and talekeeper.in/hack/vtt (containers up)
- Nothing committed to git yet

### Key Architecture Decisions
- Game state is server-side in-memory Map (no DB for game logic)
- Supabase used ONLY for Discord OAuth
- Framework reducers run on the server (client POSTs actions)
- Client polls GET /api/rooms/[code] every 2 seconds
- Forge files stored on server filesystem at /home/max/talekeeper/forge-files/
- Cards use mm dimensions (63.5mm x 88.9mm) — parsePx converts to pixels

### Design Philosophy
"A shared screen that shows one prompt at a time while friends tell stories together on voice chat."
- One card fills the screen during play
- Anyone can advance (no rigid turn enforcement)
- X-Card is anonymous, auto-advances
- Minimal UI — the conversation IS the game

---

## Work Objectives

### Core Objective
Ship the VTT as a usable product and iterate based on playtesting.

### Must Have
- Git history with clean commits
- Auto-deploy via GitHub webhook
- Mobile-responsive card rendering
- At least one successful real playtest session

### Must NOT Have
- Over-engineered UI (keep the single-card focus)
- Database dependencies for game state
- Features that haven't been validated by playtesting

---

## Verification Strategy

- **Automated tests**: None for now (add after playtesting validates the product)
- **QA**: Manual testing after each wave — create room, play through, verify on mobile

---

## Execution Strategy

### Wave 1 — Ship It (foundation)

```
Wave 1 (Start Immediately):
├── Task 1: Git commit all VTT work [quick]
├── Task 2: Set up GitHub webhook on vtt repo [quick]
├── Task 3: Update CLAUDE.md to reflect current architecture [quick]
└── Task 4: Verify prod deployment at talekeeper.in/hack/vtt [quick]
```

### Wave 2 — Playtest-Ready Polish (after Wave 1)

```
Wave 2 (After Wave 1 — parallel):
├── Task 5: Mobile responsiveness — cards scale to viewport [visual-engineering]
├── Task 6: "Join voice on Discord" banner with server link [quick]
├── Task 7: Card transitions — fade/slide on Next [visual-engineering]
├── Task 8: Update generic-card-draw framework to match simplified philosophy [quick]
└── Task 9: Playtest session — invite friends, document issues [manual]
```

### Wave 3 — Post-Playtest Features (after Wave 2)

```
Wave 3 (After playtest — parallel):
├── Task 10: Story log — optional one-line summaries per prompt [unspecified-high]
├── Task 11: Session timer — subtle countdown (60/90 min presets) [quick]
├── Task 12: Room persistence — JSON file so rooms survive restarts [unspecified-high]
├── Task 13: Forge format extension — game.json declares framework [quick]
└── Task 14: More frameworks — build next game system [deep]
```

### Wave 4 — Growth (after Wave 3)

```
Wave 4 (Longer term — parallel):
├── Task 15: Game library — browsable collection of forge files [visual-engineering]
├── Task 16: Spectator mode — watch without being in turn rotation [unspecified-high]
└── Task 17: Share/export story log — shareable session recap [quick]
```

---

## TODOs

- [x] 1. Git commit all VTT work

  **What to do**:
  - Stage all files in /home/max/talekeeper/github/vtt/
  - Create initial commit with descriptive message
  - Push to main branch on maxfrost1308/vtt
  - Create and push beta branch

  **Acceptance Criteria**:
  - git log shows clean commit
  - GitHub repo has all source files

  **Commit**: YES
  - Message: `feat: initial VTT — DftQ storytelling game with Discord auth`

---

- [x] 2. Set up GitHub webhook on vtt repo

  **What to do**:
  - On GitHub repo Settings > Webhooks > Add webhook
  - Payload URL: https://webhook.talekeeper.in/vtt
  - Content type: application/json
  - Secret: same WEBHOOK_SECRET from docker-compose.yml
  - Events: Just the push event
  - Test with a push to beta branch

  **Acceptance Criteria**:
  - Push to beta triggers build and deploy
  - Telegram notification received

---

- [x] 3. Update CLAUDE.md to reflect current architecture

  **What to do**:
  - Update architecture section: server-side state, no Supabase for game logic
  - Update Supabase section: auth only, remove rooms/room_players table references
  - Add new API routes documentation
  - Document the radical DftQ redesign philosophy

  **Acceptance Criteria**:
  - CLAUDE.md accurately describes current architecture

---

- [x] 4. Verify prod deployment

  **What to do**:
  - Rebuild vtt-prod container
  - Test talekeeper.in/hack/vtt returns 200
  - Verify Discord OAuth works on prod URL
  - Check Caddy routing

  **Acceptance Criteria**:
  - curl talekeeper.in/hack/vtt returns 200

---

- [x] 5. Mobile responsiveness

  **What to do**:
  - Cards must scale to fit mobile viewport (max-width: 100vw, constrained height)
  - Player bar wraps on small screens
  - Touch-friendly Next and X-Card buttons (min 44px tap targets)
  - Test on iPhone Safari and Android Chrome viewport sizes
  - Intro screen (Queen card) must be readable on mobile

  **Acceptance Criteria**:
  - Playwright test at 375x812 viewport: card visible, buttons tappable

---

- [x] 6. "Join voice on Discord" banner

  **What to do**:
  - Show a dismissible banner at the top of the intro screen
  - Text: "This game is played over voice chat. Join your Discord call to begin."
  - Optional: link to a Discord server/channel (configurable via env var or forge config)
  - Banner auto-dismisses after Begin is tapped

  **Acceptance Criteria**:
  - Banner visible on intro screen, gone during play

---

- [x] 7. Card transitions

  **What to do**:
  - When Next is tapped: current card fades out, new card fades in
  - CSS transition: opacity 0 -> 1 over 300ms
  - X-Card overlay already has its own animation (2s display)
  - No complex 3D or flip animations — keep it simple

  **Acceptance Criteria**:
  - Cards transition smoothly, not instant swap

---

- [x] 8. Update generic-card-draw framework

  **What to do**:
  - Simplify to match DftQ philosophy: one card at a time, anyone advances
  - Remove complex state management
  - Same board pattern: intro (show first card as theme), playing (one card), ended

  **Acceptance Criteria**:
  - Generic framework works with any forge file that has no game.json config

---

- [ ] 9. Playtest session

  **What to do**:
  - Schedule a session with 3-4 friends
  - Use Discord voice + beta.talekeeper.in/vtt
  - Document: what worked, what was confusing, what broke, what's missing
  - Create GitHub issues for anything found

  **Acceptance Criteria**:
  - Session completed, feedback documented

---

- [x] 10. Story log

  **What to do**:
  - After each prompt card, show an optional text input: "What happened?" (1 line)
  - Store in game state as array of { prompt: cardIndex, note: string, author: playerId }
  - On ended screen, show the full story log as a readable recap
  - Make it exportable as plain text

  **Acceptance Criteria**:
  - Story log visible on ended screen with all notes

---

- [x] 11. Session timer

  **What to do**:
  - Host sets timer when starting (60/90/120 min or custom, or no timer)
  - Subtle display in bottom corner: remaining time
  - At 10 minutes remaining: gentle visual pulse
  - At 0: "Time's up — consider wrapping up" message (not forced)

  **Acceptance Criteria**:
  - Timer visible, countdown accurate, gentle end nudge

---

- [x] 12. Room persistence

  **What to do**:
  - On every state change, write room state to /data/forge-files/rooms/{code}.json
  - On server start, load existing room files into the Map
  - Auto-cleanup: delete room files older than 24 hours on startup
  - Mount a persistent volume for /data/forge-files/rooms/

  **Acceptance Criteria**:
  - Room survives container restart
  - Stale rooms auto-cleaned

---

- [x] 13. Forge format extension

  **What to do**:
  - Add optional game.json inside .forge ZIP: { framework: "descended-from-queen", config: {...} }
  - Forge loader extracts game.json if present
  - If game.json exists, skip admin config step — forge file is self-contained
  - Card-maker doesn't need changes — game.json is added manually or via a future tool

  **Acceptance Criteria**:
  - Forge file with game.json auto-configures when loaded

---

- [x] 14. Build next game framework

  **What to do**:
  - Research another storytelling game system (The Quiet Year, Fiasco, Star Crossed)
  - Implement as a new framework following the DftQ pattern
  - Same philosophy: one card/prompt at a time, conversation-first
  - Register in frameworks/index.ts

  **Acceptance Criteria**:
  - New framework selectable in admin config, playable end-to-end

---

- [x] 15. Game library

  **What to do**:
  - Replace the current file dropdown with a browsable card grid
  - Each game shows: name (from forge project), card count, framework, thumbnail
  - Click to create room directly (if configured) or configure first
  - Search/filter by framework

  **Acceptance Criteria**:
  - Visual game picker replaces dropdown on home page

---

- [x] 16. Spectator mode

  **What to do**:
  - Join room as spectator (not in player rotation)
  - See the same card as active player
  - Cannot tap Next or X-Card
  - Shown in player bar with "(watching)" label

  **Acceptance Criteria**:
  - Spectator sees game without affecting turn order

---

- [x] 17. Share/export story log

  **What to do**:
  - On ended screen: "Copy story" button
  - Formats as plain text: game name, date, player names, each prompt + note
  - Clipboard copy or download as .txt

  **Acceptance Criteria**:
  - Copyable/downloadable story recap on ended screen

---

## Final Verification Wave

After all implementation:
- Full playthrough of DftQ on mobile and desktop
- Full playthrough of generic card draw
- Verify webhook auto-deploy works
- Verify prod and beta both work

---

## Success Criteria

### Verification Commands
```bash
curl -sL -o /dev/null -w "%{http_code}" https://beta.talekeeper.in/vtt   # 200
curl -sL -o /dev/null -w "%{http_code}" https://talekeeper.in/hack/vtt   # 200
```

### Final Checklist
- [ ] All code committed and pushed
- [ ] Webhook auto-deploys on push
- [ ] DftQ playable end-to-end on mobile and desktop
- [ ] At least one real playtest session completed
- [ ] Story log captures session narrative
- [ ] Rooms persist across container restarts
