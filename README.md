# 🕹️ Tiny Arcade

**10 tiny, instantly-playable browser games for your brain and reflexes.**
No installs, no accounts, no backend — just open a page and play.

### ▶️ Play now: **[games.vanshul.com](https://games.vanshul.com)**

[![Live](https://img.shields.io/badge/play-games.vanshul.com-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://games.vanshul.com)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![No Framework](https://img.shields.io/badge/UI-no%20framework-14161d?style=for-the-badge)

---

## 🎮 The games

| Game | What it trains |
|------|----------------|
| 🎨 **Hue Hunt** | Spot the odd colour before the timer runs out — reflex + perception |
| 🔊 **Echo** | Simon-style sequence memory (strict & forgiving modes) |
| 🌈 **Chromatic** | Match a target colour with RGB sliders |
| ⚡ **Flash** | RSVP speed-reading trainer with comprehension quizzes |
| 🧮 **Flashmath** | Mental-arithmetic beat-the-clock |
| ⌨️ **Sprint** | Typing speed & accuracy (15 / 30 / 60s) |
| 🔢 **Digit Span** | Working-memory digit recall (forward & reverse) |
| 🗺️ **Where** | Geography — flags & capitals of ~200 countries |
| 📖 **Word of the Day** | Vocabulary builder with a daily word + practice quiz |
| 🟩 **Wordle** | Unlimited 5-letter word puzzles |

> Also included: **Interval** (ear-training) — fully built, but not currently featured on the hub.

> Also included: **Interval** (ear-training) — fully built, but not currently featured on the hub.

Every game has sound, a mute toggle, light/dark themes, shareable result cards,
an optional cloud leaderboard (Google sign-in), and works great on mobile.

---

## ✨ Highlights

- **Zero backend to play.** Each game is a self-contained static site; scores live in `localStorage`.
- **Clean architecture.** Every game splits **pure logic** (`game.ts`) from **DOM/UI** (`main.ts`) — no framework, fully unit-tested.
- **PWA-grade.** Service worker (network-first docs, cache-first hashed assets) keeps it fast and update-safe.
- **SEO + share cards.** Per-game Open Graph / Twitter / JSON-LD metadata and generated 1080×1080 share images.
- **Optional cloud.** Supabase-backed accounts, profiles, and per-game leaderboards with row-level security.

---

## 🧱 Tech stack

- **TypeScript + Vite** per game (no UI framework — hand-written DOM rendering)
- **Vitest + jsdom** for logic tests
- **Supabase** (Postgres + Auth + RLS) for optional accounts, leaderboards & analytics
- **GitHub Pages** for hosting

## 🗂️ Project layout

```
arcade/
├── index.html          # Hub / landing page (links to each game's build)
├── assets/             # Hub styles, art, auth, analytics, OG images
├── shared/             # Code shared across games (audio, share, clipboard…)
├── tests/              # Vitest unit tests for every game's logic
├── supabase/           # SQL: scores, profiles, analytics (RLS)
└── <game>/             # One folder per game (Vite + TS app → dist/)
    └── src/{main,game,storage,share}.ts
```

## 🚀 Run locally

```bash
# Play a single game with hot reload
cd hue-hunt && npm install && npm run dev

# Build a game to static files
npm run build            # → dist/

# Run the whole hub over http (games are ES modules, need a server)
cd .. && python3 -m http.server 8000   # then open http://localhost:8000

# Run the test suite (from the repo root)
npm install && npm test
```

> **Full developer docs:** see [DOCUMENTATION.md](DOCUMENTATION.md) for architecture,
> conventions, the theme system, mobile support, and per-game internals.

---

## 📄 License

Personal project by [Vanshul Goyal](https://vanshul.com). Feel free to explore the code.
