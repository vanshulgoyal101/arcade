import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'arcade-promote-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'));
  copyFileSync('scripts/clean-urls.mjs', join(root, 'scripts/clean-urls.mjs'));
  for (const game of ['2048', 'echo']) {
    mkdirSync(join(root, game, 'assets'), { recursive: true });
    mkdirSync(join(root, game, 'dist'), { recursive: true });
    writeFileSync(join(root, game, 'assets', 'old.js'), 'old bundle');
    writeFileSync(join(root, game, 'index.html'), 'served document');
    writeFileSync(join(root, game, 'dist', 'index.html'), 'redirect stub');
  }
  return {
    root,
    run: (...games: string[]) => spawnSync(process.execPath, [join(root, 'scripts/clean-urls.mjs'), ...games], { encoding: 'utf8' }),
  };
}

describe('build promotion safety', () => {
  it('leaves served files intact when promotion is repeated without a fresh build', () => {
    const { root, run } = fixture();
    expect(run('2048').status).toBe(1);
    expect(readFileSync(join(root, '2048/assets/old.js'), 'utf8')).toBe('old bundle');
    expect(readFileSync(join(root, '2048/index.html'), 'utf8')).toBe('served document');
  });

  it('preflights the whole batch before promoting any game', () => {
    const { root, run } = fixture();
    mkdirSync(join(root, '2048/dist/assets'));
    writeFileSync(join(root, '2048/dist/assets/new.js'), 'new bundle');
    writeFileSync(join(root, '2048/dist/template.html'), 'new document');
    expect(run('2048', 'echo').status).toBe(1);
    expect(readFileSync(join(root, '2048/index.html'), 'utf8')).toBe('served document');
    expect(run('2048').status).toBe(0);
    expect(readFileSync(join(root, '2048/index.html'), 'utf8')).toBe('new document');
    expect(readFileSync(join(root, '2048/assets/new.js'), 'utf8')).toBe('new bundle');
  });
});