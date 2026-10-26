// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Direction } from '../../../../core/options/Direction.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';

describe('CGraph', () => {
  it('starts empty', () => {
    const graph = new CGraph(EnumSet.allOf(Direction));
    expect([
      graph.cNodes,
      graph.cGroups,
      graph.predefinedHorizontalConstraints,
      graph.predefinedVerticalConstraints,
    ]).toEqual([[], [], [], []]);
  });

  it('supports exactly the directions it was given', () => {
    const graph = new CGraph(EnumSet.of(Direction.LEFT, Direction.RIGHT));
    expect(graph.supports(Direction.LEFT)).toBe(true);
    expect(graph.supports(Direction.RIGHT)).toBe(true);
    expect(graph.supports(Direction.UP)).toBe(false);
    expect(graph.supports(Direction.DOWN)).toBe(false);
    expect(graph.supports(Direction.UNDEFINED)).toBe(false);
  });
});
