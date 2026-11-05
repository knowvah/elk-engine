// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue405_2Test: the 405 models that are not completely symmetric. Which coordinate is compared depends on
 * the port side, and the Java counts matches with `reduce(false, (a, b) -> a ^ b)`, an odd number of matches rather
 * than exactly one; the XOR is kept.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue405_2Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { fuzzyEquals } from '../../../guava/DoubleMath.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import { isElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { getRelevantPortsAndPortLabels } from '../../../../test/helpers/issue405-support.js';

const DOUBLE_EPSILON = 10e-4;
const TOP_NODES: readonly string[] = ['Right', 'Down', 'Left', 'Up'];

function checkPositionEquals(first: ElkPort | ElkLabel, second: ElkPort | ElkLabel): boolean {
  const ps = isElkLabel(first)
    ? (first.getParent() as ElkPort).getProperty(LayeredOptions.PORT_SIDE)
    : first.getProperty(LayeredOptions.PORT_SIDE);
  if (PortSide.SIDES_EAST_WEST.has(ps)) {
    return fuzzyEquals(first.getX(), second.getX(), DOUBLE_EPSILON);
  }
  return fuzzyEquals(first.getY(), second.getY(), DOUBLE_EPSILON);
}

function foundOddMatches(element: ElkPort | ElkLabel, others: readonly (ElkPort | ElkLabel)[]): boolean {
  return others.map((other) => checkPositionEquals(element, other)).reduce((a, b) => a !== b, false);
}

defineLayoutTest({
  name: 'Issue405_2Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [
    { path: 'tickets/layered/405_differentPortLabelPositionsNSWEOutside.elkt' },
    { path: 'tickets/layered/405_differentPortLabelPositionsTwoWestOutsideNextToPort.elkt' },
  ],
  afterLayout: {
    testPortAndLabelPositionsEqual: (graph: ElkNode): void => {
      const relevant = TOP_NODES.map((name) => getRelevantPortsAndPortLabels(graph, name));
      for (let i = 1; i < relevant.length; i++) {
        const previous = relevant[i - 1]!;
        const current = relevant[i]!;
        for (const port of previous[0]) {
          expect(foundOddMatches(port, current[0]), `Unexpected port position ${port.toString()}`).toBe(true);
        }
        for (const label of previous[1]) {
          expect(foundOddMatches(label, current[1]), `Unexpected port label position ${label.toString()}`).toBe(true);
        }
      }
    },
  },
});
