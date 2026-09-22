// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createTestDatabase } from '../scripts/db-test.mjs';
import { securityMigration, tablePermissions } from '../scripts/db-migrate.mjs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let database: PGlite;
const firstUser = '00000000-0000-0000-0000-000000000001';
const secondUser = '00000000-0000-0000-0000-000000000002';

async function authenticate(user = firstUser) {
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await database.exec('set role authenticated');
}

beforeAll(async () => {
  database = await createTestDatabase();
  const migration = readFileSync('supabase/migrations/20260916_security.sql', 'utf8');
  expect(await securityMigration(database)).toBe(migration);
  await database.exec(migration);
  await database.exec(migration);
  const privileges = readFileSync('supabase/migrations/20260923_privileges.sql', 'utf8');
  const canonicalPermissions = await tablePermissions(database);
  await database.exec('grant all on arcade_scores, arcade_profiles, arcade_events to anon, authenticated');
  await database.exec(privileges);
  await database.exec(privileges);
  expect(await tablePermissions(database)).toEqual(canonicalPermissions);
  await database.exec(`insert into auth.users values ('${firstUser}'), ('${secondUser}')`);
}, 30000);

beforeEach(async () => { await database.exec('begin'); });
afterEach(async () => { await database.exec('rollback'); });
afterAll(async () => { await database.close(); });

describe('database security contracts', () => {
  it('still allows owner profile writes and aggregate analytics without raw-event grants', async () => {
    await database.exec("insert into arcade_events (kind, game) values ('visit','hub')");
    await authenticate('a0c64b9b-7d84-45d4-8ef7-522a6b294b42');
    const stats = await database.query<{ stats: { total_visits: number } }>('select arcade_stats(7) stats');
    expect(stats.rows[0].stats.total_visits).toBe(1);
    await database.exec('reset role');
    await authenticate();
    await database.query("insert into arcade_profiles (user_id, display_name) values ($1, 'Before')", [firstUser]);
    await database.exec("update arcade_profiles set display_name = 'After'");
    expect((await database.query('select display_name from arcade_profiles')).rows).toEqual([{ display_name: 'After' }]);
  });
  it.each(['anon', 'authenticated'])('denies destructive table privileges to %s', async role => {
    const permissions = await database.query<{ unsafe: boolean }>(`
      select has_table_privilege($1, 'public.' || table_name, 'TRUNCATE,TRIGGER,REFERENCES,DELETE') unsafe
      from unnest(array['arcade_scores','arcade_profiles','arcade_events']) table_name
    `, [role]);
    expect(permissions.rows).toEqual([{ unsafe: false }, { unsafe: false }, { unsafe: false }]);
  });

  it('accepts every shipped game, including the two hidden games', async () => {
    const games = readdirSync('.').filter(name => existsSync(`${name}/src/main.ts`));
    for (const game of games) {
      expect((await database.query('select arcade_valid_game($1) valid', [game])).rows).toEqual([{ valid: true }]);
    }
  });

  it.each([5, 'invalid', [], { large: 'x'.repeat(70000) }])('does not retain an invalid or oversized store (%#)', async (blob) => {
    await authenticate();
    await database.query("select submit_score('wordle', 3, $1::jsonb)", [JSON.stringify(blob)]);
    expect((await database.query('select data from restore_my_scores()')).rows).toEqual([{ data: null }]);
  });

  it('keeps competition ranking for ties and excludes zero-score backups', async () => {
    await database.query("insert into arcade_scores (user_id, game, best) values ($1,'wordle',5),($2,'wordle',5),($1,'echo',0)", [firstUser, secondUser]);
    await authenticate();
    const response = await database.query<{ board: { wordle: { top: Array<{ rank: number }>; my_rank: number }; echo: { top: unknown[] } } }>("select arcade_leaderboard(array['wordle','echo'], 5) board");
    expect(response.rows[0].board.wordle.top.map(row => row.rank)).toEqual([1, 1]);
    expect(response.rows[0].board.wordle.my_rank).toBe(1);
    expect(response.rows[0].board.echo.top).toEqual([]);
  });

  it('uses server time and removes caller-supplied analytics identity', async () => {
    await database.exec('set role anon');
    await database.query("insert into arcade_events (kind, game, ts, user_id) values ('play', 'wordle', '2099-01-01', $1)", [firstUser]);
    await database.exec('reset role');
    const response = await database.query<{ trusted_time: boolean; user_id: string | null }>('select ts = now() trusted_time, user_id from arcade_events');
    expect(response.rows).toEqual([{ trusted_time: true, user_id: null }]);
  });

  it('rejects invented analytics games', async () => {
    await database.exec('set role anon');
    await expect(database.query("insert into arcade_events (kind, game) values ('play', 'invented-game')")).rejects.toThrow();
  });

  it('rejects caller-selected analytics row IDs', async () => {
    await database.exec('set role anon');
    await expect(database.query("insert into arcade_events (id, kind, game) values (9000000, 'visit', 'hub')")).rejects.toThrow();
  });

  it('does not expose analytics rows or aggregates to non-owners', async () => {
    await database.exec("insert into arcade_events (kind, game) values ('visit', 'hub')");
    await authenticate();
    await expect(database.query('select arcade_stats(7)')).rejects.toThrow(/not authorized/i);
  });

  it.each(['anon', 'authenticated'])('denies raw analytics reads to %s', async role => {
    await database.exec(`set role ${role}`);
    await expect(database.query('select * from arcade_events')).rejects.toThrow(/permission denied/i);
  });

  it.each(['anon', 'authenticated'])('denies direct table truncation to %s', async role => {
    await database.exec(`set role ${role}`);
    await expect(database.exec('truncate arcade_events')).rejects.toThrow(/permission denied/i);
  });

  it('rejects unknown game slugs through direct writes', async () => {
    await authenticate();
    await expect(database.query('insert into arcade_scores (user_id, game, best) values ($1, $2, 1)', [firstUser, 'invented-game']))
      .rejects.toThrow();
  });

  it('rejects unknown game slugs through the score RPC', async () => {
    await authenticate();
    await expect(database.query("select submit_score('invented-game', 1, '{}'::jsonb)"))
      .rejects.toThrow();
  });

  it('does not allow another user to write a score row', async () => {
    await authenticate();
    await expect(database.query("insert into arcade_scores (user_id, game, best) values ($1, 'wordle', 1)", [secondUser]))
      .rejects.toThrow(/row-level security/i);
  });

  it('keeps full score blobs private but exposes safe leaderboard columns', async () => {
    await database.query("insert into arcade_scores (user_id, game, best, data) values ($1, 'wordle', 3, '{\"maxStreak\":3}')", [firstUser]);
    await authenticate(secondUser);
    expect((await database.query('select best from arcade_scores')).rows).toEqual([{ best: 3 }]);
    expect((await database.query('select * from restore_my_scores()')).rows).toEqual([]);
    await expect(database.query('select data from arcade_scores')).rejects.toThrow(/permission denied/i);
  });

  it('restores only the current account', async () => {
    await database.query("insert into arcade_scores (user_id, game, best, data) values ($1, 'wordle', 3, '{\"maxStreak\":3}')", [firstUser]);
    await authenticate();
    expect((await database.query('select * from restore_my_scores()')).rows)
      .toEqual([{ game: 'wordle', best: 3, data: { maxStreak: 3 } }]);
  });

  it('does not expose another account profile or theme', async () => {
    await database.query("insert into arcade_profiles (user_id, display_name, theme) values ($1, 'Private profile', 'classic')", [firstUser]);
    await authenticate(secondUser);
    expect((await database.query('select * from arcade_profiles')).rows).toEqual([]);
  });

  it('keeps score caps and monotonic bests on every write path', async () => {
    await authenticate();
    await database.query("select submit_score('echo', 10000, '{}'::jsonb)");
    await database.query("update arcade_scores set best = 0 where game = 'echo'");
    expect((await database.query('select best from arcade_scores')).rows).toEqual([{ best: 200 }]);
  });

  it('rejects unauthenticated submissions', async () => {
    await database.exec('set role anon');
    await expect(database.query("select submit_score('wordle', 3, '{}'::jsonb)"))
      .rejects.toThrow();
  });

  it('does not let public leaderboard requests return an unbounded number of rows', async () => {
    await database.exec(`
      insert into auth.users select ('10000000-0000-0000-0000-' || lpad(value::text, 12, '0'))::uuid from generate_series(1, 60) value;
      insert into arcade_scores (user_id, game, best) select id, 'wordle', 10 from auth.users;
      set role anon;
    `);
    const response = await database.query<{ board: { wordle: { top: unknown[] } } }>("select arcade_leaderboard(array['wordle'], 2147483647) board");
    expect(response.rows[0].board.wordle.top.length).toBeLessThanOrEqual(50);
  });

  it('filters unsupported games from leaderboard requests', async () => {
    await database.exec('set role anon');
    const response = await database.query("select arcade_leaderboard(array['wordle','invented-game','wordle'], 5) board");
    expect(Object.keys(response.rows[0].board as object)).toEqual(['wordle']);
  });
});