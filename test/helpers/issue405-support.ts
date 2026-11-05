// SPDX-License-Identifier: EPL-2.0
/*
 * Shared by Issue405Test and Issue405_2Test: `Issue405Test.getRelevantPortsAndPortLabels` is public in the Java for
 * the second suite. It lives outside the `.test.ts` file so that importing it does not register the first suite
 * again.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue405Test.java
 */
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';

function getElementWithId<T extends ElkGraphElement>(container: Iterable<T>, id: string): T {
  for (const element of container) {
    if (element.getIdentifier() === id) {
      return element;
    }
  }
  throw new Error('No value present');
}

/** `Pair<List<ElkPort>, List<ElkLabel>>` of the ports of node `N1` of `rootNodeName` and their labels. */
export function getRelevantPortsAndPortLabels(graph: ElkNode, rootNodeName: string): readonly [ElkPort[], ElkLabel[]] {
  const root = getElementWithId(graph.getChildren(), rootNodeName);
  const n1 = getElementWithId(root.getChildren(), 'N1');
  const ports = [...n1.getPorts()];
  return [ports, ports.flatMap((p) => [...p.getLabels()])];
}
