import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createTestDatabase } from './db-test.mjs';

const project = 'tmngedsmgcgbkbkmsnsw';
const migrationFile = new URL('../supabase/migrations/20260916_security.sql', import.meta.url);
const signatures = ['arcade_valid_game(text)', 'arcade_scores_guard()', 'arcade_leaderboard(text[],integer)', 'arcade_events_guard()'];

export async function securityMigration(database) {
  const definitions = [];
  for (const signature of signatures) {
    const result = await database.query('select pg_get_functiondef($1::regprocedure) definition', [`public.${signature}`]);
    definitions.push(result.rows[0].definition + ';');
  }
  return `begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.arcade_scores, public.arcade_profiles, public.arcade_events in share row exclusive mode;
${definitions.join('\n')}
do $$ begin
  if exists (select 1 from public.arcade_scores where not public.arcade_valid_game(game)) then
    raise exception 'unsupported stored score games require manual review';
  end if;
end $$;
drop policy if exists arcade_profiles_read on public.arcade_profiles;
create policy arcade_profiles_read on public.arcade_profiles for select using (auth.uid() = user_id);
revoke execute on function public.restore_my_scores() from public, anon;
revoke execute on function public.submit_score(text, integer, jsonb) from public, anon;
revoke execute on function public.arcade_stats(integer) from public, anon;
grant execute on function public.restore_my_scores(), public.submit_score(text, integer, jsonb), public.arcade_stats(integer) to authenticated;
alter table public.arcade_events alter column id set generated always;
drop trigger if exists arcade_events_guard on public.arcade_events;
create trigger arcade_events_guard before insert on public.arcade_events for each row execute function public.arcade_events_guard();
commit;
`;
}

async function main() {
  const mode = process.argv[2] ?? '--check';
  if (!['--check', '--write', '--apply'].includes(mode)) throw new Error('Use --check, --write, or --apply');
  const database = await createTestDatabase();
  let sql;
  try {
    sql = await securityMigration(database);
    await database.exec(sql);
    await database.exec(sql);
  } finally {
    await database.close();
  }
  if (mode === '--write') {
    mkdirSync(new URL('.', migrationFile), { recursive: true });
    writeFileSync(migrationFile, sql);
  } else if (readFileSync(migrationFile, 'utf8') !== sql) {
    throw new Error('Migration differs from the tested canonical schema; regenerate and review it');
  }
  const digest = createHash('sha256').update(sql).digest('hex');
  console.log(`Migration validated (including repeat application): ${digest}`);
  if (mode !== '--apply') return;

  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  const token = process.env.SUPABASE_TOKEN;
  if (!token) throw new Error('SUPABASE_TOKEN is required for explicit --apply');
  const query = async (sql) => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`Database request failed: HTTP ${response.status}`);
    return response.json();
  };
  const before = await query(`select
    (select count(*) from public.arcade_scores) scores,
    (select count(*) from public.arcade_profiles) profiles,
    (select count(*) from public.arcade_events) events`);
  const backup = await query(`select jsonb_build_object(
    'functions', (select jsonb_agg(pg_get_functiondef(oid)) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'arcade_%' or pronamespace = 'public'::regnamespace and proname in ('submit_score','restore_my_scores')),
    'policies', (select jsonb_agg(to_jsonb(policies)) from pg_policies policies where schemaname = 'public' and tablename like 'arcade_%'),
    'grants', (select jsonb_agg(to_jsonb(grants)) from information_schema.role_routine_grants grants where routine_schema = 'public' and (routine_name like 'arcade_%' or routine_name in ('submit_score','restore_my_scores'))),
    'event_identity', (select identity_generation from information_schema.columns where table_schema='public' and table_name='arcade_events' and column_name='id')
  ) schema_backup`);
  const directory = mkdtempSync(join(tmpdir(), 'arcade-schema-backup-'));
  const backupFile = join(directory, 'schema.json');
  writeFileSync(backupFile, JSON.stringify({ project, digest, before, backup }, null, 2), { mode: 0o600 });
  console.log(`Schema backup: ${backupFile}`);
  await query(sql);
  const after = await query(`select
    (select count(*) from public.arcade_scores) scores,
    (select count(*) from public.arcade_profiles) profiles,
    (select count(*) from public.arcade_events) events,
    has_function_privilege('anon','public.restore_my_scores()','execute') anonymous_restore,
    has_function_privilege('anon','public.submit_score(text,integer,jsonb)','execute') anonymous_submit,
    has_function_privilege('anon','public.arcade_stats(integer)','execute') anonymous_stats,
    public.arcade_valid_game('invented-game') accepts_unknown_game`);
  console.log(JSON.stringify({ project, before, after }));
  const checks = after[0];
  if (checks.anonymous_restore || checks.anonymous_submit || checks.anonymous_stats || checks.accepts_unknown_game) {
    throw new Error('Post-migration privilege checks failed');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}