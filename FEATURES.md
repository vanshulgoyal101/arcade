# Features — Tiny Arcade

> **TL;DR** — The capability catalog for the arcade: ✅ shipped, 🔜 proposed, ⛔
> non-goal. 10 instantly-playable browser games + a shared platform (PWA, SEO,
> optional Supabase accounts/leaderboards). Deep docs: [DOCUMENTATION.md](DOCUMENTATION.md).

**Legend:** ✅ shipped · 🔜 proposed/potential · ⛔ deliberate non-goal.

## Games (✅ shipped)

| Game | Trains |
|------|--------|
| Hue Hunt | reflex + colour perception |
| Echo | Simon-style sequence memory (strict/forgiving) |
| Chromatic | RGB colour matching |
| Flash | RSVP speed-reading + comprehension quiz |
| Flashmath | mental-arithmetic beat-the-clock |
| Sprint | typing speed & accuracy (15/30/60s) |
| Digit Span | working-memory recall (forward & reverse) |
| Where | geography — flags & capitals (~200 countries) |
| Word of the Day | vocabulary builder + practice quiz |
| Wordle | unlimited 5-letter puzzles |

- ✅ **Interval** (ear-training) — fully built, currently **not featured** on the hub.

## Per-game features (✅)

- Sound + mute toggle, light/dark themes, **shareable result cards** (generated
  1080×1080 images), mobile-first, keyboard support.
- Scores in `localStorage`; **optional cloud leaderboard** via Google sign-in.

## Platform (✅)

- **Zero backend to play** — each game is a self-contained static Vite/TS app.
- **Clean architecture** — pure logic (`game.ts`) split from DOM/UI (`main.ts`),
  no framework, fully unit-tested (Vitest + jsdom).
- **PWA** — service worker (network-first docs, cache-first hashed assets).
- **SEO** — per-game OpenGraph / Twitter / JSON-LD (`VideoGame`) + share images.
- **Optional Supabase** — accounts, profiles, per-game leaderboards, and
  first-party analytics (visits/plays), all **RLS-locked**.
- **Hosting** — GitHub Pages at games.vanshul.com; clean URLs.

## Proposed / potential 🔜

- Feature **Interval** on the hub (already built).
- More games; per-game difficulty/settings depth; richer stats dashboard.

## Non-goals ⛔

- **UI framework** — hand-written DOM by design (small, fast, dependency-free).
- **Mandatory accounts / backend** — games must always play offline, anonymously.
