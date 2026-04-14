# Decisions — vtt-roadmap

## Server-side state over Supabase DB
- Eliminates version conflicts, simpler, lower latency
- Trade-off: rooms are ephemeral (lost on restart)
- Persistence planned for Wave 3 (Task 12)

## DftQ radically simplified
- Per PM review: one card at a time, anyone can advance
- No rigid turns, anonymous X-Card, no deck count/previous card/rules toggle
- Design philosophy: "A shared screen that shows one prompt at a time"

## Framework registry uses globalThis
- Survives module re-evaluation in production builds

## Docker build uses wider context
- context: ./github (for forge sibling directory dependency)
