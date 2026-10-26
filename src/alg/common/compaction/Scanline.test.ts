// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Scanline } from './Scanline.js';
import type { EventHandler } from './ScanlineEventHandler.js';

interface Ev {
  key: number;
  id: string;
}

const byKey = (a: Ev, b: Ev): number => a.key - b.key;

function recorder(log: string[], name: string): EventHandler<Ev> {
  return { handle: (p) => log.push(`${name}:${p.id}`) };
}

describe('Scanline', () => {
  const points: Ev[] = [
    { key: 2, id: 'a' },
    { key: 1, id: 'b' },
    { key: 2, id: 'c' },
    { key: 1, id: 'd' },
  ];

  it('sorts with the comparator and keeps the input order of ties', () => {
    const log: string[] = [];
    Scanline.execute(points, byKey, recorder(log, 'h'));
    expect(log).toEqual(['h:b', 'h:d', 'h:a', 'h:c']);
  });

  it('calls every handler, in order, for each point before the next point', () => {
    const log: string[] = [];
    Scanline.execute(points, byKey, [recorder(log, 'x'), recorder(log, 'y')]);
    expect(log).toEqual(['x:b', 'y:b', 'x:d', 'y:d', 'x:a', 'y:a', 'x:c', 'y:c']);
  });

  it('does not reorder the caller points', () => {
    Scanline.execute(points, byKey, recorder([], 'h'));
    expect(points.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('accepts any iterable of points and does nothing for none', () => {
    const log: string[] = [];
    Scanline.execute(new Set(points), (a, b) => b.key - a.key, recorder(log, 'h'));
    expect(log).toEqual(['h:a', 'h:c', 'h:b', 'h:d']);
    const none: string[] = [];
    Scanline.execute([], byKey, recorder(none, 'h'));
    expect(none).toEqual([]);
  });
});
