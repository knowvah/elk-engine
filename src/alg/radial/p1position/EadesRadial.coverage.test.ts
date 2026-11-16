// SPDX-License-Identifier: EPL-2.0
// The `tau < maxAlpha - minAlpha` TRUE arm of EadesRadial.java:109-113 (mission 8a, T19). `tau = 2 * acos(currentRadius /
// currentRadius + radius)` (the upstream precedence quirk) is NaN for the root call (0/0) and for every child call when
// radius > 0 (acos of 1 + radius), which is every recorded row; the arm needs a negative RADIUS in [-2, 0), which
// RadialLayoutProvider.java:59-62 keeps (it only replaces RADIUS == 0). Reachable through the engine, unrecorded.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerRadial } from '../../../../test/helpers/radial-replay-dump.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../../graph/json/ElkGraphJson.js';
import { EadesRadial } from './EadesRadial.js';

type WedgeStart = (currentRadius: number, minAlpha: number, maxAlpha: number, leafs: number) => [number, number];

const wedgeStartOf = (radius: number): WedgeStart => {
  const eades = new EadesRadial();
  (eades as unknown as { radius: number }).radius = radius;
  return (eades as unknown as { wedgeStart: WedgeStart }).wedgeStart.bind(eades);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EadesRadial.wedgeStart (EadesRadial.java:108-117)', () => {
  it('radius -1, child call: tau = 2 * acos(1 - 1) = PI fits into the wedge and centres it (:109-113)', () => {
    const [s, alpha] = wedgeStartOf(-1)(-1, 0, 2 * Math.PI, 2);
    expect(s).toBe(Math.PI / 2);
    expect(alpha).toBe((0 + 2 * Math.PI - Math.PI) / 2);
  });

  it('radius -1, tau PI not smaller than the wedge: the else arm uses the whole wedge (:114-116)', () => {
    const [s, alpha] = wedgeStartOf(-1)(-1, 1, 1 + Math.PI, 4);
    expect(s).toBe(Math.PI / 4);
    expect(alpha).toBe(1);
  });

  it('radius 10 and the root call (0/0) give NaN tau: the else arm', () => {
    expect(wedgeStartOf(10)(0, 0, 2 * Math.PI, 2)).toEqual([Math.PI, 0]);
  });
});

describe('EadesRadial through the engine with a negative RADIUS', () => {
  it('takes the tau arm: acos is evaluated at 0 for the child calls', () => {
    registerRadial();
    const graph = ElkGraphJson.forGraph(
      JSON.stringify({
        id: 'root',
        layoutOptions: { algorithm: 'org.eclipse.elk.radial', 'org.eclipse.elk.radial.radius': '-1' },
        children: [
          { id: 'a', width: 10, height: 10 },
          { id: 'b', width: 10, height: 10 },
          { id: 'c', width: 10, height: 10 },
        ],
        edges: [
          { id: 'e1', sources: ['a'], targets: ['b'] },
          { id: 'e2', sources: ['a'], targets: ['c'] },
        ],
      }),
    ).toElk();
    const acos = vi.spyOn(Math, 'acos');

    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());

    expect(acos.mock.calls.some(([x]) => x === 0)).toBe(true);
    expect([...graph.getChildren()].every((n) => Number.isFinite(n.getX()) && Number.isFinite(n.getY()))).toBe(true);
  });
});
