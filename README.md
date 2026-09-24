# 🕹️ Tiny Arcade

**10 tiny, instantly-playable browser games for your brain and reflexes.**
No installs or account required. Optional sign-in syncs progress and leaderboard scores.

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
| 🟩 **Wordle** | Unlimited 5-letter word puzzles |
| 🗺️ **Where** | Geography — flags & capitals of ~200 countries |
| 🔢 **2048** | Slide and merge tiles to reach 2048 — then keep going |
| 🔊 **Echo** | Simon-style sequence memory (strict & forgiving modes) |
| 🌈 **Chromatic** | Match a target colour with RGB sliders |
| ⚡ **Flash** | RSVP speed-reading trainer with comprehension quizzes |
| ⌨️ **Sprint** | Typing speed & accuracy (15 / 30 / 60s) |
| 🔢 **Digit Span** | Working-memory digit recall (forward & reverse) |
| 🧮 **Flashmath** | Mental-arithmetic beat-the-clock |

Word of the Day and Interval remain playable at their own URLs but are not featured on the hub.

Every game has sound, a mute toggle, refined/classic palettes, shareable result cards,
an optional cloud leaderboard (Google sign-in), and works great on mobile.

---

## ✨ Highlights

- **Zero backend to play.** Each game is a self-contained static site; scores live in `localStorage`.
- **Testable architecture.** Game rules are separated from DOM/UI, with model, interaction, database, and browser regression tests.
- **Find a game.** Local name/category search, clear and empty states, and Random selection from matching games.
- **Offline revisits.** Visited content can be cached; worker updates do not force an active game to reload.
- **SEO + share cards.** Per-game Open Graph / Twitter / JSON-LD metadata and generated 1080×1080 share images.
- **Optional cloud.** Supabase-backed accounts, profiles, and per-game leaderboards with row-level security.

---

## 🧱 Tech stack

- **TypeScript + Vite** per game (no UI framework — hand-written DOM rendering)
- **Vitest + jsdom + PGlite + Playwright** for model, DOM, SQL, and browser tests
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
# Install root test tools
npm ci

# Play a single game with hot reload; open /template.html
cd hue-hunt && npm ci && npm run dev

# After stopping Vite, build and promote that game
npm run build
cd .. && node scripts/clean-urls.mjs hue-hunt

# Serve the committed site and run tests from the repository root
python3 -m http.server 8000 --bind 127.0.0.1
# In another terminal:
npm test
```

Use Node.js 22.12 or newer. Each of the twelve game packages has its own lockfile;
the full installation, build, browser checks, and release procedure are in the
developer guide. Edit game templates and sources, not promoted build output.

> **Full developer docs:** see [DOCUMENTATION.md](DOCUMENTATION.md) for architecture,
> conventions, the theme system, mobile support, and per-game internals.

See [FEATURES.md](FEATURES.md) for implemented versus proposed capabilities and
[SECURITY.md](SECURITY.md) for data access, safe migrations, and known limits.
The feature catalog also documents search privacy, worker lifecycle, SEO
measurement, and their regression/release checks.
The [privacy page](privacy/index.html) includes analytics opt-out. Client-reported
scores are not anti-cheat verified; search rankings are not guaranteed.

---

## 📄 License

Personal project by [Vanshul Goyal](https://vanshul.com). Feel free to explore the code.
