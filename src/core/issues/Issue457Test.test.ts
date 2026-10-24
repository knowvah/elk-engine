// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.core.test Issue457Test: the box layouter must not ignore a minimum size when paddings are
 * active. `@Algorithm(BoxLayouterOptions.ALGORITHM_ID)` + `@Configurator` become the harness arguments.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/issues/Issue457Test.java
 */
import { describe, expect, it } from 'vitest';
import { layoutElkt } from '../../../test/helpers/elkt-layout-harness.js';
import { KVector } from '../math/KVector.js';
import { BoxLayouterOptions } from '../options/BoxLayouterOptions.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import type { ElkNode } from '../../graph/ElkNode.js';

const MODEL = 'tickets/core/457_boxLayouterIgnoresMinimumSize.elkt';
const MIN_SIZE = 60;
const CHILD_SIZE = 5;
const TOLERANCE = 1;

function configureMinSize(graph: ElkNode): void {
  // Set the minimum size of the nodes on the top level
  for (const node of graph.getChildren()) {
    node.setProperty(BoxLayouterOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.minimumSize());
    node.setProperty(BoxLayouterOptions.NODE_SIZE_MINIMUM, new KVector(MIN_SIZE, MIN_SIZE));

    // Make sure the nodes in there are small
    for (const child of node.getChildren()) {
      child.setDimensions(CHILD_SIZE, CHILD_SIZE);
    }
  }
}

describe('Issue457Test', () => {
  it('testProperLabelCoordinates', () => {
    const graph = layoutElkt(MODEL, BoxLayouterOptions.ALGORITHM_ID, configureMinSize);
    expect(graph.getChildren().size()).toBeGreaterThan(0);
    for (const node of graph.getChildren()) {
      expect(Math.abs(node.getWidth() - MIN_SIZE)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(node.getHeight() - MIN_SIZE)).toBeLessThanOrEqual(TOLERANCE);
    }
  });
});
