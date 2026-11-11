// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue665Test: layered does not throw an `UnsupportedGraphException` on import. Java: `@DefaultConfiguration()`
 * (no `@Algorithm`), one `@GraphResourceProvider` (`tickets/layered/**` filtered by `665.+\.elkt`), one empty `@Test`
 * (1 oracle run).
 *
 * H13: the only model, `tickets/layered/665_includeChildrenDoesntStop.elkt`, lays a child out with `elk.stress`, which has
 * no TypeScript port (issue #58); it is dropped through `STRESS_PENDING`, so the suite has 0 cases here and is reported as
 * skipped, never as failing. The provider and the `@Test` method stay as in the Java.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue665Test.java
 */
import { describe, it } from 'vitest';
import { defineLayoutTest, type LayoutTestSpec } from '../../../../test/helpers/layout-test-runner.js';
import {
  ISSUE665_GRAPHS,
  STRESS_PENDING_ISSUE,
  vendored,
  withoutStressPending,
} from '../../../../test/helpers/stress-pending.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const GRAPHS = withoutStressPending([...ISSUE665_GRAPHS, ...ISSUE665_GRAPHS.map(vendored)]);

function test(_graph: ElkNode): void {
  // We're not actually testing anything here, we're just hoping that Layered doesn't throw an
  // UnsupportedGraphException during import
}

const SPEC: LayoutTestSpec = {
  name: 'Issue665Test',
  defaultConfiguration: true,
  graphs: GRAPHS,
  afterLayout: { test },
};

if (GRAPHS.length === 0) {
  describe('Issue665Test', () => {
    it.skip(`has no case left: its only model needs elk.stress (STRESS_PENDING, ${STRESS_PENDING_ISSUE})`, () => {
      // pending the elk.stress port
    });
  });
} else {
  defineLayoutTest(SPEC);
}
