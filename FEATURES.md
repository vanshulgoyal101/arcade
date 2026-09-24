# Tiny Arcade Feature Catalog

Status: September 24, 2026. "Implemented" describes repository behavior, not a
guarantee about every browser or future deployment. See
[DOCUMENTATION.md](DOCUMENTATION.md) for architecture, commands, and contracts.

## Implemented Games

| Game | Experience | Discovery |
| --- | --- | --- |
| Hue Hunt | Timed odd-color selection, increasing grids, combo scoring | Featured |
| Wordle | Unlimited five-letter puzzles, six guesses, streak/statistics view | Featured |
| Where | Flag/capital geography quiz, easy/hard pools | Featured |
| 2048 | Sliding tiles, progressive spawns with small-tile partner recovery, merge score, best tile, legal continuation after a win | Featured |
| Echo | Pad-sequence memory, strict/forgiving modes, four/six pads | Featured |
| Chromatic | RGB matching, endless rounds, difficulty and accuracy feedback | Featured |
| Flash | RSVP reading, comprehension questions, adaptive WPM | Featured |
| Sprint | 15/30/60-second typing, WPM, accuracy, trouble keys | Featured |
| Digit Span | Forward/reverse digit recall with growing sequence lengths | Featured |
| Flashmath | Timed arithmetic, growing operand ranges, combo multiplier | Featured |
| Word of the Day | Daily vocabulary quiz, learned-word tracking, practice | Direct URL; hidden from hub |
| Interval | Two-note musical interval recognition and missed-interval practice | Direct URL; hidden from hub |

All twelve retain local progress and optional cloud integration. Hidden games
remain in build, storage, account cleanup, and database registries. The featured
hub, its ItemList, and its public leaderboard contain ten games.

## Implemented Platform

- Immediate guest play, mobile layouts, keyboard/touch controls, sound and mute.
- Refined/classic color palettes with shared persisted theme preference. These
  are not a light/dark theme pair.
- Generated 1080-by-1080 result cards, native sharing where supported, and
  clipboard fallbacks. Result snapshots survive a replay during image encoding.
- Restart, result dismissal/replay controls, answer feedback, and personal bests.
- Local catalog search by name, description, or category; Random selects from
  current matches. Best-score badges refresh on return navigation.
- Optional Google sign-in, editable profile/avatars, cloud backup and restoration.
- Persistent retry queue, monotonic headline scores, competition-style tied ranks,
  bounded public leaderboard queries, and private saved-data/profile reads.
- Installable hub manifest and opportunistic offline caching of visited content.
  This is not a guaranteed first-visit offline download of all games.
- Owner-only analytics dashboard with time-range filters, game counts, hourly
  activity, and a thirty-day trend. Counts represent page loads, not completed runs.
- Privacy page with persistent analytics opt-out; Do Not Track and Global Privacy
  Control respected before creating identifiers or sending future events.
- Clean canonical URLs, social previews, static game descriptions, application
  structured data, breadcrumbs, and a canonical-aware sitemap generator.
- Zoom-enabled viewports, focus-ring and asset-parity regression checks.
- Model/DOM tests, isolated PostgreSQL security tests, Chromium mobile/desktop
  smoke tests, service-worker tests, dependency audits, and a release CI workflow.

## Historical Changes

The September 24 discovery release adds local catalog search, source-to-published
SEO parity checks, a crawlable PNG favicon, and a CollectionPage linked to the
ten-game ItemList. All game descriptions are distinct and concise; game schemas
include WebApplication with GameApplication or EducationalApplication categories.
Stats remains noindex but is crawlable so crawlers can read that directive.
Shared worker registration replaces thirteen inline copies and never deliberately
reloads an active game. The read-only database audit now checks JSON number types
before casting map values, preventing malformed strings from aborting a scan.

The deeper September 24 follow-up fixed overlapping cloud writes and late
restores that could replace newer progress. Game pages coordinate restores and
uploads per game. Interrupted account migrations are quarantined until a hub
restore succeeds, rather than treating partial stores as a completed migration.
Word now applies restored daily completion and Practice bests to its live UI and
model. In-game sign-in reports retryable errors through a local event listener
instead of a global inline handler. Cross-device history merging remains future
work.

The September 24 follow-up tightened cloud and avatar registry membership,
rejected nonfinite score inputs, and escaped rank labels with numeric runtime
validation. In-game OAuth redirects no longer carry query strings or fragments.
Offline caching excludes sensitive callback requests and explicitly private
traffic; the cache-version reset requires online revisits before offline reuse.

The September 23 audit completed compact point-score labels in Flashmath and
Interval, fixed delayed share-caption races in seven games, distinguished
cancelled sharing from success, and cleaned up failed clipboard fallback nodes.
Flashmath no longer clears a rapidly corrected answer with an old feedback timer.
Hub theme writes are tied to the account that initiated them; partial profiles
retain their theme, authentication errors remain retryable, and a failed score
identity refresh does not misreport a saved profile as failed. The private stats
page clears the prior dashboard immediately on an account transition. Database
table grants now follow explicit least privilege in addition to RLS.

These changes address specific reproduced defects, not a claim that all future
states or devices are covered. The proposed work below requires separate product
or infrastructure decisions and is not represented as already implemented.

Chromatic's former daily mode and unused shared daily-leaderboard groundwork
were removed; they are not current features. Word replaced Interval in the
featured catalog, then 2048 replaced Word. Neither hidden game was deleted.
Legacy `/game/dist/` URLs now redirect to `/game/`. Historical claims that all
profile rows were public, database tests required production writes, zoom was
disabled intentionally, or the entire site had no backend no longer describe
the current implementation. Git history is the detailed historical record.

## Discovery and Update Contracts

### Fixed Game Order

The featured order is Hue Hunt, Wordle, Where, 2048, Echo, Chromatic, Flash,
Sprint, Digit Span, Flashmath. It was chosen from the September 24, 2026 recorded
page-load counts (253, 169, 117, 31, 68, 59, 57, 41, 40, 39 respectively), with
2048 explicitly placed immediately after Where. These are historical counts,
not live counters, completed rounds, or a strictly descending popularity rank.

[assets/games.js](assets/games.js) owns the frozen `GAME_ORDER` list. Leaderboard
game sections and stats use it; static hub cards and JSON-LD positions are checked
against it by [tests/registry-parity.test.ts](tests/registry-parity.test.ts).
Search filters the existing cards without changing their relative order. Player
rankings within each game's leaderboard remain score-based.

Stats lists the featured games first, then the hidden Word and Interval games.
It shows zero when a game has no plays in the selected period; changing counts,
auto-refreshing analytics, or choosing a date range never changes row order.
Hidden games remain excluded from the hub and its leaderboard. There is no
popularity RPC, scheduled reorder, polling-based catalog update, or mid-game
navigation. Future ordering changes require an explicit code change and release.

### Catalog Search

[assets/catalog.js](assets/catalog.js) progressively enhances the static hub.
It indexes card headings, descriptions, and category tags once, excluding personal
best badges and profile data. Whitespace and hyphens split search terms; all terms
must match, ignoring case. British `colour` and American `color` are equivalent.
This is a small substring filter, not fuzzy search or a remote search service.

The form has a visible label, an 80-character input limit, and a polite result
count. No matches hides the cards and disables Random. Clear restores every card
and returns focus to the input. Enter does not navigate or submit a query. Random
chooses uniformly among matching cards. Returning through browser history reruns
the filter for any browser-restored input value. The ten links remain in the
initial HTML; without JavaScript the search form stays hidden and navigation works.

Search text is not written to storage, URLs, analytics, or network requests by
the catalog module. Browser-managed form history is outside this guarantee.
There are no generated search-result pages, SearchAction claims, new database
tables, or changes to the featured-game registry. Adding a card automatically
adds its visible text to the search index; update ItemList and sitemap policy
when changing which games are featured.

### Worker Registration

[assets/register-sw.js](assets/register-sw.js) is loaded once by the hub and each
of the twelve game templates. This supersedes older documentation describing
automatic page reloads on worker installation. Registration uses
`updateViaCache: 'none'`; checks occur on load, online/visibility events, and a
60-second interval. Hidden or offline pages skip checks, concurrent requests are
coalesced, and rejected registration/update attempts permit a later retry.

Installation never calls page reload. Open games keep their in-memory state;
updated application HTML and bundles take effect on normal navigation or reload.
The worker still activates with `skipWaiting` and claims clients, so changes to
its request handling must remain compatible with already-open older game code.
There is no guaranteed offline first visit, complete pre-cache, or immediate UI
upgrade. Cache eviction and external SDK/image availability remain browser/network
constraints. Privacy exclusions and cache ownership are described in
[SECURITY.md](SECURITY.md).

### Search Engine Policy

The hub graph links CollectionPage to an unordered ten-entry ItemList, matching
the visible catalog. Its favicon and organization logo use existing same-origin
square PNG files. Each game has its own concise description and canonical URL;
the 180-character test limit is an editorial convention, not a search-engine
snippet limit. Game schema describes the actual free web application without
invented ratings, reviews, or invisible FAQs. No structured markup guarantees a
rich result.

Stats and the error page remain noindex. Robots allows stats crawling because a
Disallow would prevent compliant crawlers from reading its noindex directive.
This does not expose owner-only analytics: database authorization remains the
security boundary. Word and Interval are still playable and potentially indexable
through related links, but intentionally absent from the submitted sitemap and
featured grid. Filtering does not alter canonical URLs or schema.

After deployment, inspect the hub and representative game URLs in the owner's
Search Console, check selected canonicals and rendered content, and submit
`https://games.vanshul.com/sitemap.xml`. Review page-indexing exclusions and the
actual stats noindex status. Compare relevant page/query impressions, clicks,
CTR, and position over comparable 28-day windows, segmented by device and country.
Record release dates and avoid attributing every change to one metadata edit.
Use field Core Web Vitals when available; local screenshots and handler timings
are not field LCP, INP, or CLS. Prioritize measured problems and useful original
game content, not doorway pages or repeated keyword variations. Search Console
submission, indexing outcomes, and ranking gains are not established by local tests.

### Regression and Release Checks

| Contract | Executable evidence |
| --- | --- |
| Catalog filtering, no-JS links, reset, focus, empty results, Random, history | [tests/catalog.test.ts](tests/catalog.test.ts) |
| Metadata uniqueness, generated parity, schema/card agreement, favicon dimensions, internal links, noindex | [tests/seo.test.ts](tests/seo.test.ts) |
| Sitemap exclusions, canonical handling, XML and path safety | [tests/sitemap.test.ts](tests/sitemap.test.ts) |
| All thirteen worker imports, plain asset versions and content hashes | [tests/asset-version.test.ts](tests/asset-version.test.ts) |
| Worker retries, concurrency, visibility/offline behavior and cache privacy | [tests/service-worker.test.ts](tests/service-worker.test.ts) |
| Numeric map extraction, malformed values, SQL authorization and grants | [tests/database.test.ts](tests/database.test.ts) |
| Desktop/mobile catalog navigation, real worker replacement preserving Wordle, offline replay | [scripts/browser-test.mjs](scripts/browser-test.mjs) |

Run the focused files after editing their owner, then the full release gates:

```sh
npx vitest run --maxWorkers=2
node scripts/db-migrate.mjs --check
npm run build:games
ARCADE_SCREENSHOTS=/tmp/arcade-shots npm run test:browser
npm audit --audit-level=low
git diff --check
```

Audit each of the twelve game dependency trees separately as well. The browser
runner owns and closes a loopback server and uses isolated browser contexts;
routine checks must not write test scores to production. With maintainer
credentials, `node scripts/db-audit.mjs` separately checks live saved-headline
consistency without modifying rows. Review staged paths, push the tested revision,
watch both verification and Pages jobs, then compare live entry points/assets
with the committed files. Pages currently publishes independently of verification.
Robots-only changes now trigger verification; sitemap-only bot changes do not.

## Proposed, Not Implemented

| Priority | Proposal | Required design and acceptance evidence |
| --- | --- | --- |
| High | Rate-limited analytics ingestion | Trusted gateway, quota policy, abuse tests; client delays alone are insufficient |
| High | Data retention and self-service deletion | Explicit retention period, scheduled cleanup, authenticated deletion/export workflow, recovery policy |
| High | Stronger concurrent progress merge | Per-owner/versioned updates and game-specific merge rules; two-device and account-switch tests |
| Medium | Harden runtime dependency delivery and headers | Review/bundle the CDN SDK; test CSP without breaking auth, audio, flags, cards, or themes |
| Medium | Broader accessibility/browser coverage | Safari/Firefox and assistive-technology tests, modality alternatives, measured contrast and keyboard flows |
| Medium | Field performance and search monitoring | Search Console access, real-user or lab LCP/INP/CLS baselines, relevant-query tracking |
| Medium | Protected deployment pipeline | Required checks before publishing, explicit Pages deployment dependency and recovery drill |
| Optional | Feature Word or Interval again | Product decision, hub/ItemList/sitemap parity, no storage reset |
| Optional | Verified competitive scores | Server-authoritative rules or replay verification; caps alone are not anti-cheat |
| Optional | More games or deeper statistics | Evidence of player demand, bounded scope, model/UI/storage tests, accessible controls |

These are proposals, not commitments or partially enabled functionality. No
ranking position, cognitive/medical benefit, or zero-vulnerability claim is made.

## Design Constraints

Guest play must remain available without sign-in. Preserve the small static
architecture unless a demonstrated requirement warrants a backend or framework
change. Do not add paid competition using client-reported scores, fake reviews,
keyword doorway pages, or analytics claims unsupported by actual collected data.
