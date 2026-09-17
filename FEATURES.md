# Tiny Arcade Feature Catalog

Status: September 16, 2026. "Implemented" describes repository behavior, not a
guarantee about every browser or future deployment. See
[DOCUMENTATION.md](DOCUMENTATION.md) for architecture, commands, and contracts.

## Implemented Games

| Game | Experience | Discovery |
| --- | --- | --- |
| 2048 | Sliding tiles, progressive spawns with small-tile partner recovery, merge score, best tile, legal continuation after a win | Featured |
| Hue Hunt | Timed odd-color selection, increasing grids, combo scoring | Featured |
| Echo | Pad-sequence memory, strict/forgiving modes, four/six pads | Featured |
| Chromatic | RGB matching, endless rounds, difficulty and accuracy feedback | Featured |
| Flash | RSVP reading, comprehension questions, adaptive WPM | Featured |
| Flashmath | Timed arithmetic, growing operand ranges, combo multiplier | Featured |
| Sprint | 15/30/60-second typing, WPM, accuracy, trouble keys | Featured |
| Digit Span | Forward/reverse digit recall with growing sequence lengths | Featured |
| Where | Flag/capital geography quiz, easy/hard pools | Featured |
| Wordle | Unlimited five-letter puzzles, six guesses, streak/statistics view | Featured |
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
- Hub random-game selection and best-score badges refreshed on return navigation.
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

Chromatic's former daily mode and unused shared daily-leaderboard groundwork
were removed; they are not current features. Word replaced Interval in the
featured catalog, then 2048 replaced Word. Neither hidden game was deleted.
Legacy `/game/dist/` URLs now redirect to `/game/`. Historical claims that all
profile rows were public, database tests required production writes, zoom was
disabled intentionally, or the entire site had no backend no longer describe
the current implementation. Git history is the detailed historical record.

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
