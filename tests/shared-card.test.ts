import { describe, it, expect } from 'vitest';
import { withAlpha, roundRect } from '../shared/card';

describe('shared/card · withAlpha', () => {
  it('expands 6-digit hex to rgba', () => {
    expect(withAlpha('#fb7185', 0.3)).toBe('rgba(251, 113, 133, 0.3)');
  });

  it('expands 3-digit shorthand hex', () => {
    expect(withAlpha('#f70', 0.5)).toBe('rgba(255, 119, 0, 0.5)');
  });

  it('tolerates a missing leading hash', () => {
    expect(withAlpha('000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('ffffff', 0)).toBe('rgba(255, 255, 255, 0)');
  });
});

// A minimal 2D-context stub — jsdom has no real canvas, and roundRect only
// issues path commands, so we record them to assert the geometry.
function mockCtx() {
  const calls: { m: string; args: number[] }[] = [];
  const rec = (m: string) => (...args: number[]) => calls.push({ m, args });
  return {
    calls,
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    arcTo: rec('arcTo'),
    closePath: rec('closePath'),
  };
}

describe('shared/card · roundRect', () => {
  it('draws four corner arcs and closes the path', () => {
    const ctx = mockCtx();
    roundRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 50, 10);
    const names = ctx.calls.map((c) => c.m);
    expect(names[0]).toBe('beginPath');
    expect(names.filter((n) => n === 'arcTo')).toHaveLength(4);
    expect(names[names.length - 1]).toBe('closePath');
  });

  it('clamps the radius to half the shorter side', () => {
    const ctx = mockCtx();
    // Requested radius (999) far exceeds the box, so it clamps to min(999,50,25)=25.
    roundRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 50, 999);
    const moveTo = ctx.calls.find((c) => c.m === 'moveTo')!;
    expect(moveTo.args[0]).toBe(25); // x + clampedRadius
  });
});
