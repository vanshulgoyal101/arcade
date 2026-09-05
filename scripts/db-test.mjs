#!/usr/bin/env node
// Self-cleaning integration tests for the arcade Supabase invariants, run via
// the Management API (read/write to the project's Postgres). These exercise the
// arcade_scores_guard trigger, arcade_score_cap and the arcade_leaderboard RPC —
// the server-side rules that protect the leaderboard from forged/regressing/
// oversized writes. Requires SUPABASE_TOKEN in arcade/.env.
//
//   node scripts/db-test.mjs
//
// All test rows use a throwaway game slug (__dbtest__) and are deleted in a
// finally block, so real leaderboard data is never touched.
import { readFileSync } from 'node:fs';

const PROJECT = 'tmngedsmgcgbkbkmsnsw';
const TG = '__dbtest__';
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

let pass = 0;
let fail = 0;
const check = (name, cond, got) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
  }
};
const lit = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;

async function main() {
  const users = await q(`select distinct user_id from public.arcade_scores limit 2`);
  const [u1, u2] = users.map((r) => r.user_id);
  if (!u1) throw new Error('need at least one existing user_id to satisfy the FK');

  try {
    console.log('arcade_score_cap:');
    const caps = await q(
      `select public.arcade_score_cap('echo') echo, public.arcade_score_cap('wordle') wordle, public.arcade_score_cap('flash') flash, public.arcade_score_cap('nope') other`
    );
    check('echo cap = 200', caps[0].echo === 200, caps[0].echo);
    check('wordle cap = 100000', caps[0].wordle === 100000, caps[0].wordle);
    check('flash cap = 900 (matches MAX_WPM)', caps[0].flash === 900, caps[0].flash);
    check('default cap = 10000000', caps[0].other === 10000000, caps[0].other);

    console.log('arcade_scores_guard (direct upsert):');
    await q(`delete from public.arcade_scores where game='${TG}'`);

    // negative → 0
    await q(`insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',-5,${lit({ v: 1 })})`);
    let r = (await q(`select best from public.arcade_scores where game='${TG}' and user_id='${u1}'`))[0];
    check('negative best is clamped to 0', r.best === 0, r.best);

    // above the (default) cap → clamped
    await q(
      `insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',20000000,${lit({ v: 1 })}) on conflict (user_id,game) do update set best=excluded.best`
    );
    r = (await q(`select best from public.arcade_scores where game='${TG}' and user_id='${u1}'`))[0];
    check('best above the cap is clamped to 10000000', r.best === 10000000, r.best);

    // monotonic: raise to 50, then a stale 0 upsert must keep 50 but still update data
    await q(`delete from public.arcade_scores where game='${TG}'`); // reset from the cap test above
    await q(`insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',50,${lit({ v: 1 })})`);
    await q(
      `insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',0,${lit({ v: 2 })}) on conflict (user_id,game) do update set best=excluded.best, data=excluded.data`
    );
    r = (await q(`select best, data->>'v' v from public.arcade_scores where game='${TG}' and user_id='${u1}'`))[0];
    check('a lower upsert cannot lower best (monotonic)', r.best === 50, r.best);
    check('data still updates even when best is held', r.v === '2', r.v);

    // oversized data blob → nulled
    await q(
      `insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',1, jsonb_build_object('big', repeat('x', 70000))) on conflict (user_id,game) do update set data=excluded.data`
    );
    r = (await q(`select data from public.arcade_scores where game='${TG}' and user_id='${u1}'`))[0];
    check('an oversized (>64KB) data blob is nulled', r.data === null, r.data);

    // non-object JSON can never be a game store → nulled
    for (const bad of [`'5'::jsonb`, `'"bad"'::jsonb`, `'[]'::jsonb`]) {
      await q(
        `insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',1,${bad}) on conflict (user_id,game) do update set data=excluded.data`
      );
      r = (await q(`select data from public.arcade_scores where game='${TG}' and user_id='${u1}'`))[0];
      check(`a ${bad} data blob is nulled`, r.data === null, r.data);
    }

    console.log('arcade_leaderboard (best>0 filter):');
    if (u2) {
      await q(`delete from public.arcade_scores where game='${TG}'`);
      await q(`insert into public.arcade_scores (user_id, game, best, data) values ('${u1}','${TG}',5,${lit({})})`);
      await q(`insert into public.arcade_scores (user_id, game, best, data) values ('${u2}','${TG}',5,${lit({})})`);
      let lb = await q(`select public.arcade_leaderboard(array['${TG}'], 5) as j`);
      let top = lb[0].j[TG].top;
      check('equal scores share the same competition rank', top.length === 2 && top.every((x) => x.rank === 1), top);

      await q(`delete from public.arcade_scores where game='${TG}' and user_id='${u2}'`);
      await q(`insert into public.arcade_scores (user_id, game, best, data) values ('${u2}','${TG}',0,${lit({})})`);
      lb = await q(`select public.arcade_leaderboard(array['${TG}'], 5) as j`);
      top = lb[0].j[TG].top;
      check('leaderboard top excludes the best=0 backup row', top.length === 1 && top[0].best === 5, top);
    } else {
      console.log('  (skipped: needs a second user)');
    }
  } finally {
    await q(`delete from public.arcade_scores where game='${TG}'`).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('✗ db-test crashed:', e.message);
  process.exit(1);
});
