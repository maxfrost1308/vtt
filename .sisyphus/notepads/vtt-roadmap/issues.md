# Issues — vtt-roadmap

## Session Started: 2026-04-14
- No issues recorded yet. Appended as discovered.

## [2026-04-14] Task 8: Generic framework "last card skipped" issue
In generic-card-draw index.ts, the 'next' reducer marks game as 'ended' when `newIndex >= deck.length - 1`.
This means when moving to the LAST card, genericPhase becomes 'ended' immediately, and the board
shows the debrief screen — the last card is never displayed to players.

Fix (if needed for playtesting): Either:
A) Show current card in the 'ended' board phase (like DftQ shows the End card)
B) Change condition to `newIndex >= s.deck.length` — but this requires a separate trigger

This is minor since DftQ is the primary framework for playtesting.
