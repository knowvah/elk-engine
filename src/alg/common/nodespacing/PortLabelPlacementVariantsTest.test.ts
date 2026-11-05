// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.common.test PortLabelPlacementVariantsTest: the variants of port label placement
 * configurable through `PortLabelPlacement` (`@DefaultConfiguration(nodes = true, ports = true)`). 12 `@Test` methods
 * over the vendored `tests/core/label_placement/port_labels/variants.elkt`, once per active `@ConfiguratorProvider`
 * (`westSidePorts`, `eastSidePorts`; the NORTH and SOUTH providers are commented out in the Java), so 24 oracle runs.
 * Scope: complete (24 cases). A `LayoutConfigurator` provider is a `configurators` entry that applies it as
 * `ConfiguratorTestConfiguration.applyBaseConfiguration` does, `ElkUtil.applyVisitors(graph, configurator)`.
 *
 * Labels are sized from the recorded JVM metrics, as the Java framework does (FX8, `layout-test-labels.ts`).
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/nodespacing/PortLabelPlacementVariantsTest.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { LayoutConfigurator } from '../../../core/LayoutConfigurator.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import { ElkPortImpl } from '../../../graph/impl/ElkPortImpl.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ECollections } from '../../../emf/common/util/ECollections.js';
import { LayeredOptions } from '../../layered/options/LayeredOptions.js';

function configuratorFor(ps: PortSide): LayoutConfigurator {
  const config = new LayoutConfigurator();
  // By default this would override already set options
  config.configure(ElkPortImpl).setProperty(LayeredOptions.PORT_SIDE, ps);
  return config;
}

function getLabel(port: ElkPort): ElkLabel {
  return port.getLabels().get(0);
}

/** The label position along the port side: Y on east/west, X on north/south (labels are relative to the port). */
function labelPosition(port: ElkPort, label: ElkLabel): number {
  if (PortSide.SIDES_EAST_WEST.has(port.getProperty(CoreOptions.PORT_SIDE))) {
    return label.getY();
  } else if (PortSide.SIDES_NORTH_SOUTH.has(port.getProperty(CoreOptions.PORT_SIDE))) {
    return label.getX();
  }
  expect(false).toBe(true);
  return 0;
}

function assertBelowOrRight(port: ElkPort): void {
  const label = getLabel(port);
  // Note that port label positions are relative to the port
  const portPosition = labelPosition(port, label);
  expect(portPosition).toBeGreaterThan(0.0);
}

function assertAboveOrLeft(port: ElkPort): void {
  const label = getLabel(port);
  // Note that port label positions are relative to the port
  const portPosition = labelPosition(port, label);
  expect(portPosition).toBeLessThan(0.0);
}

function assertCentered(port: ElkPort): void {
  const label = getLabel(port);
  if (PortSide.SIDES_EAST_WEST.has(port.getProperty(CoreOptions.PORT_SIDE))) {
    const portCenter = port.getHeight() / 2.0;
    const labelCenter = label.getY() + label.getHeight() / 2.0;
    expect(labelCenter).toBe(portCenter);
  } else if (PortSide.SIDES_NORTH_SOUTH.has(port.getProperty(CoreOptions.PORT_SIDE))) {
    const portCenter = port.getWidth() / 2.0;
    const labelCenter = label.getX() + label.getWidth() / 2.0;
    expect(labelCenter).toBe(portCenter);
  } else {
    expect(false).toBe(true);
  }
}

function getPortsOfNode(parent: ElkNode, nodeId: string): ElkPort[] {
  const node = [...parent.getChildren()].find((n) => n.getIdentifier() === nodeId);
  if (node === undefined) {
    return [];
  }
  const ports = node.getPorts();
  // Sort the ports based on their index (which by definition is specified clock-wise).
  // For west and east sort them top-down, and for north and south sort them left-to-right.
  ECollections.sort(ports, (p1, p2) => {
    if (PortSide.SIDES_SOUTH_WEST.has(p1.getProperty(CoreOptions.PORT_SIDE))) {
      return p1.getProperty(LayeredOptions.PORT_INDEX) - p2.getProperty(LayeredOptions.PORT_INDEX);
    }
    return p2.getProperty(LayeredOptions.PORT_INDEX) - p1.getProperty(LayeredOptions.PORT_INDEX);
  });
  return [...ports];
}

/** The Java's `assertEquals("Unexpected test graph", expected, ports.size())`. */
function portsOf(graph: ElkNode, nodeId: string, expectedCount: number): ElkPort[] {
  const ports = getPortsOfNode(graph, nodeId);
  expect(ports.length, 'Unexpected test graph').toBe(expectedCount);
  return ports;
}

defineLayoutTest({
  name: 'PortLabelPlacementVariantsTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: { nodes: true, ports: true },
  graphs: [{ path: 'tests/core/label_placement/port_labels/variants.elkt' }],
  configurators: {
    westSidePorts: (graph: ElkNode): void => {
      ElkUtil.applyVisitors(graph, configuratorFor(PortSide.WEST));
    },
    // TODO activate if behavior for NORTH/SOUTH is consistent (Java: northSidePort, southSidePorts)
    eastSidePorts: (graph: ElkNode): void => {
      ElkUtil.applyVisitors(graph, configuratorFor(PortSide.EAST));
    },
  },
  afterLayout: {
    /* - - -  OUTSIDE - - -  */
    testOutsideTwoDefault: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'outside_two_default', 2);
      assertBelowOrRight(ports[0]!);
      assertAboveOrLeft(ports[1]!);
    },
    testOutsideTwoSameSide: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'outside_two_same_side', 2);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
    },
    testOutsideTwoNextToPort: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'outside_two_next_to_port', 2);
      assertCentered(ports[0]!);
      assertCentered(ports[1]!);
    },
    testOutsideThreeDefault: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'outside_three_default', 3);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
      assertBelowOrRight(ports[2]!);
    },
    testOutsideThreeSpaceEfficient: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'outside_three_space_efficient', 3);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
      assertAboveOrLeft(ports[2]!);
    },

    /* - - -  INSIDE - - -  */
    testInsideTwoDefault: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_two_default', 2);
      assertCentered(ports[0]!);
      assertCentered(ports[1]!);
    },
    testInsideTwoDefaultHierarchical: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_two_default_hierarchical', 2);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
    },
    testInsideTwoNextToPortHierarchical: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_two_next_to_port_hierarchical', 2);
      assertCentered(ports[0]!);
      assertCentered(ports[1]!);
    },
    testInsideTwoWithOneEdge: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_two_with_one_edge', 2);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
    },
    testInsideTwoWithOneEdgeNextToPort: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_two_with_one_edge_next_to_port', 2);
      // Unfortunately this test is not symmetric
      const portWithEdge = ports[0]!.getOutgoingEdges().isEmpty() ? ports[1]! : ports[0]!;
      const theOther = ports[0]!.getOutgoingEdges().isEmpty() ? ports[0]! : ports[1]!;
      assertBelowOrRight(portWithEdge);
      assertCentered(theOther);
    },
    testInsideThreeWithOneEdge: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_three_with_one_edge', 3);
      assertBelowOrRight(ports[0]!);
      assertBelowOrRight(ports[1]!);
      assertBelowOrRight(ports[2]!);
    },
    testInsideThreeWithOneEdgeNextToPort: (graph: ElkNode): void => {
      const ports = portsOf(graph, 'inside_three_with_one_edge_next_to_port', 3);
      assertCentered(ports[0]!);
      assertBelowOrRight(ports[1]!);
      assertCentered(ports[2]!);
    },
  },
});
