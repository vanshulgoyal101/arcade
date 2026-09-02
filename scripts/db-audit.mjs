#!/usr/bin/env node
// Read-only integrity audit of the live leaderboard. For every stored row it
// recomputes the game's headline metric from the saved `data` blob and compares
// it to the ranked `best` column, reporting the two ways they can disagree:
//
//   blob_ahead — the player's own store says they did better than the board
//                shows, i.e. a real score never made it into `best`.
//   best_ahead — `best` is ahead of the blob (expected and harmless: `best` is
//                monotonic, so a device reset leaves a stale blob behind; the
//                client heals this on the next load).
//
// Changes nothing. Run: node scripts/db-audit.mjs
import { readFileSync } from 'node:fs';

const PROJECT = 'tmngedsmgcgbkbkmsnsw';
const token = (readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^SUPABASE_TOKEN=(.+)$/m) || [])[1]
  ?.trim()
  .replace(/^['"]|['"]$/g, '');
if (!token) {
  console.error('✗ SUPABASE_TOKEN not found in arcade/.env');
  process.exit(1);
}

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

// Mirrors the HEADLINE map in shared/cloud.ts. jsonb_typeof guards keep a
// malformed blob from aborting the whole audit with a cast error.
const num = (field) => `case when jsonb_typeof(data->'${field}')='number' then (data->>'${field}')::numeric end`;
const mapMax = `(select max(value::numeric) from jsonb_each_text(case when jsonb_typeof(data->'best')='object' then data->'best' else '{}'::jsonb end) where value ~ '^-?[0-9.]+$')`;

const HEADLINE = `case game
  when 'hue-hunt'   then ${num('bestScore')}
  when 'chromatic'  then ${num('endlessBest')}
  when 'flash'      then ${num('bestWpm')}
  when 'flashmath'  then ${num('bestScore')}
  when 'interval'   then ${num('bestScore')}
  when 'word'       then ${num('practiceBest')}
  when 'wordle'     then ${num('maxStreak')}
  when 'where'      then greatest(coalesce(${num('bestEasy')},0), coalesce(${num('bestHard')},0))
  when 'echo'       then ${mapMax}
  when 'sprint'     then ${mapMax}
  when 'digit-span' then ${mapMax}
end`;

const rows = await q(`
  with h as (
    select user_id, game, best, ${HEADLINE} as headline
    from public.arcade_scores
    where data is not null and jsonb_typeof(data) = 'object'
  )
  select game,
         count(*)                                        as rows,
         count(*) filter (where headline is null)         as unreadable,
         count(*) filter (where headline > best)          as blob_ahead,
         count(*) filter (where best > headline)          as best_ahead,
         coalesce(max(headline - best) filter (where headline > best), 0) as worst_gap
  from h group by game order by game`);

let underReported = 0;
console.log('game          rows  unreadable  blob_ahead  best_ahead  worst_gap');
for (const r of rows) {
  underReported += Number(r.blob_ahead);
  const flag = Number(r.blob_ahead) > 0 ? '  <-- under-reported on the board' : '';
  console.log(
    `${r.game.padEnd(12)} ${String(r.rows).padStart(5)} ${String(r.unreadable).padStart(11)} ${String(r.blob_ahead).padStart(11)} ${String(r.best_ahead).padStart(11)} ${String(r.worst_gap).padStart(10)}${flag}`
  );
}

if (underReported) {
  console.log(`\n${underReported} row(s) where a real score never reached the board. Details:`);
  const detail = await q(`
    with h as (
      select user_id, game, best, display_name, ${HEADLINE} as headline
      from public.arcade_scores
      where data is not null and jsonb_typeof(data) = 'object'
    )
    select game, coalesce(display_name,'(no name)') as who, best, headline
    from h where headline > best order by (headline - best) desc limit 20`);
  for (const d of detail) console.log(`  ${d.game.padEnd(12)} ${d.who.padEnd(22)} board ${d.best} vs local ${d.headline}`);
} else {
  console.log('\n✓ No under-reported scores: every board entry is >= the player’s own saved store.');
}
