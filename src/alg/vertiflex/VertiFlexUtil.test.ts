// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { importInput } from '../../../test/helpers/vertiflex-replay-dump.js';
import { loadVertiFlexRows, stateAfter, STEP_PREAMBLE } from '../../../test/helpers/vertiflex-replay-rows.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from './InternalProperties.js';
import { VertiFlexLayoutPhases } from './VertiFlexLayoutPhases.js';
import { findRoot } from './VertiFlexUtil.js';

describe('VertiFlexUtil.findRoot (VertiFlexUtil.java:35-42)', () => {
  it('finds the root that every recorded Preamble stop names as ROOT_NODE', { timeout: 60_000 }, () => {
    let roots = 0;
    for (const row of loadVertiFlexRows('stops')) {
      const recorded = stateAfter(row, STEP_PREAMBLE).props.find((p) => p.id === 'root')!.props.ROOT_NODE;
      expect(findRoot(importInput(row))?.getIdentifier(), row.id).toBe(recorded);
      roots += 1;
    }
    expect(roots).toBe(216);
  });

  it('returns null when every child has an incoming edge (the cycleNoRoot throws row) and for no children', () => {
    const cycle = loadVertiFlexRows('throws').find((row) => row.id === 'throws/cycleNoRoot')!;
    expect(findRoot(importInput(cycle))).toBeNull();
    expect(findRoot(ElkGraphUtil.createGraph())).toBeNull();
  });
});

describe('VertiFlexLayoutPhases (VertiFlexLayoutPhases.java)', () => {
  it('lists the four phases in declaration order', () => {
    expect(VertiFlexLayoutPhases.values().map((p) => p.name())).toEqual([
      'P1_NODE_Y_PLACEMENT',
      'P2_NODE_RELATIVE_PLACEMENT',
      'P3_NODE_ABSOLUTE_PLACEMENT',
      'P4_EDGE_ROUTING',
    ]);
    expect(VertiFlexLayoutPhases.values().map((p) => p.ordinal())).toEqual([0, 1, 2, 3]);
  });

  it('resolves names, compares by ordinal and rejects an unknown name', () => {
    expect(VertiFlexLayoutPhases.valueOf('P4_EDGE_ROUTING')).toBe(VertiFlexLayoutPhases.P4_EDGE_ROUTING);
    expect(VertiFlexLayoutPhases.P1_NODE_Y_PLACEMENT.compareTo(VertiFlexLayoutPhases.P3_NODE_ABSOLUTE_PLACEMENT)).toBe(
      -2,
    );
    expect(VertiFlexLayoutPhases.P2_NODE_RELATIVE_PLACEMENT.toString()).toBe('P2_NODE_RELATIVE_PLACEMENT');
    expect(() => VertiFlexLayoutPhases.valueOf('P5')).toThrow(
      'No enum constant org.eclipse.elk.alg.vertiflex.VertiFlexLayoutPhases.P5',
    );
  });
});

describe('InternalProperties ids (InternalProperties.java:36-73)', () => {
  it('keep the Java property ids, the root node and the model order under their own text', () => {
    expect(
      [
        InternalProperties.LEFT_OUTLINE,
        InternalProperties.RIGHT_OUTLINE,
        InternalProperties.OUTLINE_MAX_DEPTH,
        InternalProperties.MIN_X,
        InternalProperties.MAX_X,
        InternalProperties.MIN_Y,
        InternalProperties.MAX_Y,
        InternalProperties.ROOT_NODE,
        InternalProperties.EDGE_BEND_HEIGHT,
        InternalProperties.NODE_MODEL_ORDER,
      ].map((p) => p.getId()),
    ).toEqual([
      'LEFT_OUTLINE',
      'RIGHT_OUTLINE',
      'OUTLINE_MAX_DEPTH',
      'MIN_X',
      'MAX_X',
      'MIN_Y',
      'MAX_Y',
      'root',
      'EDGE_BEND_HEIGHT',
      'Node Model Order',
    ]);
  });

  it('have no default value: an unset property reads null', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(node.getProperty(InternalProperties.MIN_X)).toBeNull();
    expect(node.hasProperty(InternalProperties.MIN_X)).toBe(false);
  });
});
