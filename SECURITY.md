# Security and Privacy Model

## Scope

Tiny Arcade is a static browser application with optional Supabase Auth,
PostgreSQL score storage, public leaderboards, and private aggregate analytics.
The browser is untrusted. TypeScript types, hidden controls, and localStorage
validation are not access controls. SQL policies, grants, and triggers enforce
the database boundaries.

## Data Boundaries

| Data | Read access | Write access | Enforcement |
| --- | --- | --- | --- |
| Score headline and leaderboard identity | Public | Authenticated owner | RLS; per-game caps; monotonic trigger |
| Complete saved game blob | Owner restore RPC only | Authenticated owner | Column SELECT grants; `auth.uid()` in restore RPC; object/64 KiB bounds |
| Profile and theme | Authenticated owner | Authenticated owner | RLS; display name/avatar length limits |
| Analytics events | No public row access | Public insertion | Kind/game validation; field bounds; server timestamp; generated ID |
| Analytics aggregates | Fixed configured owner | Not applicable | Identity check inside SECURITY DEFINER RPC |

Only the twelve shipped game identifiers can create score rows. Hidden games
Word and Interval remain valid. The public leaderboard examines at most 64
requested identifiers, deduplicates and validates them, and returns between 1
and 50 rows per game (default 5). Equal scores use competition ranking.
Anonymous execute grants are explicitly removed from restore, submit, and stats.

Table privileges are also explicit: public roles can read only safe score
columns and insert analytics; authenticated players can additionally insert or
update scores and select/insert/update their own profiles under RLS. Neither
role receives DELETE, TRUNCATE, TRIGGER, or REFERENCES on Arcade tables. RLS
does not protect TRUNCATE, so a missing policy is not a substitute for revoking
that privilege. The September 23 audit confirmed these excessive inherited
grants in production; the current REST API did not expose a truncate endpoint.

Profiles are private rows, but the display name and avatar copied into a score
row remain public leaderboard identity. Never put secrets in those fields.
New analytics events do not retain caller-provided account IDs. Their visitor
identifier is pseudonymous, not proof of anonymity. Historical events are not
rewritten by the hardening migration.

## Authentication and Local State

The hub handles first-time guest claiming, account ownership, and migration.
The game helper binds asynchronous work to the page's current identity. A
different account returns to the hub; sign-out reloads the game without deleting
local progress. Same-user token refresh does not interrupt play. Late restores,
profile results, and upload acknowledgements cannot mutate the new session's
state. The retry queue preserves higher scores and changed equal-score blobs.

Account migration records `arcade.sync.migration` before clearing old stores.
Storage errors leave that marker in place, so partially replaced stores must be
restored through the hub before either account can upload them. Ownership is
committed only after all restore writes succeed. This cannot undo already removed
data when storage fails mid-migration; it prevents partial state being mistaken
for an account's completed restore. Game operations also recheck stored ownership
and the migration marker before writes and acknowledgements.

Game-page restores and uploads are serialized per game, with upload snapshots
read at execution time. Late restores do not replace progress saved during the
request. This protects one page's ordering, not arbitrary concurrent histories
across tabs or devices.

Cloud game and coded-avatar allowlists require own registry properties; inherited
names such as `constructor` are not valid entries. Nonfinite score submissions
are rejected before network initialization. Rank HTML escapes labels and accepts
only positive safe-integer ranks/totals with rank no greater than total. Current
callers use fixed labels; this is defensive rendering, not evidence of a remote
rank-label exploit.

OAuth return URLs contain only origin and pathname. The service worker bypasses
known authentication callback query parameters, Authorization headers, and
`no-store` requests, and does not persist `private` or `no-store` responses.
The `arcade-v3` activation removes prior Arcade caches. This does not erase browser
history or server logs, and is not protection against arbitrary same-origin code.

Local scores and preferences are device data, not a secure vault. A script
running on this origin can read them and the SDK's session. Do not add arbitrary
third-party scripts or render unsanitized names, URLs, or stored HTML.

## Database Changes and Tests

Canonical schemas: `supabase/arcade_scores.sql`, then `supabase/analytics.sql`.
Do not reapply the entire legacy bootstrap to production for a small change:
it contains historical cleanup statements. Use the targeted migration.

The runner applies `20260916_security.sql` followed by the additive
`20260923_privileges.sql`. It checks repeat application and effective grant
parity with the canonical schema, and backs up table/column grants as well as
function definitions and policies before a production application. The privilege
migration does not modify or delete player rows.

```sh
npm ci
node scripts/db-test.mjs
node scripts/db-migrate.mjs --check
node scripts/db-audit.mjs
```

The first two database commands are isolated and require no secrets. PGlite
runs actual PostgreSQL DDL, policies, triggers, and functions with representative
Supabase roles and `auth.uid()`. It does not emulate GoTrue, PostgREST, network
failures, or a complete hosted Supabase installation. Each security test rolls
back its data. The migration is checked against canonical function definitions
and tested for repeat application. The audit command is read-only against the
configured live project and requires a local management token.

```sh
node scripts/db-migrate.mjs --write
git diff -- supabase/migrations/20260916_security.sql
node scripts/db-test.mjs
node scripts/db-migrate.mjs --apply
```

`--write` mechanically generates the reviewed migration from PostgreSQL's
parsed definitions, not regex extraction. `--apply` is explicit, targets only
project `tmngedsmgcgbkbkmsnsw`, requires ignored `.env` `SUPABASE_TOKEN`, validates
the checked-in migration, and backs up affected schema metadata into a private
temporary file before application. SQL runs in a transaction with lock and
statement timeouts. Unexpected stored game identifiers abort the transaction
for manual review. Existing score/profile/event rows are not deleted or rewritten.
The script prints the migration SHA-256 and post-application privilege checks.

For rollback, inspect the captured schema metadata and write a reviewed forward
migration. Do not blindly restore public grants or remove the privacy boundary.
If the Management API times out, inspect deployed definitions before retrying;
the transaction may have committed even when its response was lost.

## Known Limits

- Client-generated scores can be forged within their caps. These are casual
  leaderboards, not verified competition or prize eligibility. Strong anti-cheat
  requires trusted server replay or authoritative game execution.
- Anonymous analytics can be spammed. Valid identifiers and bounded fields do
  not impose a trusted per-IP ingestion rate limit. A future authenticated/rate-
  limited gateway and an explicit retention policy are separate deployment work.
- A persistent visitor ID can be reset or shared; unique visitors are approximate.
  A recorded play currently means a game page load, not a completed run.
- Cross-device backups are not a general conflict-free merge. Scalar bests are
  monotonic; maps and streak histories can diverge across simultaneous devices.
- Runtime CDN availability remains a dependency of optional cloud features. The
  bundled Supabase version is pinned; offline game play must continue without it.
- Hub and stats pages have limited meta CSP policies that allow inline scripts.
  Game pages do not yet have equivalent policies. GitHub Pages does not provide
  configurable response security headers; meta CSP cannot enforce frame-ancestors.
  A full header policy needs a compatible hosting layer and integration testing.
- The privacy page offers local analytics opt-out and the beacon honors browser
  privacy signals. This does not delete past events or recall in-flight requests.
- External avatar image hosts receive normal image requests. Do not promise
  anonymity for remote profile images or a persistent visitor identifier.

## Reporting

Do not include access tokens, raw player stores, or identifying analytics in
public issues. Use the repository's private vulnerability reporting channel when
available; otherwise contact the maintainer privately before publishing exploit
details. Rotate a leaked management credential outside chat and review provider
audit logs. Browser publishable keys are intentionally public and are not service
role or management credentials.