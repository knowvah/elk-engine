// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue665Test: layered does not throw an `UnsupportedGraphException` on import. Java: `@DefaultConfiguration()`
 * (no `@Algorithm`), one `@GraphResourceProvider` (`tickets/layered/**` filtered by `665.+\.elkt`), one empty `@Test`
 * (1 oracle run).
 *
 * The only model, `tickets/layered/665_includeChildrenDoesntStop.elkt`, lays a child out with `elk.stress`. Mission 7h
 * held it back (H13) until stress was ported; the maintainer's ruling on issue #58 removed the hold-back, so the case
 * runs: the runner registers `elk.stress` as `PlainJavaInitialization` does, and the model is vendored under `compound/`.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue665Test.java
 */
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds it at the Java path
  { path: 'compound/tickets/layered/**', filter: /665.+\.elkt/ },
  { path: 'tickets/layered/**', filter: /665.+\.elkt/ },
] as const;

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

defineLayoutTest(SPEC);

describe('Issue665Test (non-vacuity)', () => {
  it('runs 1 case (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(1);
  });
});
