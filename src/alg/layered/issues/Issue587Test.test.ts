// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test Issue587Test: the polyline/splines NPE. The `@GraphResourceProvider`,
 * the three `@Configurator`s and `@DefaultConfiguration()` go through the layout test runner; the Java has one
 * test, `testNoException`, whose pass is that layout raised no exception (3 oracle runs).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue587Test.java
 */
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

defineLayoutTest({
  name: 'Issue587Test',
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/**', filter: /587.+\.elkt/ }],
  configurators: {
    configureOrthogonalEdgeRouting: (graph: ElkNode): void => {
      graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
    },
    configurePolylineEdgeRouting: (graph: ElkNode): void => {
      graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.POLYLINE);
    },
    configureSplineEdgeRouting: (graph: ElkNode): void => {
      graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.SPLINES);
    },
  },
  afterLayout: {
    testNoException: (): void => {
      // The bug caused an exception; nothing particular to test here
    },
  },
});
