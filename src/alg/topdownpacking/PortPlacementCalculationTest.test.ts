// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, it } from 'vitest';
import { LayoutConfigurator } from '../../core/LayoutConfigurator.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { LayoutAlgorithmResolver } from '../../core/data/LayoutAlgorithmResolver.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { TopdownNodeTypes } from '../../core/options/TopdownNodeTypes.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';

/**
 * Test interaction between top-down layout and the node size calculation performed for port placement in layered
 * layout. Java package `org.eclipse.elk.alg.topdown.layered.test`; colocated with the other topdown suites (PK10).
 *
 * @see org.eclipse.elk.alg.topdown.test/src/org/eclipse/elk/alg/topdown/layered/test/PortPlacementCalculationTest.java
 */

/** JUnit `assertEquals(double expected, double actual, double delta)`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  assertEqualsWithin('', expected, actual, delta);
}

/**
 * Java `PlainJavaInitialization.initializePlainJavaLayout()`: the metadata service registers every algorithm on the
 * class path; these tests run layered (the default algorithm), so layered is registered (PK10).
 */
function initializePlainJavaLayout(): void {
  registerLayered();
}

/** The Java `try { engine.layout(...) } catch (UnsupportedGraphException e) { fail(e.toString()); }` block. */
function layoutWithEngine(graph: ElkNode): void {
  // prepare layout engine
  const config = new LayoutConfigurator();
  ElkUtil.applyVisitors(graph, config, new LayoutAlgorithmResolver());
  // call layout with layout engine
  try {
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  } catch (exception) {
    if (exception instanceof UnsupportedGraphException) {
      throw new Error(`fail: ${String(exception)}`);
    }
    throw exception;
  }
}

describe('PortPlacementCalculationTest', () => {
  /** Tests that during a bottom-up layout the port positions are calculated according to the minimum size they require. */
  it('testBottomUp', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();

    const portSpacing = 10.0;

    const node = ElkGraphUtil.createNode(graph);
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS, SizeConstraint.PORTS));
    node.setProperty(CoreOptions.SPACING_PORT_PORT, portSpacing);
    node.setDimensions(20, 60);

    // create three ports that would require less than 60 height
    const port1 = ElkGraphUtil.createPort(node);
    const port2 = ElkGraphUtil.createPort(node);
    const port3 = ElkGraphUtil.createPort(node);

    layoutWithEngine(graph);

    assertEquals(portSpacing, Math.abs(port1.getY() - port2.getY()), 0.0001);
    assertEquals(portSpacing, Math.abs(port2.getY() - port3.getY()), 0.0001);
  });

  /**
   * Tests that during a top-down layout the actually set node size is considered beside the port placement
   * requirements. If the node is already larger the ports will need to be placed further apart.
   */
  it('testTopDown', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const portSpacing = 10.0;
    const fixedNodeHeight = 60.0;

    const node = ElkGraphUtil.createNode(graph);
    node.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    node.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    node.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS, SizeConstraint.PORTS));
    node.setProperty(CoreOptions.SPACING_PORT_PORT, portSpacing);
    node.setDimensions(20, fixedNodeHeight);

    // create three ports that would require less than 60 height
    const port1 = ElkGraphUtil.createPort(node);
    const port2 = ElkGraphUtil.createPort(node);
    const port3 = ElkGraphUtil.createPort(node);

    layoutWithEngine(graph);

    // Since the node size is fixed, the port spacing should now be the height
    // divided by the number of ports plus one
    const expectedPortSpacing = fixedNodeHeight / 4;
    assertEquals(expectedPortSpacing, Math.abs(port1.getY() - port2.getY()), 0.0001);
    assertEquals(expectedPortSpacing, Math.abs(port2.getY() - port3.getY()), 0.0001);
  });
});
