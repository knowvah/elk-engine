// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  decodeHex,
  loadVertiFlexRows,
  stateAfter,
  STEP_RELATIVE_X_PLACER,
  STEP_Y_PLACER,
  type Dump,
  type StopsRow,
} from '../../../../test/helpers/vertiflex-replay-rows.js';
import { rebuildStop } from '../../../../test/helpers/vertiflex-replay-dump.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../InternalProperties.js';
import { NodeComparator } from './NodeComparator.js';

const rows = loadVertiFlexRows('stops');
const BEFORE = -1;
const AFTER = 1;

function node(y: number, order: number): ElkNode {
  const n = ElkGraphUtil.createNode(null);
  n.setY(y);
  n.setProperty(InternalProperties.NODE_MODEL_ORDER, order);
  return n;
}

/** The sibling groups of a row's input: the target ids of the edges of each source, in edge order. */
function siblingGroups(row: StopsRow): string[][] {
  const groups = new Map<string, string[]>();
  for (const edge of (row.input.edges ?? []) as { sources: string[]; targets: string[] }[]) {
    groups.set(edge.sources[0]!, [...(groups.get(edge.sources[0]!) ?? []), edge.targets[0]!]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

describe('NodeComparator (NodeComparator.java:34-51: y by Double.compare, inverted for invert, ties by model order)', () => {
  it('orders by y ascending, and descending when inverted', () => {
    expect(new NodeComparator().compare(node(1, 0), node(2, 0))).toBe(BEFORE);
    expect(new NodeComparator(false).compare(node(2, 0), node(1, 0))).toBe(AFTER);
    expect(new NodeComparator(true).compare(node(1, 0), node(2, 0))).toBe(AFTER);
    expect(new NodeComparator(true).compare(node(2, 0), node(1, 0))).toBe(BEFORE);
  });

  it('breaks ties by model order, also when inverted (the inversion only reverses y)', () => {
    expect(new NodeComparator(false).compare(node(5, 0), node(5, 1))).toBe(BEFORE);
    expect(new NodeComparator(true).compare(node(5, 0), node(5, 1))).toBe(BEFORE);
    expect(new NodeComparator(true).compare(node(5, 3), node(5, 3))).toBe(0);
  });

  it('throws where Java unboxes a null model order on a y tie (NodeComparator.java:45-46: Integer.compare(Integer, Integer))', () => {
    const bare = (y: number): ElkNode => {
      const n = ElkGraphUtil.createNode(null);
      n.setY(y);
      return n;
    };
    expect(() => new NodeComparator(false).compare(bare(3), bare(3))).toThrow(TypeError);
    expect(() => new NodeComparator(true).compare(bare(3), bare(3))).toThrow(TypeError);
    // the first operand is unboxed first: with only b missing the message still names the missing one
    expect(() => new NodeComparator().compare(node(3, 0), bare(3))).toThrow(TypeError);
    expect(() => new NodeComparator().compare(bare(3), node(3, 0))).toThrow(TypeError);
    // no tie: Double.compare decides and the model order is never read (Java :46 is not reached)
    expect(new NodeComparator().compare(bare(1), bare(2))).toBe(BEFORE);
    expect(new NodeComparator(true).compare(bare(1), bare(2))).toBe(AFTER);
  });

  it('uses Double.compare: -0.0 sorts before 0.0', () => {
    expect(new NodeComparator().compare(node(-0, 9), node(0, 0))).toBe(BEFORE);
  });

  it(
    'sorts the siblings of every recorded row by (y, model order) from the NodeYPlacer stop, and by (-y, model order) inverted',
    { timeout: 60_000 },
    () => {
      let groups = 0;
      for (const row of rows) {
        const graph = rebuildStop(row, STEP_Y_PLACER);
        const byId = new Map([...graph.getChildren()].map((n) => [n.getIdentifier()!, n]));
        for (const ids of siblingGroups(row)) {
          const children = ids.map((id) => byId.get(id)!);
          const key = (n: ElkNode, sign: number): number[] => [
            sign * n.getY(),
            n.getProperty(InternalProperties.NODE_MODEL_ORDER),
          ];
          for (const sign of [1, -1]) {
            const sorted = [...children].sort((a, b) => new NodeComparator(sign < 0).compare(a, b));
            const keys = sorted.map((n) => key(n, sign));
            const expected = [...keys].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
            expect(keys, row.id).toEqual(expected);
          }
          groups += 1;
        }
      }
      expect(groups).toBeGreaterThan(50);
    },
  );

  it(
    'shapes the recorded result of the V-shape placement: left to right the y of the siblings rises to the deepest and falls (considerNodeModelOrder false, STRAIGHT)',
    { timeout: 60_000 },
    () => {
      let checked = 0;
      for (const row of rows) {
        const options = row.input.layoutOptions as Record<string, unknown>;
        if (options.considerNodeModelOrder !== 'false') continue;
        const after: Dump = stateAfter(row, STEP_RELATIVE_X_PLACER);
        const y = new Map(after.nodes.map((n) => [n.id, decodeHex(n.y)]));
        const x = new Map(after.nodes.map((n) => [n.id, decodeHex(n.x)]));
        for (const ids of siblingGroups(row)) {
          const ys = [...ids].sort((a, b) => x.get(a)! - x.get(b)!).map((id) => y.get(id)!);
          const peak = ys.indexOf(Math.max(...ys));
          const peakEnd = ys.lastIndexOf(Math.max(...ys));
          expect(
            ys.slice(0, peak + 1).every((v, i, a) => i === 0 || v >= a[i - 1]!) &&
              ys.slice(peakEnd).every((v, i, a) => i === 0 || v <= a[i - 1]!),
            `${row.id}: ${ys.join(',')}`,
          ).toBe(true);
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(5);
    },
  );
});
