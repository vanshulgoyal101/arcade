# Tiny Arcade: Architecture and Operations

This guide describes the repository as of September 23, 2026. There are twelve
playable applications and ten featured hub games. Word of the Day and Interval
remain available at their own URLs, but are excluded from the featured grid,
public hub leaderboard, and sitemap. Hidden does not mean private or disabled.

See [FEATURES.md](FEATURES.md) for the capability catalog and proposed work,
[SECURITY.md](SECURITY.md) for trust boundaries and database operations, and
[README.md](README.md) for the short introduction.

## 1. Architecture

The site is served from the root of the `main` branch on GitHub Pages at
https://games.vanshul.com. Gameplay executes in the browser without an account.
Optional Supabase services provide Google sign-in, progress backup, profiles,
public scores, and private analytics. This is not a backend-free system, although
the game models do not require a backend to run.

| Layer | Source | Responsibility |
| --- | --- | --- |
| Hub | [index.html](index.html), [assets/auth.js](assets/auth.js) | Featured games, random selection, personal bests, accounts, profile editing, leaderboard |
| Game page | Each game's `template.html` | Build entry, static metadata, crawlable About content, theme initialization |
| Game model | Each game's `src/game.ts` | Rules, scoring, round transitions, result state |
| Game UI | Each game's `src/main.ts` | Input, rendering, timer lifetime, audio, persistence and cloud calls |
| Storage boundary | [shared/stored.ts](shared/stored.ts), each `src/storage.ts` | Runtime validation and legacy-store defaults |
| Cloud client | [shared/cloud.ts](shared/cloud.ts) | Session lifecycle, queued scores, restore reconciliation, rank lookup |
| Shared presentation | [shared/card.ts](shared/card.ts), [shared/share.ts](shared/share.ts), [shared/overlay.ts](shared/overlay.ts) | Canvas result cards, sharing fallbacks, dismiss/replay behavior |
| Identity art | [assets/games.js](assets/games.js), [shared/icons.ts](shared/icons.ts) | No-build and TypeScript display registries, checked for parity |
| Analytics | [assets/analytics.js](assets/analytics.js), [stats/index.html](stats/index.html) | Pseudonymous page-load events and owner-only reports |
| Database | [supabase/arcade_scores.sql](supabase/arcade_scores.sql), [supabase/analytics.sql](supabase/analytics.sql) | Grants, RLS, validation triggers, RPCs |
| Offline cache | [sw.js](sw.js) | Same-origin document and asset caching |

There is deliberately no UI framework. Models and browser integration are tested
separately. Some models persist progress through their storage helper, so "pure
logic" does not imply every class method is free of side effects.

## 2. Install and Develop

Use Node.js 22.12 or newer. CI uses Node 22. The root tooling and each game have
independent lockfiles; installing only the root does not install the game builds.

```sh
npm ci
for game in 2048 chromatic digit-span echo flash flashmath hue-hunt interval sprint where word wordle; do
  (cd "$game" && npm ci) || exit 1
done
npx playwright install chromium
```

For one game's development server:

```sh
cd hue-hunt
npm run dev
```

Open the URL printed by Vite with `/template.html` appended. The root-relative
hub links and shared unbundled assets are intended for the complete static site;
use a root server to test the full navigation and account experience.

```sh
npm run build:games
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. The modules and service worker require HTTP or HTTPS,
not direct file opening. A local OAuth test also requires the local origin to be
allowed in Supabase redirect settings. Routine unit, SQL, and mocked browser
tests need no production credentials.

## 3. Source and Build Output

Edit a game's `template.html` and `src/`, not its generated `index.html` or hashed
`assets/`. Vite compiles into `dist/template.html` and `dist/assets/`.
[scripts/clean-urls.mjs](scripts/clean-urls.mjs) promotes that output to the served
game directory, then replaces `dist/` with a legacy noindex redirect stub.

```sh
npm run build:games
```

This builds all twelve apps and promotes them. For a single app:

```sh
cd 2048
npm run build
cd ..
node scripts/clean-urls.mjs 2048
```

Promotion requires a fresh build; it is not a substitute for compilation.
Its preflight checks every requested input before replacing served assets.
Shared TypeScript changes require rebuilding all importing games, normally all
twelve. Commit source and promoted output together so Pages serves the tested
implementation. Keep legacy redirects, but do not link or canonicalize to them.

The plain hub assets use explicit query versions. When changing one, update its
importers and the digest in [tests/asset-version.test.ts](tests/asset-version.test.ts).
Versioning selects the new asset immediately; the worker also revalidates mutable
assets in the background. Hashed game bundles need no manual version number.

## 4. Game and Score Contracts

All public score headlines are higher-is-better. The headline is not necessarily
the complete saved progress or every statistic shown in a result modal.

| Game | Rules and modes | Saved score contract |
| --- | --- | --- |
| 2048 | Four-by-four sliding merges; continue after reaching 2048 if legal moves remain | `2048.v1`: `best`, `bestTile`; best saved during successful moves |
| Hue Hunt | Find the different color; timed rounds, increasing grid size and combo scoring | `huehunt.v2`: `bestScore` |
| Echo | Repeat pad sequences; strict/forgiving and four/six-pad configurations | `echo.v2`: maximum of the per-configuration `best` map |
| Chromatic | RGB slider matching, endless rounds, difficulty-dependent thresholds and points | `chromatic.v2`: `endlessBest` |
| Flash | RSVP reading followed by comprehension questions; adaptive reading speed | `flash.v1`: `bestWpm`; game maximum 900 WPM |
| Flashmath | Timed arithmetic; operand size grows with level; combo multiplier | `flashmath.v1`: `bestScore` |
| Sprint | 15/30/60-second typing sessions, accuracy and trouble-key feedback | `sprint.v1`: maximum of the duration-keyed `best` map |
| Digit Span | Forward or reverse recall of growing digit sequences | `digitspan.v1`: maximum of the configuration-keyed `best` map |
| Where | Flags/capitals, easy/hard pools; hard scoring multiplier | `where.v1`: maximum of `bestEasy` and `bestHard` |
| Wordle | Unlimited five-letter puzzles, six guesses, duplicate-letter evaluation, statistics | `wordle.v1`: `maxStreak` |
| Word of the Day (hidden) | Date-selected vocabulary quiz and practice; daily streak and distinct learned words | `word.v1`: `practiceBest`; daily progress can back up with zero headline |
| Interval (hidden) | Identify a musical interval between two notes; three lives and missed-interval practice | `interval.v1`: `bestScore` |

Store loaders validate actual JSON types, not just TypeScript annotations.
Malformed JSON, non-object roots, invalid counters, unsupported configuration
keys, and prototype-related map keys must not corrupt a run. Numeric defaults
are finite and non-negative. Local validation is resilience, not anti-cheat.

Restart must reset input locks, timers, animation-frame loops, and run-specific
history. Delayed work must belong to the run or view that scheduled it. In 2048,
acknowledging a blocked winning board leads to normal game over, not a frozen
"playing" state. Escape and the continuation button share that decision.

### 2048 Progressive Spawning (September 18, 2026)

Arcade uses a progressive variant rather than classic 2048's permanent 2/4
distribution. The pure `spawnOptions(board)` policy uses a base of
`max(2, largestTile / 128)`. It selects the base 60% of the time and twice the
base 40% of the time. Thus 512 unlocks 4/8, 2048 unlocks 16/32, and 8192 unlocks
64/128. New values remain six or seven merge levels below the largest tile.

Before sampling that distribution, the policy counts tiles below the base. An
odd count means a value lacks a partner; it supplies the smallest such value
with certainty. Paired small values receive no extra spawns until a merge leaves
another unpaired value. This preserves a route for clearing low-value leftovers
without deleting, upgrading, or awarding points for them. It does not guarantee
that the player can bring partners together on a crowded board.

Empty-cell placement remains uniform, and only a successful move spawns a tile.
The policy reads the post-merge board, so a new tier applies immediately. There
is no persisted tier, no dependence on historical bests, and no hidden losing-
streak adjustment. Restart returns to 2/4. Merge rules and scoring are unchanged.
Deterministic tier, probability, recovery, restart, and seeded-run invariant
tests live alongside the existing model/DOM regressions. The seven-level gap is
a tunable design choice, not a claim of empirically optimal difficulty.

The play area accepts swipes across the viewport, including the empty space on
both sides and the remaining screen below the board. The header and About section remain outside the gesture area for
normal controls and scrolling. Pointer capture keeps an edge gesture active;
cancellation ends it, and each gesture triggers at most one move. Pinch zoom
remains available within the swipe area.

Existing local/cloud records remain intact. The casual leaderboard now spans
classic-spawn and progressive-spawn runs, which are not strictly comparable;
there is no separate ranked season or historical ruleset attribution. Server
score caps are unchanged. Do not silently erase records to hide that difference.

## 5. Accounts, Restore, and Sync

The hub's registry and the game cloud registry cover all twelve applications,
including hidden games. Parity tests compare storage keys and score fields.
Do not remove a hidden game from account cleanup or it can leak progress between
accounts on the same browser.

The principal local keys beyond game stores are `arcade.sync.owner`,
`arcade.pending.v1`, `arcade.theme`, and the Supabase SDK session key. Some sound
preferences are separate per-game mute keys. The owner marker is a consistency
mechanism, not an authentication credential.

The hub restores before uploading. A failed restore does not clear the previous
owner's local data or advance ownership. First sign-in can claim guest progress;
switching accounts must not submit the previous account's saved results.
In-game auth listeners invalidate stale asynchronous work and route a different
account to the hub. Sign-out reloads the game without deleting local progress;
same-user token refresh does not reload. Identity changes can interrupt a run.

Signed-in submissions queue synchronously before awaiting SDK initialization.
The queue keeps the highest headline and reads current saved progress on retry.
Acknowledgements must not remove a higher queued score or newer equal-score
progress. Game load and online events retry pending work. Guests do not enqueue
leaderboard submissions simply by playing.

The database stores a monotonic `best` and a separately updated object `data`.
Restore can heal scalar headline fields from `best`; it must not invent an
unknown configuration record for map-based games. This is not a general merge
of concurrent histories. Two devices can still overwrite or retain divergent
streak/map details even while the public best is preserved.

Profile saves check server errors before committing local identity/UI changes.
Public score rows contain the chosen display name and avatar, while the profile
row and full game blob have private read boundaries. Remote avatar hosts can
receive ordinary image requests; do not treat an arbitrary image URL as private.

## 6. Database Operations

Read [SECURITY.md](SECURITY.md) before changing grants or schemas. Fresh isolated
databases load the scores schema before analytics, which uses the game allowlist.
Production changes use reviewed targeted migrations, not the whole historical
bootstrap. The bootstrap contains legacy cleanup statements.

```sh
node scripts/db-test.mjs
node scripts/db-migrate.mjs --check
```

These commands use local PGlite and need no token. Tests exercise PostgreSQL
roles, `auth.uid()`, grants, RLS, direct writes, RPC writes, caps, privacy, and
repeat migration application. They do not write fake rows to the live database.

[scripts/db-audit.mjs](scripts/db-audit.mjs) is a read-only live consistency audit.
It needs the locally configured management credential. Never put that credential
in browser code, logs, git, issue reports, or chat. The client publishable key is
intentionally public and relies on database enforcement.

The September 16 targeted migration was applied with score/profile/event row
counts unchanged at 68/17/1537. Anonymous restore, submit, and stats execution
were denied after application; public leaderboard access remained available.
These are rollout observations, not current counts or proof of every endpoint.

## 7. Analytics and Privacy

The beacon records `visit` once per tab session and `play` on each recognized
game page load. A play is not a completed run. `arcade.vid` is a persistent
pseudonymous visitor identifier; unique-visitor totals are approximate.

[privacy/index.html](privacy/index.html) discloses the data model and provides a
local analytics preference. `arcade.analytics.disabled` disables future beacons
and removes the local visitor ID. Do Not Track and Global Privacy Control also
disable collection. Unavailable preference storage fails closed. Unknown routes
and the privacy page do not emit page events. Turning collection off does not
delete historical rows or recall requests already sent.

Database guards validate event/game combinations, generate IDs, assign server
time, and discard caller-provided account IDs on new events. They do not prevent
automated spam. Trusted ingestion rate limiting, automatic retention, and
self-service account/data deletion are not implemented.

The owner dashboard at `/stats/` uses a server-enforced owner check. It supports
24-hour, seven-day, thirty-day, and all-time aggregate windows. Today totals and
the thirty-day trend are separate from the selected aggregate range. Date bins
use Asia/Kolkata; stale account/range responses must not replace current UI.
`noindex` and robots exclusions are crawl controls, not authorization.

## 8. Offline, Audio, Sharing, and Accessibility

The worker handles same-origin GET requests only. Documents use network-first
with HTTP-cache bypass. Server failures can fall back to a cached good document;
404s are returned without caching. Cache-storage failures do not discard a
successful network response. Hashed bundles are cache-first; other assets are
stale-while-revalidate with an explicit event lifetime. Activation removes only
obsolete `arcade-` caches, not another application's cache namespace.

The manifest supports an installable hub. Offline availability is opportunistic:
previously fetched pages/assets can work, but there is no complete pre-cache of
all games. Optional CDN auth, external flags/avatars, and cloud writes need a
network. Browser cache eviction can remove offline content. Worker updates can
reload an existing controlled page; test update behavior when changing it.

Web Audio starts after user interaction, with per-game mute controls. Clipboard
and Web Share permissions differ by browser. Sharing prefers supported native
flows, retries text if image sharing is rejected, and has clipboard fallbacks.
Cancellation must not launch unwanted follow-up actions. Capture result state
before asynchronous canvas encoding or external image loading so replay cannot
change the shared result.

Viewport zoom is enabled on the hub and all game source pages. Keyboard focus
rings, accessible icon labels, touch input, and mobile layout have automated
checks. This is not a claim of WCAG certification or complete screen-reader
coverage. Color and audio tasks have inherent modality requirements; accessible
alternative modes remain a product/design question.

## 9. Search and Discovery

Search rankings cannot be guaranteed, and no site can rank first for every
query. Optimize relevant intent and a reliable playable experience, not keyword
stuffing, fabricated reviews, or invisible schema-only content.

Each game has a canonical clean URL, descriptive title/description, Open Graph
and Twitter previews, application structured data, breadcrumbs, and static
About content outside the JavaScript-rendered `#app`. Flash and Word use suitable
application types rather than forcing every trainer into `VideoGame`. Unsupported
FAQ markup was removed; any future FAQ schema must match visible questions and
answers. Structured-data validity does not guarantee a search rich result.

| Page intent | Relevant content direction |
| --- | --- |
| Hub | Tiny Arcade and free browser games; accurate ten-game featured catalog |
| 2048 / Wordle | Playable puzzle, literal rules, honest strategy, clear replay behavior |
| Hue Hunt / Chromatic | Color discrimination versus RGB matching, not interchangeable descriptions |
| Echo / Digit Span | Sequence-memory versus forward/reverse digit recall |
| Flash / Sprint / Flashmath | Reading comprehension, typing measurement, or arithmetic practice respectively |
| Where / Interval / Word | Actual geography, musical interval, or vocabulary exercises |

Do not describe these games as clinically validated cognitive treatments or
promise improved intelligence. Avoid copying competing sites' guides. Existing
internal links should connect genuinely related games; do not generate masses
of near-duplicate landing pages for search terms.

[scripts/gen-sitemap.mjs](scripts/gen-sitemap.mjs) parses HTML with JSDOM, respects
same-origin canonicals and noindex, skips excluded/dependency/symlink paths,
deduplicates canonical URLs, escapes XML, and obtains git dates without shell
interpolation. [sitemap.config.json](sitemap.config.json) keeps Word, Interval,
stats, and build artifacts out of the submitted catalog.

```sh
node scripts/gen-sitemap.mjs
npx vitest run tests/seo.test.ts tests/sitemap.test.ts
```

With the present catalog the expected sitemap is twelve URLs: hub, ten featured
games, and privacy. Hidden games can still be discovered through links; exclusion
from a sitemap is not an indexing prohibition. The sitemap workflow regenerates
on changes and can advance `main` with a bot commit.

After publishing, verify live canonical URLs, assets, status codes, robots, and
the sitemap. Use the owner's Search Console to inspect indexing, submit the
sitemap, and compare relevant impressions, clicks, queries, and device trends.
Search Console access, submission, ranking changes, and field Core Web Vitals
were not verified by the local test suite. Measure LCP, INP, and CLS on real
devices before claiming a performance improvement; browser screenshots are not
performance measurements. Prioritize observed bottlenecks over speculative
preloads or adding libraries purely for an SEO score.

### Input Rendering

Sprint updates only the active word's characters while typing or deleting. Its
40-word history and up to 18 upcoming word nodes remain mounted until submission
or reset; scroll centering is retained. Sprint's WPM, accuracy, and countdown,
and Flashmath's countdown, update text only when the displayed value changes.
Timer-bar animation still runs every frame. Rules and gameplay delays are unchanged.

The browser runner measures 200 deterministic character inputs after 40 completed
words. On September 19, a local Chromium desktop run reduced full-stream
replacements from 200 to zero and median synchronous input-handler time from
2.2 ms to 0.7 ms (95th percentile: 2.6 ms to 1.0 ms). These are controlled local
measurements, not field INP or a claim about every device. Timing is reported,
not used as a flaky pass/fail threshold. Stable nodes, scrolling, and replay are
checked at desktop and mobile viewport widths; DOM tests also check that
unchanged HUD values cause no text mutations between countdown boundaries.

## 10. Tests and Release Gates

```sh
npm test
node scripts/db-migrate.mjs --check
npm run build:games
npm run test:browser
npm audit --audit-level=low
git diff --check
```

Also run `npm audit --audit-level=low` inside every game package. The root audit
does not cover twelve separate dependency trees or the runtime CDN SDK. Install
Chromium with `npx playwright install --with-deps chromium` on Linux CI.

| Layer | What it checks | What it does not establish |
| --- | --- | --- |
| Model tests | Scoring, generation, boundaries, restart and terminal state | Real device rendering or cheating resistance |
| jsdom integration | Actual UI modules, input locks, delayed callbacks, restore/share races | Native audio, real canvas rendering, browser permission sheets |
| SQL/PGlite | Actual schemas, RLS/grants/triggers/RPC behavior and migration parity | Every hosted Supabase/PostgREST/Auth behavior |
| Registry and asset tests | Game sets, headline fields, icons, versions, generated-entry contracts | Arbitrary future registry semantics |
| SEO/sitemap tests | Metadata, visible schema correspondence, canonical/exclusion/XML safety | Search-engine ranking or guaranteed rich results |
| Worker tests | Error handling, cache failures, cleanup ownership, refresh lifetime | Every browser update/eviction scenario |
| Chromium smoke | Twelve games at 1280/390px, loaded images, nonblank pixels, overflow, About content, 2048 input, privacy persistence and offline revisit | Full Safari/Firefox coverage, real OAuth, every game to completion |

[scripts/browser-test.mjs](scripts/browser-test.mjs) owns an ephemeral loopback
server and closes it and Chromium on completion. Its main game checks intercept
cloud requests to avoid production writes. `ARCADE_SCREENSHOTS=/tmp/arcade-shots`
saves screenshots for visual inspection. The service-worker check revisits a
previously cached 2048 page offline.

[.github/workflows/verify.yml](.github/workflows/verify.yml) installs and audits
the independent packages, runs unit/SQL/browser checks, and verifies generated
assets match a clean rebuild. Pages publishes the committed root separately;
this verification workflow is not itself a deployment hold. A direct push can
be published before verification finishes. Run gates locally before pushing and
use required PR checks if the repository adopts protected-branch releases.

## 11. Safe Release Procedure

1. Inspect working tree and staged paths. Preserve unrelated concurrent work.
2. Add the smallest behavior regression and confirm the failure before fixing it.
3. Run the focused test, then all affected build and integration gates.
4. Rebuild/promote games; regenerate sitemap after new served pages exist.
5. Review source, generated output, and documentation together. Never stage secrets.
6. Fetch remote changes. The sitemap bot may have advanced `main`; integrate cleanly.
7. Stage explicit owned paths, verify the complete index, then commit and push.
8. Watch the exact revision's verification and Pages runs; inspect live assets.
9. For SQL, separately review/apply the targeted migration and verify live grants.

A git revert of static code does not undo a database migration. Use a reviewed
forward migration for database recovery. Do not silently reinstate public data
access to make an older client work. A failed or timed-out management request
requires inspecting the live schema before deciding whether to retry.

## 12. Adding or Featuring a Game

Keep the current model/UI/storage/share split and test harness. Register the slug
in the hub account registry, game cloud keys/headlines, display/icon registry,
analytics route allowlist, SQL game allowlist/caps, build and promotion lists,
browser runner, and tests. Add appropriate art and generated OG assets. Update
hub markup and ItemList only when the game should be featured.

Choose a score cap from actual reachable rules; a low cap silently truncates
legitimate scores. Preserve own-row access, private blobs, and hidden-game account
cleanup. Generate and review a targeted SQL migration for server registry changes.
For an existing hidden game, retain its storage key and progress; featuring it
does not require deleting data. Update sitemap exclusions and the feature catalog.

## 13. Audit Scope and Remaining Work

The September 16 work reviewed high-risk shared auth/sync/share/cache boundaries,
database grants and write paths, persisted-data validation, game DOM sinks and
lifecycle regressions, dependency manifests, build promotion, sitemap generation,
metadata, and analytics collection. All twelve games are covered by the release
build and browser smoke matrix. This is a bounded engineering audit, not a claim
that every line, platform, dependency, or possible vulnerability is proven safe.

Confirmed issues addressed include unknown score identifiers, public profile
reads, overly broad RPC execution grants, unbounded leaderboard requests,
client-controlled analytics fields, vulnerable build dependencies, shell-based
sitemap filename execution, invalid sitemap scanning, disabled zoom, unsupported
FAQ markup, account-transition races, share snapshots, terminal 2048 continuation,
and worker cache error handling. Each area has focused automated regression
coverage; live database checks supplement the isolated tests.

The prioritized unimplemented backlog is in [FEATURES.md](FEATURES.md).
Important remaining limits include client-forgeable scores, anonymous analytics
spam, no retention automation, concurrent multi-device history conflicts, runtime
CDN dependence, incomplete response security headers, and untested physical
native share/OAuth flows. Do not describe these as fixed merely because the
build, audit command, or smoke suite is green.