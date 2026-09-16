import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

export async function createTestDatabase() {
  const database = new PGlite();
  try {
    await database.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
    `);
    for (const file of ['arcade_scores.sql', 'analytics.sql']) {
      await database.exec(readFileSync(new URL(`../supabase/${file}`, import.meta.url), 'utf8'));
    }
    await database.exec('grant usage on all sequences in schema public to anon, authenticated');
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/database.test.ts'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}