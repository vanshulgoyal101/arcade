# Tiny Arcade — Developer Documentation

A small static "game hub" plus eleven self-contained browser games. Everything runs
client-side; there is no backend. Scores are saved in the browser's `localStorage`.

- **Hub:** `index.html` + `assets/style.css`
- **Games:** `hue-hunt/`, `echo/`, `chromatic/`, `flash/`, `flashmath/`, `sprint/`,
  `digit-span/`, `interval/`, `where/`, `word/`, `wordle/` — each a standalone
  **Vite + TypeScript** app. (`interval` is fully built and reachable but is not
  currently featured as a card on the hub, so the hub shows ten games.)

---

## 1. Repository layout

```
arcade/
├── index.html            # Arcade hub (landing page, links to each game's built output)
├── robots.txt            # SEO: allow crawling + point at the sitemap
├── sitemap.xml           # SEO: hub + every game, with preview images
├── package.json          # Root TEST project (Vitest) — not a game
├── vitest.config.ts      # Vitest config (jsdom env, tests/**)
├── tests/                # Unit tests for every game's pure logic
├── shared/               # Code shared across games (clipboard, WebAudio primitive)
├── assets/
│   ├── style.css         # Hub-only styles (cards, logo, layout)
│   └── og/               # 1200×630 social preview images (SVG) per game + hub
├── hue-hunt/             # Game 1 — reflex "spot the odd colour"
├── echo/                 # Game 2 — Simon-style memory game
├── chromatic/            # Game 3 — RGB colour-matching puzzle
└── flash/               # Game 4 — RSVP speed-reading trainer
```

Each game folder has an identical shape:

```
<game>/
├── index.html            # Vite entry HTML: <div id="app"></div> + <script src="/src/main.ts">
├── package.json          # scripts: dev / build / preview  (vite + typescript only)
├── tsconfig.json
├── vite.config.ts        # base: './'  → built assets use relative paths
├── dist/                 # build output (what the hub actually links to)
└── src/
    ├── main.ts           # UI wiring: DOM, events, rendering, modals (the "view")
    ├── game.ts           # Pure game logic / state machine (the "model")
    ├── storage.ts        # localStorage load/save + defaults
    ├── share.ts          # Builds shareable result text + clipboard copy
    ├── styles.css        # Game-specific styles
    └── audio.ts          # WebAudio SFX (hue-hunt, echo, chromatic)
```

> Per-game extras: **Flash** and **Sprint** and **Where** carry a `content.ts` (their
> passages / word list / country data) instead of a fixed board. **Flash** also has a
> `rsvp.ts` reader engine. Every game now has sound via `audio.ts` (or the shared
> `sfx.ts`) plus a mute toggle; RSVP flashing in Flash stays silent by design.

> Note: earlier versions kept Hue Hunt and Echo as plain HTML/JS under `games/` and
> `js/`. Those are gone — all eleven games are now Vite + TypeScript projects.

---

## 2. Shared conventions

All eleven games follow the same architecture and idioms:

- **Model/View split.** `game.ts` holds all rules and mutable state and has no DOM
  access. `main.ts` owns the DOM, listens for events, calls into the game, and
  re-renders. This keeps logic testable and the UI replaceable.
- **No framework.** UI is built by assigning `app.innerHTML` once, then querying
  element refs and updating them imperatively via small `render*()` functions.
- **Persistence.** `storage.ts` wraps `localStorage` with try/catch so the game still
  works if storage is unavailable (private mode, etc.). Each game uses its own key.
- **Sharing.** `share.ts` produces a spoiler-free, emoji result string and re-exports
  `copyToClipboard` from `shared/clipboard.ts` (async Clipboard API with a hidden
  `<textarea>` + `execCommand` fallback).
- **Audio.** Each game's `audio.ts` builds its semantic sounds (e.g. `correct`,
  `padTone`, `result`) on the shared `tone()` primitive in `shared/audio.ts`, which owns
  the lazily-created `AudioContext`, `setMuted`/`isMuted`, and resume-on-suspend logic.
  (Flash has no audio.)
- **Shared code.** `shared/` holds the small pieces that were identical across games —
  `clipboard.ts` and the WebAudio `tone()` primitive in `audio.ts`. Games import them via
  a relative path (`../../shared/...`); each Vite build bundles them independently.
- **Build.** Each game's Vite build input is `template.html` (the dev entry); `npm run
  build` type-checks then `vite build`s it to `dist/`. `scripts/clean-urls.mjs` then
  **promotes** the built document to `<game>/index.html` + `<game>/assets/` so it is served
  at the clean URL `/<game>/` (a small `<game>/dist/` redirect stub keeps any old
  `/<game>/dist/` link working). `vite.config.ts` sets `base: './'` so the hashed assets
  resolve relatively. From the repo root, `npm run build:games` builds + promotes all games.

### localStorage keys

| Game      | Key             | Stores                                             |
|-----------|-----------------|----------------------------------------------------|
| Hue Hunt  | `huehunt.v2`    | `bestScore`, `bestLevel`, `muted`                  |
| Echo      | `echo.v2`       | `best` (per-config map), `muted`                   |
| Chromatic | `chromatic.v2`  | daily record (streaks, today's accuracy) + `endlessBest` + `muted` |
| Flash     | `flash.v1`      | `wpm`, `bestWpm`, `passagesDone`, `wordsRead`, `bestStreak`, comprehension totals |
| Flashmath | `flashmath.v1`  | `bestScore`, `bestSolved`, `muted`                 |
| Sprint    | `sprint.v1`     | `best` (per-duration wpm map)                      |
| Digit Span| `digitspan.v1`  | `best` (per-mode span map), `muted`                |
| Interval  | `interval.v1`   | `bestScore`, `muted`                               |
| Where     | `where.v1`      | `bestScore`                                        |

### Mobile & touch support

The hub and all games are tuned to feel native on phones and tablets:

- **Viewport.** Every `index.html` uses
  `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
  Zoom is intentionally disabled so rapid tapping (Hue Hunt, Echo) never triggers an
  accidental pinch / double-tap zoom; `viewport-fit=cover` lets the layout extend under
  notches.
- **Web-app metas.** `theme-color` plus `mobile-web-app-capable` / `apple-mobile-web-app-*`
  tags give an app-like, full-screen launch when a game is added to the home screen.
- **Instant taps.** Interactive elements set `touch-action: manipulation` (removes the
  ~300 ms tap delay), `-webkit-tap-highlight-color: transparent` (no grey flash), and
  `user-select` / `-webkit-touch-callout: none` (no long-press selection or callout on
  pads, tiles, cards, and quiz options).
- **No scroll surprises.** `overscroll-behavior: none` disables pull-to-refresh, and
  `min-height: 100dvh` uses the dynamic viewport unit so layouts fill the screen as the
  mobile browser chrome shows/hides.
- **Keyboard focus.** A shared `:focus-visible` ring (2px accent outline) is drawn on
  links, buttons, inputs and `summary` elements for keyboard/switch users, while pointer
  taps stay ring-free — so external-keyboard and accessibility navigation is always visible.
- **Safe areas.** `#app` and the hub grid pad with `env(safe-area-inset-*)`, so nothing
  hides behind notches or the home indicator (including landscape).
- **Hover vs. touch.** Lift / highlight hover effects (hub cards, Flash diff-cards and
  quiz options) are wrapped in `@media (hover: hover)` with `:active` fallbacks, so they
  don't get "stuck" after a tap on touch devices.
- **Responsive sizing.** Boards, pads, swatches and the RSVP reader scale via
  `aspect-ratio` / `clamp()`; small-screen `@media (max-width: 380–420px)` blocks tighten
  padding and type. Gameplay input uses `pointerdown` (Hue Hunt, Echo), native range
  sliders (Chromatic), or large tap targets (Flash) — all touch-ready with no code changes.

> Because zoom is disabled for a game-like feel, drop `user-scalable=no` from the viewport
> tags if you need pinch-to-zoom for accessibility.

---

## 3. The hub (`index.html`)

A static landing page. Key points:

- `<body class="hub">` — hub styles live in `assets/style.css`.
- Ten `.card` links, one per featured game, each pointing at the game's clean URL `<game>/`.
- Each card sets an accent colour via `style="--accent:…"`.
- The SVG favicon is inlined as a data URI (🕹️).
- No JavaScript on the hub itself.

Because the hub links into `dist/`, **a game must be built before its card works.**

---

## 4. Game 1 — Hue Hunt (`hue-hunt/`) 🎯

**Genre:** reflex / arcade. Spot the single tile whose colour is slightly off, before
the timer runs out. Fast finds build a combo multiplier.

### Core logic — `src/game.ts`

- Colours are **HSL** (`{ h, s, l }`). `hslCss()` converts to a CSS string.
- **Difficulty curve:**
  - `gridSize(level)` grows the grid from 2×2 up to a max of 7×7
    (`2 + floor((level-1)/2)`, capped at 7).
  - `colorDelta(level)` shrinks the colour difference as levels climb
    (`max(50 - (level-1)*2.5, 5)`), making the odd tile subtler.
- `makeRound(level)` picks a random saturated `base` colour, then derives the `odd`
  colour by nudging hue and lightness by the current delta in a random direction, and
  places it at a random `oddIndex`.
- **Timing (a live countdown, not turn-based):**
  - `ROUND_TIME = 6000ms` is the timer cap.
  - Correct find: `+1500ms` (plus `+400ms` if fast). Wrong tap: `-1800ms`.
  - "Fast" = found within `FAST_MS = 1400ms`.
- **Scoring & combo (`correctPick`):**
  - Points = `(10 * level + speedBonus) * multiplier`, where `speedBonus` is 15 if fast.
  - `combo` increments on each correct find; `multiplier = min(5, 1 + floor(combo/3))`.
  - A wrong pick resets combo/multiplier to 1 and burns time (it does **not** end the run).
- **Game over** happens when `timeLeft` hits 0. `end()` records `bestScore` /
  `bestLevel` and returns whether a new best score was set.

### UI — `src/main.ts`

- Builds the grid of `.tile` buttons in `buildBoard()`; the odd tile gets the `odd`
  colour, the rest get `base`.
- Runs a `requestAnimationFrame` loop (`loop`) that subtracts elapsed time each frame,
  drives the timer bar via `transform: scaleX(pct)`, and ends the game at zero.
- "Juice": score pop-ups at the cursor, pill "bump" animations, a board flash, and a
  big `COMBO xN!` flash every third combo step once the multiplier ≥ 2.
- Mute button toggles SFX and persists `muted`.

### Audio — `src/audio.ts`

Generic `tone()` helper plus `correct()` (pitch rises with combo), `wrong()`,
`levelUp()`, `gameOver()`.

### Storage — `src/storage.ts`

`HueStore = { bestScore, bestLevel, muted }`, key `huehunt.v2`.

---

## 5. Game 2 — Echo (`echo/`) 🔊

**Genre:** memory (Simon clone). Watch a growing sequence of pad flashes, then repeat
it. It speeds up as it grows.

### Core logic — `src/game.ts`

- **Config options:** `strict` (bool) and `pads` (4 or 6). Best scores are tracked
  **per configuration** via `configKey(strict, pads)` → e.g. `"strict-4"`.
- **Lives:** Forgiving = 3 lives (a mistake replays the same sequence); Strict = 1 life
  (one mistake ends the run). Set in `reset()`.
- **Sequence:** `addStep()` appends a random pad index and resets `inputIndex`.
  `level` is simply `sequence.length`.
- **Speed ramp:** `stepDuration()` shrinks from 480ms down to a floor of 180ms as the
  sequence grows; `gapDuration()` shrinks from 180ms to 80ms.
- **`press(pad)` returns one of:**
  - `'ok'` — correct, more to go
  - `'complete'` — the full sequence was repeated (advance a level)
  - `'wrong-alive'` — mistake but lives remain (replay same sequence)
  - `'wrong-over'` — out of lives (game over)
- `recordBest()` stores the last fully-completed level for the current config and
  returns whether it improved.

### UI — `src/main.ts`

- `buildPads()` creates 4 or 6 coloured `.pad` buttons.
- `playSequence()` is async: locks input, lights each pad for `stepDuration()` with a
  gap, then unlocks for the player's turn.
- `lightPad()` adds the `lit` class, plays the pad tone, and emits particle `sparkle`s.
- `onPad()` handles player taps, branching on the `press()` result (advance, replay, or
  game over).
- Mode/pad toggles are disabled while a run is in progress (`playing`).
- Mute button persists `muted`.

### Audio — `src/audio.ts`

`PAD_FREQ` is a pentatonic-ish scale so any sequence sounds pleasant. `padTone()` plays
a fundamental + octave overtone; plus `error()`, `levelUp()`, `gameOver()`.

### Storage — `src/storage.ts`

`EchoStore = { best: Record<configKey, number>, muted }`, key `echo.v2`.

---

## 6. Game 3 — Chromatic (`chromatic/`) 🌈

**Genre:** colour-matching puzzle. Use R/G/B sliders to match a target colour. Two
modes: a daily seeded challenge (with streaks) and an Endless run.

### Core logic — `src/game.ts`

- **State:** `mode` (`daily`|`endless`), `difficulty` (`easy`|`normal`|`hard`),
  `target` and `guess` RGB, plus endless fields `level`, `lives`, `score`.
- **Difficulty** only sets the pass **threshold** (Easy 90 / Normal 94 / Hard 97). It
  applies to Endless; Daily always records the attempt regardless.
- **Daily mode:**
  - `startDaily()` derives the target deterministically from
    `targetFromSeed('chromatic-' + todayKey())` so everyone gets the same colour that
    day. You get **one shot**.
  - `commitDaily()` records today's best accuracy and updates the streak: the streak
    increments if yesterday was played, resets to 1 otherwise, and tracks `maxStreak`.
    `dailyAlreadyDone` guards replaying the same day.
- **Endless mode:**
  - `startEndless()` resets to level 1, 3 lives, score 0, random target.
  - `commitEndless()`: passing (`accuracy >= threshold`) adds
    `round(accuracy) + level*5` points and advances a level with a fresh target;
    missing costs a life. At 0 lives the run ends and `endlessBest` is updated.
- **`submit()`** computes accuracy, routes to the right commit method, and returns a
  `SubmitResult` used by the UI.

### Colour math — `src/color.ts`

- `RGB` type; `distance()` is Euclidean distance in RGB space.
- `accuracy(a, b)` = `100 - (distance / MAX_DISTANCE) * 100`, i.e. 100 = perfect.
- `toHex()`, `toCss()`, and `contrastText()` (picks black/white text for a background
  based on luminance).
- **Deterministic RNG** for the daily: `hashSeed()` (FNV-1a) → `mulberry32()` PRNG →
  `colourFromRng()` which biases away from dull greys. `targetFromSeed()` is seeded;
  `randomTarget()` uses `Math.random` for Endless.
- `todayKey()` / `yesterdayKey()` produce `YYYY-MM-DD` strings for daily/streak logic.

### UI — `src/main.ts`

- Renders tabs (Daily/Endless), difficulty buttons, a HUD, the target + "you" swatches,
  R/G/B sliders (with `aria-label`s), and Submit.
- `renderGuess()` updates the "you" swatch and hex label live as sliders move.
- **The target is always shown** — this is a match-the-colour game. There is
  intentionally **no live "closeness" meter**, since that would let you just drag until
  a bar fills (it was removed as it felt like cheating).
- Submitting opens a result modal: Daily shows accuracy ring + streak + reveal; Endless
  shows a game-over card. Both offer Share.
- Enter key also submits.
- **Audio** (`src/audio.ts`): soft slider ticks, a result chime whose pitch rises with
  accuracy, plus level-up / error / game-over cues for Endless. A mute button in the top
  bar persists `muted` to storage.

### Storage — `src/storage.ts`

`Store = { daily: DailyRecord, endlessBest }`, key `chromatic.v2`. Load merges saved
data over defaults so older/partial saves stay compatible.

### Share — `src/share.ts`

`dailyShareText()` renders a 5-block emoji bar for the accuracy; `endlessShareText()`
summarizes score/level/best.

---

## 7. Game 4 — Flash (`flash/`) ⚡

**Genre:** speed-reading trainer (RSVP — Rapid Serial Visual Presentation). Words flash
one at a time at a target words-per-minute, with the pivot letter highlighted so your
eyes never move. A short comprehension quiz follows, and the target speed **adapts** to
how well you understood — so it trains you to read faster over time.

### RSVP engine — `src/rsvp.ts`

- `tokenize(text)` splits on whitespace and, for each word, computes the **Optimal
  Recognition Point (ORP)** via `pivotIndex()` — a letter-count bucket (≤1→0, ≤5→1,
  ≤9→2, ≤13→3, else 4). Each `Token` stores `left` / `pivot` / `right` substrings so the
  pivot can be pinned to the centre column, plus a `delayFactor`.
- `delayFactor(word)` lengthens the dwell time for long words and adds a pause after
  punctuation (commas/`;:` ×1.5, sentence-enders `.!?` ×2.2), capped at 3×.
- `wordCount(text)` counts tokens (used for stats).
- `RsvpPlayer` steps through the tokens with `setTimeout`: per-word time is
  `60000 / wpm` × the token's `delayFactor`. It supports `start` / `pause` / `resume` /
  `stop`, exposes `current` / `total` / `isRunning`, calls a render callback per word,
  and fires `onDone` when finished.

### Adaptive logic — `src/game.ts`

- Target speed is clamped to `MIN_WPM 150 … MAX_WPM 900` (rounded to the nearest 5).
- `nextPassage()` picks a random passage, avoiding an immediate repeat.
- `finishRound(passage, answers)` grades the quiz and adapts the target speed:
  - comprehension ≥ 85% → **+25 wpm**; ≥ 60% → **+10**; ≥ 40% → **−15**; else **−30**.
  - `effectiveWpm = round(wpm × comprehension)` — rewards reading fast *and* understanding.
  - `streak` increments while comprehension ≥ 60%, otherwise resets.
  - `newBest` is set only when you pass **well** (≥ 85%) at a speed above the stored
    `bestWpm`, so best speed reflects speed you can actually comprehend at.
  - Persists running totals (`comprehensionSum` / `comprehensionCount`, `wordsRead`) for
    a lifetime comprehension average shown on the ready screen.

### Content — `src/content.ts`

Ten original passages: `Passage = { id, title, text, questions }`, each with a few
multiple-choice `Question`s (`{ q, options, answer }`). All text is written for this app
to avoid any copyright concerns.

### UI — `src/main.ts`

- Three panels swapped by `showPanel()`:
  - **ready** — three difficulty presets (Easy 200 / Medium 300 / Hard 450 wpm, the
    number shown small under each label) that set the starting speed via `setWpm`, plus
    "Start reading" and lifetime stats. The preset nearest the current target is
    highlighted; adaptation then moves the speed freely between/beyond presets.
  - **reader** — the focal frame with fixed centre guides, the three reader spans
    (`left` / `pivot` in red / `right`), a progress bar, and Pause / Stop.
  - **quiz** — one selectable answer per question; "See results" enables once every
    question is answered.
- `startReading()` runs a 3-2-1 countdown, then drives a `RsvpPlayer`; `renderToken()`
  fills the three spans and advances the progress bar.
- Submitting grades via `finishRound()` and opens a result modal: comprehension %,
  effective wpm, words read, streak, the speed change (▲ up / ▼ down), a new-best badge,
  and Share. "Next passage" starts another round at the adapted speed.

### Storage — `src/storage.ts`

`FlashStore = { wpm, bestWpm, passagesDone, wordsRead, bestStreak, comprehensionSum,
comprehensionCount }`, key `flash.v1`.

### Share — `src/share.ts`

`flashShareText()` renders the wpm, comprehension % with a 5-block bar, and the
effective / best wpm.

> Flash has **no** `audio.ts` — it's a focus-oriented game and stays silent.

---

## 8. Skill / knowledge games (Flashmath, Sprint, Digit Span, Interval, Where, Word, Wordle)

Seven more games in the same Model/View + Vite + TS shape, each built to *train a skill*
or *teach something* and keep a rising personal best. They share every convention in §2,
including the full mobile/touch layer (viewport + web-app metas, `touch-action`, safe-area
padding, hover-guarded effects), audio + a mute toggle, and — like the original four — a
complete SEO layer (title/description/canonical, Open Graph, Twitter card, JSON-LD, a
`<noscript>` fallback). All of them except `interval` also have a `sitemap.xml` `<loc>`
(see the note below). Their pure logic (`game.ts`) is
covered by unit tests in [`tests/`](tests) alongside the original games.

> `interval` is fully built, tested, SEO'd and reachable at `/interval/`, but is **not**
> featured as a card on the hub, so the hub presents ten of the eleven games. Because
> nothing links to it, it is deliberately **excluded from `sitemap.xml`** (via
> `interval/*` in `sitemap.config.json`) so it is not advertised to crawlers as an orphan
> page. To promote it to a full hub game later, add its card + JSON-LD `ItemList` entry to
> `index.html`, add it to the `GAMES` array in `assets/auth.js`, and drop the
> `interval/*` exclude from `sitemap.config.json`.

### 8.1 Flashmath (`flashmath/`) 🧮 — mental arithmetic

- Beat-the-clock: a live `ROUND_TIME` timer; a correct answer adds time (+ a fast bonus),
  a wrong one subtracts. `game.ts` `makeProblem(level)` scales a **tier** (0–4, every 3
  levels) from `+ −` within 10 up to `+ − × ÷` with larger operands; division is generated
  from a product so answers stay whole.
- Combo multiplier (`min(5, 1+floor(combo/3))`), on-screen keypad + physical number keys,
  `audio.ts` cues. Best score/solved in `flashmath.v1`.

### 8.2 Sprint (`sprint/`) ⌨️ — typing speed

- A 15/30/60-second test. `content.ts` is a common-word list; `game.ts` streams words and
  grades each keystroke into `correctChars`/`incorrectChars` for **wpm** (`chars/5 / min`)
  and accuracy. Mistyped letters are weighted to **resurface** in upcoming words.
- Timer starts on the first keystroke; live wpm/accuracy; best wpm per duration in `sprint.v1`.

### 8.3 Digit Span (`digit-span/`) 🔢 — working memory

- Digits flash one at a time (`flashDuration()` eases as the span grows), then you key them
  back and submit with ✓ / Enter (no auto-submit, so the last digit is correctable). A tone
  plays per digit with a mute toggle. **Forward** or **Reverse** mode (`expected()` reverses).
  One miss ends the run; best span per mode in `digitspan.v1`.

### 8.4 Interval (`interval/`) 🎹 — ear training

- `audio.ts` synthesises two notes (root + interval, ascending) from MIDI numbers. Identify
  the interval from eight options (`INTERVALS`, m2…octave). 3 lives, score + streak; missed
  intervals are weighted to resurface. Best score in `interval.v1`.

### 8.5 Where (`where/`) 🗺️ — geography

- `content.ts` holds ~80 countries (`name`, `capital`, ISO `code`); `flagEmoji()` derives
  the flag from the code. **Flags** or **Capitals** mode; pick from four options. 3 lives,
  score + streak; missed countries resurface. Best score in `where.v1`.

### 8.6 Word of the Day (`word/`) 📖 — vocabulary

- `content.ts` is a curated list of `Word` records (`word`, `say`, `pos`, `definition`,
  `examples`, `synonyms`, `origin`). `game.ts` derives a stable **daily word** from the date
  via a seeded RNG (`hashSeed` FNV-1a → `mulberry32`), so everyone sees the same word each
  day and it never reshuffles on reload (`dailyWord`, `dailyOptions`).
- Two tabs. **Today** shows the daily word, asks you to guess its meaning from four options
  (`meaningOptions` — the real definition plus three distractors), then reveals the full
  card (definition, examples, synonyms, origin) and keeps a **daily streak** (`todayKey` /
  `yesterdayKey`). **Practice** is an endless meaning-quiz (`PracticeGame`): +10 points and a
  growing streak per correct answer, a life lost per miss (3 lives), missed words resurface,
  and each answer reveals the full definition before you tap *Next word*.
- Persisted in `word.v1` (`daily` streak state, `practiceBest`, `learned`). Logic covered by
  [`tests/word-game.test.ts`](tests/word-game.test.ts).

### 8.7 Wordle (`wordle/`) 🟩 — word puzzle

- An unlimited version of the classic five-letter guessing game (`WORD_LENGTH = 5`,
  `MAX_GUESSES = 6`) — no once-a-day wait. `words.ts` supplies the answer list, guess
  validation (`isValidGuess`), and `randomAnswer()`.
- `game.ts` is pure and DOM-free. `evaluateGuess()` matches the **official duplicate-letter
  rules**: a first pass marks exact-position `correct` tiles and consumes those letters from a
  count pool, then a second pass marks `present` only while an unconsumed copy remains — so
  surplus copies correctly show `absent`. `mergeKeyState()` updates the on-screen keyboard
  without ever downgrading a key (correct > present > absent).
- `storage.ts` tracks lifetime stats in `wordle.v1` (`played`, `wins`, `currentStreak`,
  `maxStreak`, a 7-slot guess `distribution`), shown in the 📊 stats panel. `best` surfaces
  `maxStreak`. Logic covered by [`tests/wordle-game.test.ts`](tests/wordle-game.test.ts).

---

## 9. Building & running

### Develop a single game (hot reload)

```bash
cd arcade/<game>          # hue-hunt | echo | chromatic | flash | flashmath | sprint | digit-span | interval | where | word | wordle
npm install
npm run dev               # Vite dev server; open http://localhost:5173/template.html
```

> The dev entry is `template.html` — `index.html` is the generated, promoted production page.

### Build + promote for the hub

```bash
# one game:
cd arcade/<game> && npm run build                 # → <game>/dist/template.html + dist/assets
cd arcade && node scripts/clean-urls.mjs <game>   # promote → <game>/index.html + <game>/assets

# all games at once, from the repo root:
cd arcade && npm run build:games
```

`clean-urls.mjs` promotes each built game to its clean served path `<game>/` and writes a
`noindex` redirect stub at `<game>/dist/` for any already-indexed legacy link.

### Serve the whole arcade

Built games use ES modules and relative asset paths, so they must be served over
**http**, not opened via `file://`:

```bash
cd arcade
python3 -m http.server 8000
# open http://localhost:8000/   (hub)  →  /hue-hunt/, /echo/, …
```

---

## 10. Tests

A root-level **Vitest** project (`arcade/package.json`, `vitest.config.ts`) covers the games
in two layers, both under a `jsdom` environment: a **logic layer** that imports each game's
source TS modules directly (the model/helper layer), and a **DOM/interaction layer** that
boots each game's real `main.ts` and drives it through the rendered UI — the same path a
player's browser takes. Together they total **195 tests across 30 files**.

```bash
cd arcade
npm install        # installs vitest + jsdom (root only; separate from each game)
npm test           # vitest run  — one-shot
npm run test:watch # watch mode
```

### Logic layer

Coverage lives in `arcade/tests/*.test.ts` — **153 tests** over each game's pure model plus
the shared modules:

| File | What it locks down |
|------|--------------------|
| `chromatic-color.test.ts` | `distance`/`accuracy`, `toHex`/`toCss`, `contrastText`, deterministic `targetFromSeed`, date keys |
| `chromatic-game.test.ts` | perfect-guess = 100%, endless pass/fail/lives, difficulty thresholds ramp with level |
| `hue-hunt-game.test.ts` | `gridSize`/`colorDelta` curves, odd-tile in range, combo/multiplier, best-score recording |
| `echo-game.test.ts` | `press()` result states, strict vs forgiving lives, speed ramp, per-config best |
| `flashmath-game.test.ts` | operand ranges grow with level, clean division, combo/multiplier, no trivial products late |
| `sprint-game.test.ts` | char-accurate scoring, weak-letter tracking (sorted) + reset on a new run, per-duration best |
| `digit-span-game.test.ts` | forward/reverse recall, span growth, best per mode |
| `interval-game.test.ts` | scoring/streak, lives-to-zero ends the run, strict new-best rule |
| `where-game.test.ts` | no-repeat deck, easy→hard spill, per-difficulty best, `flagEmoji` |
| `word-game.test.ts` | date keys, deterministic daily word, meaning/daily options, practice scoring, streak rules |
| `wordle-game.test.ts` | duplicate-letter evaluation, key-state merge, win/lose/short/invalid, dictionary hygiene |
| `flash-rsvp.test.ts` | `tokenize` reassembly, whitespace handling, punctuation dwell |
| `flash-game.test.ts` | wpm clamping, comprehension-driven speed adaptation, `effectiveWpm`, new-best rule |
| `share.test.ts` | share-text formatting + the shared `copyToClipboard` (API path + graceful fallback) |
| `shared.test.ts` | `rankText`/`rankBadgeHtml` medals + percentile + sign-in nudge, `codedAvatarSvg` whitelist |
| `shared-card.test.ts` | `withAlpha` hex→rgba (3/6-digit, no-hash), `roundRect` corner arcs + radius clamp |
| `shared-sfx.test.ts` | mute persistence (`loadMuted`/`saveMuted`, per-game keys), runtime mute flag |
| `storage.test.ts` | `loadStore` migrations/sanitising: where `bestScore`→Hard, word `learnedIds` guard, wordle distribution pad/trim/coerce, flash/echo defaults |
| `shared-format.test.ts` | `fmtScore` compact numbers (29000→29k, 999999→1M, exact-under-1000, NaN/Infinity) |

### DOM / interaction layer

Each `tests/<game>-dom.test.ts` (**42 tests**, one file per game) mounts the game's real
`main.ts` into a `#app` element and interacts through the DOM — clicking tiles/options,
pressing keys, typing words — asserting on what the player sees. This catches the class of
regressions the logic tests can't: input handlers, guards and wiring that live in `main.ts`
(e.g. the hue-hunt stale-board guard, the Word daily-streak flow, difficulty locks). It runs
headless because the games self-render (`app.innerHTML = …`) and need no real browser.

The shared harness `tests/helpers/dom.ts` makes this clean and deterministic:

- **`mountGame(importer, seed?)`** — resets the DOM + `localStorage` (optionally seeding it),
  freezes `requestAnimationFrame` (so timer loops don't self-advance), installs a
  jsdom-parseable `CSS.escape`, resets the module registry and imports the game fresh.
- **`gameEnv()`** — installs fake `setTimeout` timers per test (a game's transition
  callbacks — next round, reveal, game-over — only fire when a test advances them, never
  leaking onto a torn-down DOM) and resets the DOM after each test.
- Helpers: `pointerdown`/`click` (games bind `pointerdown` on play surfaces, `click` on
  buttons/toggles), `oddChild`/`plainChild` (find the odd tile by its unique background),
  `text`. Games that reach the cloud (`shared/cloud`) are `vi.mock`ed; WebAudio no-ops in
  jsdom on its own. Non-deterministic answers are handled by importing the game's own pure
  logic (e.g. `dailyOptions()`) or by reading the DOM (e.g. solving flashmath's shown sum,
  typing sprint's current word, using a known-valid Wordle guess).

> Run `npm test` after changing any game logic **or** its `main.ts`; run `npm run test:watch`
> while iterating. The first test in each DOM file is slower (Vite transforms the game module
> + CSS on first import); the rest are fast.

---

## 11. SEO & discoverability

Every page (the hub + every game) ships a full metadata layer aimed at ranking and
rich social previews. For games it lives in the **source** `template.html`, which is built
and promoted to the clean served page `<game>/index.html` (URL `/<game>/`).

Per page:

- **Primary meta** — keyword-rich `<title>`, `<meta name="description">` (~155 chars),
  `keywords`, `author`, `<link rel="canonical">`, and
  `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`.
- **Open Graph** — `og:type/site_name/title/description/url/locale` + `og:image`
  (1200×630) with width/height/alt for link unfurls on Facebook, LinkedIn, Slack, etc.
- **Twitter/X** — `summary_large_image` card with title/description/image/alt.
- **Structured data (JSON-LD)** — games use `VideoGame` (Flash uses
  `WebApplication`/`EducationalApplication`) with genre, platform, `isAccessibleForFree`,
  a `$0` `Offer`, and publisher. The hub uses a `@graph` of `WebSite` + `Organization` +
  an `ItemList` of the featured games. No fake `aggregateRating` is included (Google
  penalizes invented review data).
- **No-JS fallback** — each game's `#app` holds a `<noscript>` block with an `<h1>`,
  description and "how to play" list so non-rendering crawlers and scrapers still get
  real, indexable content.

Site-wide:

- **`robots.txt`** — allows all crawlers, `Disallow: /stats/` (the private owner-only
  analytics dashboard, also `noindex`), and points at the sitemap.
- **`sitemap.xml`** — auto-generated by `scripts/gen-sitemap.mjs` from
  `sitemap.config.json` (a GitHub Action regenerates it on every push). Lists the hub +
  every game with `lastmod`, `changefreq`, `priority`, and an `image:image` per URL. The
  private `/stats/` page is excluded.
- **Preview images** — branded 1200×630 **PNG** cards in `assets/og/` (one per game +
  hub), generated by `scripts/generate-og.mjs` (`npm run generate:og`).

### ⚠️ Before you deploy

1. **Domain.** All canonical/OG/sitemap URLs use the production domain
   `https://games.vanshul.com` (set in `sitemap.config.json` and each `index.html`). If
   you fork this for another domain, find-and-replace it everywhere.
2. **Clean URLs.** Games are served at `/<game>/` (not `/<game>/dist/`). The build
   promotes each `dist/` build up to `<game>/` and leaves a `noindex` redirect stub at
   `/<game>/dist/`, so any previously-indexed URL consolidates to the clean canonical.

---

## 12. Gotchas

- **Build + promote.** After `vite build`, run `scripts/clean-urls.mjs` (or `npm run
  build:games`) so `<game>/index.html` + `<game>/assets/` are refreshed; the hub links to
  `/<game>/`, which 404s if a game was never promoted.
- **http, not file://.** Built output uses ES modules; opening a game via `file://`
  will fail to load the module.
- **Per-config bests in Echo.** Changing Strict/Forgiving or 4/6 pads switches to a
  different best-score bucket — expected, not a bug.
- **Word's daily word is once per day.** Word of the Day seeds the featured word (and its
  meaning quiz) from the date, so it's the same all day and only changes at midnight; use
  the **Practice** tab to keep playing. Wordle, by contrast, is unlimited.
- **Audio needs a gesture.** Browsers suspend `AudioContext` until a user interaction;
  the first tap resumes it (handled in `audio.ts` / `shared/audio.ts`). The RSVP word
  flashing in Flash stays silent by design.
- **Flash timers in background tabs.** The reader uses `setTimeout`; browsers throttle
  timers in hidden/backgrounded tabs, so keep the Flash tab focused while reading.

---

## 13. Theme system (refined vs. classic)

The whole arcade shares one theme, chosen on the hub and remembered across every game.

- **Two palettes.** `:root` defines the **refined** tokens (the default) — neutral
  backgrounds (`--bg`, `--bg-soft`, …), text/muted colours, borders, `--glow`, `--shadow`,
  and a refined `--accent` per game. `:root[data-theme="classic"]` overrides them with the
  original, punchier colours. Secondary tokens (good/warn/bad and the RGB channel colours)
  are identical in both themes.
- **Per-game accents.** Each game sets its own `--accent`; on the hub, cards carry a
  `data-game="<slug>"` attribute and `assets/style.css` maps that to the accent (plus a
  `[data-theme="classic"]` override), so no inline styles are needed.
- **Persistence.** The choice lives in `localStorage` under `arcade.theme` (`'classic'` or
  else refined) and is shared arcade-wide.
- **No flash of the wrong theme.** A tiny inline `<script>` in every `index.html` `<head>`
  (right after `<meta charset>`) sets `data-theme` **before paint**. The same script keeps
  the `theme-color` meta in sync with `--bg` (`#0c0d12` refined / `#12141c` classic) so the
  mobile status bar matches; `color-scheme: dark` prevents a white iOS overscroll band.
- **Toggle.** Only the hub shows the toggle (`#themeBtn`, `.theme-btn`); games inherit the
  stored choice through the head script. Switching persists and re-applies live.

---

## 14. Offline support & caching (service worker)

GitHub Pages serves HTML with `Cache-Control: max-age=600`, which could otherwise show a
ten-minute-stale page after a deploy. A root service worker fixes that and adds basic
offline support.

- **`sw.js`** lives at the arcade root and is served at `/sw.js` with **scope `/`**, so one
  worker covers the hub and every game.
- **Strategy.** Documents (HTML) are **network-first** (`fetch` with `cache: 'no-store'`,
  falling back to the cache only when offline), so a refresh always gets the freshest page
  when online. Content-hashed build assets (JS/CSS under `dist/assets/…`) are **cache-first**
  since their names change on every build.
- **Lifecycle.** `CACHE = 'arcade-v1'`; `activate` deletes any other caches; `skipWaiting()`
  + `clients.claim()` apply a new worker immediately.
- **Registration.** A one-line inline `<script>` in every source `index.html` registers
  `/sw.js` with `{ updateViaCache: 'none' }` (so the worker file itself is never cached).
  Rebuild a game after editing its `index.html` so the `dist` copy carries the registration.
- **Killing a bad worker.** Ship a `sw.js` that calls `self.registration.unregister()` and
  `caches.delete(...)` for all caches, then let clients reload.

---

## 15. Sharing (native share sheet + image cards)

Every game's Share button opens the Web Share sheet with a **generated PNG** of the run,
not just text, and degrades gracefully everywhere.

- **`shared/share.ts`** — `shareResult({ title, text, url, blob, filename })` tries, in
  order: `navigator.share({ files })` → `navigator.share({ text, url })` → clipboard image
  write → `copyToClipboard(text)`. It returns a `ShareOutcome` and `shareToast(outcome)`
  maps that to a user-facing message.
- **`shared/card.ts`** — `renderShareCard({ title, emoji, stat, statLabel, tagline, slug,
  draw })` paints a 1080×1080 canvas. It reads the live theme via `getComputedStyle`
  (`--accent`, `--bg`, `--text`, …) so the card matches refined/classic, lays out a header,
  a central panel drawn by the game's own `draw(ctx, rect)` callback, a big stat, and a
  `games.vanshul.com/<slug>` footer. Helpers: `roundRect`, `withAlpha`, `currentAccent`,
  `wrapText`, `canvasToBlob`. Emoji **do** render on a real Canvas2D (unlike the sharp OG
  pipeline).
- **Per game.** Each `share.ts` exposes a small `xShareCard(...)` that draws that game's
  visual (Hue Hunt's grid with the ringed odd tile, Chromatic's target-vs-guess swatches,
  Wordle's coloured tile grid, Where's flag + country, …); `main.ts` builds the card →
  `canvasToBlob` → `shareResult` → `showToast`.

---

## 16. Cloud sync, sign-in & the leaderboard

Sign-in, cross-device score sync and the public leaderboard are **hub-only** and entirely
optional — every game works fully offline with `localStorage` alone. Because all games share
one origin, signing in once on the hub covers every game.

### Frontend — `assets/auth.js` (plain ES module, no build)

- Loads `@supabase/supabase-js@2` from esm.sh **at runtime** and degrades gracefully
  (offline / CDN blocked → the account + leaderboard UI simply removes itself; games are
  unaffected). Only the **publishable** Supabase key is shipped — Row-Level Security guards
  the data; the secret `SUPABASE_TOKEN` lives only in the untracked `arcade/.env`.
- **`GAMES` registry** — maps each slug to its `localStorage` key, display `unit`, and a
  `best(store)` reader. Every metric is “higher is better”. `localStorage` is the source of
  truth on-device; the cloud is a mirror for restore + the leaderboard.
- **Sync (`onUser`)** — on sign-in it `restoreScores()` then `uploadScores()`. `restoreScores`
  copies a cloud blob down when the cloud score is strictly better **or the device has no
  local data for that game yet** (fresh device / cleared cache), and overwrites everything on
  an account switch. `uploadScores` backs up every game that has real progress — not only when
  the headline `best > 0`, but also via an optional per-game `extra(store)` predicate (Word
  uses it for a daily streak / learned words), so nothing that lives only in the blob is lost.
- **Sign-out keeps local data** — signing out only ends the Supabase session; it does **not**
  wipe `localStorage` (that would destroy progress not yet mirrored to the cloud). An
  `arcade.sync.owner` key records which account owns the local scores, so if a *different*
  account signs in on the same browser, `onUser` detects the switch and clears/replaces the
  scores then — that (not sign-out) is what isolates a shared browser.
- **Leaderboard** — one `supabase.rpc('arcade_leaderboard', { p_games, p_limit })` call
  returns everything (per-game top N + the caller's own best/rank), replacing ~20 REST
  round trips. All user text is escaped (`esc`), avatar URLs are gated to `http(s)`, and
  coded SVG avatars come from a hard-coded whitelist — no XSS sink. Only rows with
  `best > 0` are ranked, so the `best = 0` cross-device backup rows never show or inflate a
  field size (`getRank` in `shared/cloud.ts` filters its total count the same way).
- **Profiles** — an editable display name + avatar (emoji, a coded `a:<id>` SVG, or the
  Google photo) + synced colour theme, via a profile modal.
- **Cache-busting** — `auth.js` and `assets/style.css` are non-hashed, so bump their
  `?v=` in `index.html` on every edit (the service worker caches them cache-first).

### Backend — `supabase/arcade_scores.sql` (source of truth, idempotent)

Run this in the Supabase SQL editor after any change; it only touches `arcade_`-prefixed
objects. Summary:

- **`arcade_scores`** `(user_id, game, best, data jsonb, display_name, avatar_url,
  updated_at)`, PK `(user_id, game)`, index `(game, best desc)`. RLS: public `SELECT`
  (powers the leaderboard); a user may only insert/update **their own** rows.
- **Blob privacy** — `data` is a player's whole `localStorage`, so a table-wide `SELECT`
  grant would let anyone dump every blob. The table grant is **revoked** and `SELECT`
  re-granted only on the safe columns (`user_id, game, best, display_name, avatar_url,
  updated_at`). A player restores their own blob through the SECURITY DEFINER
  **`restore_my_scores()`** RPC.
- **`arcade_leaderboard(p_games, p_limit)`** — STABLE SECURITY DEFINER; returns jsonb keyed
  by slug: `{ top: […], my_best, my_rank }` (rank via `row_number()`). Definer-level, but
  only ever returns safe columns, and only ranks rows with `best > 0`.
- **`arcade_profiles`** `(user_id, display_name, avatar, theme, updated_at)` with the same
  public-read / owner-write RLS.
- **Server-side caps (defence in depth on every write path)** — `arcade_score_cap(game)`
  (immutable) defines per-game maxima (echo/digit-span 200, flash/sprint 500, wordle 100k,
  else 10M). `submit_score()` (SECURITY DEFINER) clamps and keeps `greatest(old, new)`. A
  **`arcade_scores_guard`** BEFORE INSERT/UPDATE trigger clamps `best`, nulls a `data` blob
  over 64 KB, and bounds identity field lengths — so even a direct RLS-permitted upsert with
  a forged `best` is capped. On UPDATE it also keeps `best` **monotonic**
  (`greatest(new.best, old.best)`), so no write path can ever lower a personal best — a
  cross-device backup row synced at `best = 0` cannot clobber a higher cloud score.
  `arcade_profiles_guard` mirrors the identity-bounding for profiles.
- **Blob backup on the game side** — most games only call `submitScore` at game-over with a
  positive best. Word also calls `submitScore('word', practiceBest, { backup: true })` when
  the daily is completed: the `backup` flag lets `submitScore` sync the blob even at `best = 0`
  (routed through `submit_score`, which keeps the max best and updates `data`), so a daily-only
  player's streak reaches the cloud without waiting for the next hub visit.

### One-time dashboard setup

1. Run `supabase/arcade_scores.sql` (and `supabase/analytics.sql`, §18) in the SQL editor.
2. Create a Google OAuth Web client; set the redirect to
   `https://<project>.supabase.co/auth/v1/callback`; paste the client id/secret into
   Supabase → Auth → Providers → Google.
3. Supabase → Auth → URL config: Site URL `https://games.vanshul.com`, redirect
   `https://games.vanshul.com/**` (+ `http://localhost:8000/**` for local).

---

## 17. Personal-best badges & number formatting

- **`paintCardBests()`** (in `auth.js`) paints each hub card's bottom row (beside the
  category tag) with a `🏆 <best> <unit>` chip read from local scores. It runs **before** the
  Supabase import (so it shows instantly and even offline) and again after cloud sync. The
  chip is text-only (XSS-safe), accent-coloured, and simply absent when you haven't played.
- **`shared/format.ts` — `fmtScore(n)`** is the single source of truth for compact numbers:
  values under 1000 are shown exactly; larger ones use `Intl` compact notation with SI
  casing (`29000 → 29k`, `256000 → 256k`, `1e6 → 1M`). It is used by the in-game HUD and
  game-over modals of the point-score games (hue-hunt, flashmath, chromatic, interval,
  where, word) and mirrored in `auth.js` (the hub is a no-build module and can't import the
  TS). Games whose headline metric is bounded under 1000 (echo level, digit-span span,
  sprint/flash wpm) render exactly and don't need it.

---

## 18. Anonymous analytics & the owner dashboard

Privacy-respecting counts of visits + plays — no PII, just a kind, a game slug, a timestamp
and an anonymous per-device id.

- **Beacon — `assets/analytics.js`** (plain IIFE, no SDK, loaded on every page): stores an
  anonymous `arcade.vid` uuid, logs one `visit` per browser session and a `play` per game
  page, via a raw `fetch` POST to `/rest/v1/arcade_events` with the publishable key. The
  page slug is derived from `location.pathname` (`/<game>/` → slug, else `hub`).
- **Backend — `supabase/analytics.sql`**: `arcade_events (ts, kind, game, visitor,
  user_id)` with a bounds CHECK. RLS allows anonymous **inserts** of `visit`/`play` only,
  and has **no SELECT policy** — the raw log is private. `arcade_stats(p_days)` is an
  **owner-gated** SECURITY DEFINER RPC returning totals / per-game / by-hour aggregates
  scoped to a rolling window (`p_days` = 1 / 7 / 30, or `null` = all time) plus the
  always-absolute “today” cards and 30-day trend (times in Asia/Kolkata).
- **Dashboard — `/stats/`**: a static, `noindex` page (also `Disallow`ed in `robots.txt`
  and excluded from the sitemap) where the signed-in owner sees the aggregates, with a
  **24h / 7d / 30d / All** time-range filter. Nobody else can read them.

---

## 19. Related sites

Tiny Arcade is one of a small family of sites under `vanshul.com`, cross-linked from the
hub footer:

- **[vanshul.com](https://vanshul.com)** — the portfolio + blog (React SPA, its own repo).
- **[blog.vanshul.com](https://blog.vanshul.com)** — redirect to the portfolio's blog section.
- **[links.vanshul.com](https://links.vanshul.com)** — a single-page linktree.
