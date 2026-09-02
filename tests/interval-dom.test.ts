import { describe, it, expect } from 'vitest';
import { mountGame, click, text, gameEnv } from './helpers/dom';

const load = () => mountGame(() => import('../interval/src/main.ts'));

describe('interval/dom', () => {
  gameEnv();

  it('boots with eight interval options and a play button', async () => {
    const app = await load();
    expect(app.querySelectorAll('#options .opt').length).toBe(8);
    expect(app.querySelector('#play')).not.toBeNull();
  });

  it('answering reveals exactly one correct option and locks input', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    click(opts[0]);
    expect(app.querySelectorAll('#options .opt.correct').length).toBe(1);
    expect(app.querySelector('#options')!.classList.contains('locked')).toBe(true);
  });

  it('ignores a second answer in the same round', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    click(opts[0]);
    const lives = text(app.querySelector('#lives'));
    const score = text(app.querySelector('#score'));
    click(opts[1]);
    expect(text(app.querySelector('#lives'))).toBe(lives);
    expect(text(app.querySelector('#score'))).toBe(score);
  });
});
