// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue405Test: for four copies of a node laid out in the four directions, port and port label positions must
 * match pairwise (exactly one match each). `getRelevantPortsAndPortLabels` (public in the Java for
 * Issue405_2Test) is in test/helpers/issue405-support.ts.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue405Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { fuzzyEquals } from '../../../guava/DoubleMath.js';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkShape } from '../../../graph/ElkShape.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { getRelevantPortsAndPortLabels } from '../../../../test/helpers/issue405-support.js';

const DOUBLE_EPSILON = 10e-4;
const TOP_NODES: readonly string[] = ['Right', 'Down', 'Left', 'Up'];

function checkPositionEquals(first: ElkShape, second: ElkShape): boolean {
  return (
    fuzzyEquals(first.getX(), second.getX(), DOUBLE_EPSILON) && fuzzyEquals(first.getY(), second.getY(), DOUBLE_EPSILON)
  );
}

function positionsDontMatchErrorMessage(
  fixedElement: ElkGraphElement,
  otherElements: readonly ElkGraphElement[],
): string {
  let message = `${fixedElement.toString()} of graph ${String(ElkGraphUtil.containingGraph(fixedElement))} has not exactly one matching element in graph ${String(ElkGraphUtil.containingGraph(otherElements[0]!))}`;

  // List all other elements
  for (const matchingElement of otherElements) {
    message += `\n- ${matchingElement.toString()}`;
  }

  return message;
}

function checkExactlyOneMatch<T extends ElkShape & ElkGraphElement>(
  previous: readonly T[],
  current: readonly T[],
): void {
  for (const element of previous) {
    // For the previous node's element, find all of the current node's elements that match its position
    const matching = current.filter((other) => checkPositionEquals(element, other));
    if (matching.length !== 1) {
      // We expected there to be exactly one such element!
      expect.fail(positionsDontMatchErrorMessage(element, current));
    }
  }
}

defineLayoutTest({
  name: 'Issue405Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [
    { path: 'tickets/layered/405_differentPortLabelPositionsNSWEInside.elkt' },
    { path: 'tickets/layered/405_differentPortLabelPositionsNSWEOutsideNextToPort.elkt' },
    { path: 'tickets/layered/405_differentPortLabelPositionsTwoWestOutside.elkt' },
  ],
  afterLayout: {
    testPortAndLabelPositionsEqual: (graph: ElkNode): void => {
      // Check for each subsequent pair of the "layout-direction nodes" that their ports and labels match.
      const relevant = TOP_NODES.map((name) => getRelevantPortsAndPortLabels(graph, name));
      for (let i = 1; i < relevant.length; i++) {
        const previous = relevant[i - 1]!;
        const current = relevant[i]!;
        checkExactlyOneMatch(previous[0], current[0]);
        checkExactlyOneMatch(previous[1], current[1]);
      }
    },
  },
});
