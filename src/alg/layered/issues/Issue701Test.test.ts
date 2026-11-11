// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue701Test: port label positions according to their `PortLabelPlacement` (INSIDE, OUTSIDE and "FIXED") and the
 * node sizes that follow from them. Java: one `@GraphResourceProvider` (`tickets/layered/701_portLabels.elkt`), six
 * `@Test` methods, neither `@Algorithm` nor `@DefaultConfiguration` (6 oracle runs); the model is vendored under
 * `compound/` (mission 7h, T1).
 *
 * Statements the Java assigns to locals it never reads (`node2Bis`, `portOfNode2Bis`, `node2BisPort1/2`) stay as calls: the
 * lookups throw when the node or port is missing.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue701Test.java
 */
import { describe, expect, it } from 'vitest';
import { getChild, getPort } from '../../../../test/helpers/graph-test-navigation.js';
import { haveOverlaps } from '../../../../test/helpers/graph-test-utils.js';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
} from '../../../../test/helpers/layout-test-runner.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import { IndividualSpacings } from '../../../core/util/IndividualSpacings.js';
import { ElkGraphAdapters } from '../../../core/util/adapters/ElkGraphAdapters.js';
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const GRAPHS = [
  // vendored under `compound/`; the models repository holds it at the Java path
  { path: 'compound/tickets/layered/701_portLabels.elkt' },
  { path: 'tickets/layered/701_portLabels.elkt' },
] as const;

const CONTAINER_WIDTH_MESSAGE = 'Wrong node width according to ports label width.';
const NODE_WIDTH_MESSAGE = 'Wrong node width according to port(s) label width.';
const NODE_HEIGHT_MESSAGE = 'Wrong node height according to port label height.';
const NODE_LABEL_MESSAGE = 'Wrong node label location.';

function fail(message: string): never {
  throw new Error(message);
}

function portSpacing(node: ElkNode): number {
  return IndividualSpacings.getIndividualOrInherited(node, CoreOptions.SPACING_PORT_PORT)!;
}

function absoluteY(element: ElkNode | ElkLabel): number {
  return ElkUtil.absolutePosition(element)!.y;
}

/**
 * Ensure that the width of the node is as expected according to the port width.
 *
 * @param oppositePort optional port on the opposite side, can be null
 * @param eastOrWestSide true if the port is on EAST or WEST side, false otherwise
 */
function assertNodeWidthAccordingToPortWidth(
  node: ElkNode,
  port: ElkPort,
  oppositePort: ElkPort | null,
  eastOrWestSide: boolean,
): void {
  const portLabelWidth = port.getLabels().get(0).getWidth();
  const oppositePortLabelWidth = oppositePort === null ? 0 : oppositePort.getLabels().get(0).getWidth();
  const spacingBetweenPort = portSpacing(node);

  if (!eastOrWestSide) {
    // Check node width according to port label width
    // The spacing between port has added on each side in HorizontalPortPlacementSizeCalculator
    // .calculateHorizontalNodeSizeRequiredByFreePorts(NodeContext, PortSide)
    assertEqualsWithin(
      NODE_WIDTH_MESSAGE,
      spacingBetweenPort + Math.max(portLabelWidth, oppositePortLabelWidth) + spacingBetweenPort,
      node.getWidth(),
      0,
    );
  } else {
    const spacingLabelPort = port.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
    const spacingLabelOppositePort =
      oppositePort === null ? 0 : oppositePort.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
    const portBorderOffset = port.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    const oppositePortBorderOffset =
      oppositePort === null ? 0 : oppositePort.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    const nodeLabel = node.getLabels().get(0);
    const nodeLabelPadding = node.getProperty(CoreOptions.NODE_LABELS_PADDING);
    // Compute expected width
    let expectedWidth = nodeLabelPadding.getLeft();
    // the label size is added twice for the symmetry
    expectedWidth += Math.max(spacingLabelPort + portLabelWidth, spacingLabelOppositePort + oppositePortLabelWidth) * 2;
    expectedWidth += nodeLabel.getWidth();
    expectedWidth += nodeLabelPadding.getRight();
    expectedWidth += -portBorderOffset;
    expectedWidth += -oppositePortBorderOffset;
    assertEqualsWithin(NODE_WIDTH_MESSAGE, expectedWidth, node.getWidth(), 0);
  }
}

/**
 * Ensure that the height of the node is as expected according to the port height, and that the node label location is as
 * expected.
 *
 * @param oppositePort optional port on the opposite side, can be null
 * @param eastOrWestSide true if the port is on EAST or WEST side, false otherwise
 */
function assertNodeHeightAccordingToPortHeight(
  node: ElkNode,
  port: ElkPort,
  oppositePort: ElkPort | null,
  eastOrWestSide: boolean,
): void {
  const portLabelHeight = ElkUtil.getLabelsBounds(ElkGraphAdapters.adaptSinglePort(port)).height;
  const oppositePortLabelHeight =
    oppositePort === null ? 0 : ElkUtil.getLabelsBounds(ElkGraphAdapters.adaptSinglePort(oppositePort)).height;
  const oppositePortHeight = oppositePort === null ? 0 : oppositePort.getHeight();
  const nodePadding = node.getProperty(CoreOptions.PADDING);
  const nodeLabel = node.getLabels().get(0);
  const nodeLabelPadding = node.getProperty(CoreOptions.NODE_LABELS_PADDING);
  const spacingBetweenPort = portSpacing(node);

  if (eastOrWestSide) {
    // Check node height according to port height (the max of label or port)
    // The spacing between port has added on each side in VerticalPortPlacementSizeCalculator
    // .calculateVerticalNodeSizeRequiredByFreePorts(NodeContext, PortSide)
    const portHeightPlusPadding = Math.max(
      spacingBetweenPort + portLabelHeight + spacingBetweenPort,
      Math.max(spacingBetweenPort, nodePadding.getTop()) +
        port.getHeight() +
        Math.max(spacingBetweenPort, nodePadding.getBottom()),
    );
    const oppositePortHeightPlusPadding = Math.max(
      spacingBetweenPort + oppositePortLabelHeight + spacingBetweenPort,
      Math.max(spacingBetweenPort, nodePadding.getTop()) +
        oppositePortHeight +
        Math.max(spacingBetweenPort, nodePadding.getBottom()),
    );

    assertEqualsWithin(
      NODE_HEIGHT_MESSAGE,
      Math.max(portHeightPlusPadding, oppositePortHeightPlusPadding),
      node.getHeight(),
      0,
    );
    assertEqualsWithin(NODE_LABEL_MESSAGE, absoluteY(node) + nodeLabelPadding.getTop(), absoluteY(nodeLabel), 0);
  } else {
    const spacingLabelPortVertical = port.getProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL);
    const spacingLabelOppositePortVertical =
      oppositePort === null ? 0 : oppositePort.getProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL);
    const portBorderOffset = port.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    const oppositePortBorderOffset =
      oppositePort === null ? 0 : oppositePort.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    let expectedHeight = -portBorderOffset;
    expectedHeight += -oppositePortBorderOffset;
    // the label size is added twice for the symmetry
    expectedHeight +=
      Math.max(spacingLabelPortVertical + portLabelHeight, spacingLabelOppositePortVertical + oppositePortLabelHeight) *
      2;
    expectedHeight += nodeLabelPadding.getTop();
    // A free space equals to the node label height is kept.
    expectedHeight += nodeLabel.getHeight() * 2;
    expectedHeight += nodeLabelPadding.getBottom();
    assertEqualsWithin(NODE_HEIGHT_MESSAGE, expectedHeight, node.getHeight(), 0);

    const portSide = port.getProperty(LayeredOptions.PORT_SIDE);
    if (portSide === PortSide.NORTH) {
      // The port is on the north side, the node label is just under the port label
      assertEqualsWithin(
        NODE_LABEL_MESSAGE,
        absoluteY(port.getLabels().get(0)) + portLabelHeight + nodeLabelPadding.getTop(),
        absoluteY(nodeLabel),
        0,
      );
    } else if (portSide === PortSide.SOUTH) {
      // The port is on the south side, for symmetry a space is let above node label (same as port label)
      assertEqualsWithin(
        NODE_LABEL_MESSAGE,
        absoluteY(node) +
          portLabelHeight +
          port.getProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL) +
          nodeLabelPadding.getTop(),
        absoluteY(nodeLabel),
        0,
      );
    }
  }
}

function assembleLabels(node: ElkNode): ElkLabel[] {
  const labels: ElkLabel[] = [];

  // Add all node labels
  labels.push(...node.getLabels());
  // Add all ports labels
  for (const port of node.getPorts()) {
    labels.push(...port.getLabels());
  }
  // Recusivly add children labels
  for (const childNode of node.getChildren()) {
    labels.push(...assembleLabels(childNode));
  }

  return labels;
}

/**
 * Check behavior for port labels that is forced to be inside the node according to `PortLabelPlacement.INSIDE` property.
 */
function testInsideLabels(graph: ElkNode): void {
  const containerForInsideLabels = getChild(
    graph,
    'ContainerWithLabelsInsideAndOutside',
    'Container_OneBorderNode_LabelInside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForInsideLabels))) {
    fail('Overlaps between labels detected in "Container_OneBorderNode_LabelInside"!');
  }

  // Port on north
  const node1 = getChild(containerForInsideLabels, 'MyNode1');
  const portOfNode1 = getPort(node1, 'P1');
  assertNodeWidthAccordingToPortWidth(node1, portOfNode1, null, false);
  assertNodeHeightAccordingToPortHeight(node1, portOfNode1, null, false);

  // Port on south
  const node3 = getChild(containerForInsideLabels, 'MyNode3');
  const portOfNode3 = getPort(node3, 'P1');
  assertNodeWidthAccordingToPortWidth(node3, portOfNode3, null, false);
  assertNodeHeightAccordingToPortHeight(node3, portOfNode3, null, false);

  // Port on east
  const node2 = getChild(containerForInsideLabels, 'MyNode2');
  const portOfNode2 = getPort(node2, 'P1');
  assertNodeHeightAccordingToPortHeight(node2, portOfNode2, null, true);
  assertNodeWidthAccordingToPortWidth(node2, portOfNode2, null, true);

  // Port on west
  const node4 = getChild(containerForInsideLabels, 'MyNode4');
  const portOfNode4 = getPort(node4, 'P1');
  assertNodeWidthAccordingToPortWidth(node4, portOfNode4, null, true);
  assertNodeHeightAccordingToPortHeight(node4, portOfNode4, null, true);
}

/**
 * Check behavior for port labels that is forced to be outside the node according to `PortLabelPlacement.OUTSIDE` property.
 */
function testOutsideLabels(graph: ElkNode): void {
  const containerForOutsideLabels = getChild(
    graph,
    'ContainerWithLabelsInsideAndOutside',
    'Container_OneBorderNode_LabelOutside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForOutsideLabels))) {
    fail('Overlaps between labels detected in "Container_OneBorderNode_LabelOutside"!');
  }

  // TODO (Java): To complete. I'm not sure that the current behavior is OK. Maybe to review for
  // https://github.com/eclipse-elk/elk/issues/638.
  // Here, we should have similar tests than in testInsideLabels.
}

/**
 * The width of `cont3` (a container with ports on its east and west sides and a node inside, linked to the ports) from its
 * ports' labels; the Java computes it inline in both mix tests.
 */
function expectedCont3Width(cont3: ElkNode): number {
  const cont3Node2 = getChild(cont3, 'MyNode2');
  const cont3Port1 = getPort(cont3, 'P1');
  const cont3Port1Label = cont3Port1.getLabels().get(0);
  const cont3Port2 = getPort(cont3, 'P2');
  const cont3Port2Label = cont3Port2.getLabels().get(0);
  const spacingLabelCont3Port1 = cont3Port1.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
  const spacingLabelCont3Port2 = cont3Port2.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
  const cont3Port1BorderOffset = cont3Port1.getProperty(CoreOptions.PORT_BORDER_OFFSET);
  const cont3Port2BorderOffset = cont3Port2.getProperty(CoreOptions.PORT_BORDER_OFFSET);
  const cont3Padding = cont3.getProperty(CoreOptions.PADDING);
  // Compute expected width
  let expected = cont3Padding.getLeft();
  // TODO (Java): It seems to be a bug here. There is only 4 pixels instead of 12
  expected -= 8;
  expected += cont3Node2.getWidth();
  expected += -cont3Port2BorderOffset;
  expected += spacingLabelCont3Port2;
  expected += cont3Port2Label.getWidth();
  expected += cont3Port1Label.getWidth();
  expected += spacingLabelCont3Port1;
  expected += -cont3Port1BorderOffset;
  expected += cont3Padding.getRight();
  return expected;
}

/**
 * The width of `cont4` (a port on the east side of a node in the container, a port on the west side of the container,
 * and an edge between the ports) from its ports' labels.
 */
function expectedCont4Width(cont4: ElkNode): number {
  const cont4Node1 = getChild(cont4, 'MyNode1');
  const cont4Node1Port1 = getPort(cont4Node1, 'P1');
  const cont4Node1Port1Label = cont4Node1Port1.getLabels().get(0);
  const cont4Port1 = getPort(cont4, 'P1');
  const cont4Port1Label = cont4Port1.getLabels().get(0);
  const spacingLabelCont4Node1Port1 = cont4Node1Port1.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
  const spacingLabelCont4Port1 = cont4Port1.getProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL);
  const cont4Node1Port1BorderOffset = cont4Node1Port1.getProperty(CoreOptions.PORT_BORDER_OFFSET);
  const cont4Port1BorderOffset = cont4Port1.getProperty(CoreOptions.PORT_BORDER_OFFSET);
  const cont4Padding = cont4.getProperty(CoreOptions.PADDING);
  // Compute expected width
  let expected = cont4Padding.getLeft();
  expected += cont4Node1.getWidth();
  // TODO (Java): ElkUtil.calcPortOffset(cont4Node1Port1, PortSide.EAST); is supposed to do the same computing as below
  // but it is not the case
  expected += cont4Node1Port1.getWidth() + cont4Node1Port1BorderOffset;
  expected += spacingLabelCont4Node1Port1;
  expected += cont4Node1Port1Label.getWidth();
  expected += cont4Port1Label.getWidth();
  expected += spacingLabelCont4Port1;
  expected += -cont4Port1BorderOffset;
  expected += cont4Padding.getRight();
  return expected;
}

/**
 * Check behavior for port labels that is forced to be inside or outside the node according to `PortLabelPlacement`
 * property, with more complex cases than `testInsideLabels` and `testOutsideLabels`.
 */
function testMixInsideAndOutsideLabels(graph: ElkNode): void {
  const containerForMixInsideOutsideLabels = getChild(
    graph,
    'ContainerWithLabelsInsideAndOutside',
    'Container_SeveralBorderNodes_LabelInsideAndOutside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForMixInsideOutsideLabels))) {
    // TODO (Java): Check deactivated because it fails for "MyCont2": case with 2 border nodes without edges. Maybe to
    // review for https://github.com/eclipse-elk/elk/issues/638.
    // fail('Overlaps between labels detected in "Container_SeveralBorderNodes_LabelInsideAndOutside"!');
  }

  // Ports on north and on south sides
  const node1 = getChild(containerForMixInsideOutsideLabels, 'MyNode1');
  const node1Port1 = getPort(node1, 'P1');
  const node1Port2 = getPort(node1, 'P2');
  assertNodeWidthAccordingToPortWidth(node1, node1Port1, node1Port2, false);
  assertNodeHeightAccordingToPortHeight(node1, node1Port1, node1Port2, false);
  // Ports on east and on west sides
  const node2 = getChild(containerForMixInsideOutsideLabels, 'MyNode2');
  const node2Port1 = getPort(node2, 'P1');
  const node2Port2 = getPort(node2, 'P2');
  assertNodeWidthAccordingToPortWidth(node2, node2Port1, node2Port2, true);
  assertNodeHeightAccordingToPortHeight(node2, node2Port1, node2Port2, true);
  // Ports on east and on west sides with a node inside the container without edge
  // TODO (Java): Ignored. The behavior seems KO. Maybe to review for https://github.com/eclipse-elk/elk/issues/638.
  // Ports on east and on west sides with a node inside the container and linked to the ports, check width of the
  // container
  const cont3 = getChild(containerForMixInsideOutsideLabels, 'MyCont3');
  assertEqualsWithin(CONTAINER_WIDTH_MESSAGE, expectedCont3Width(cont3), cont3.getWidth(), 0);
  // Port on east side on a node in container, port on west side of the container, and with edge between ports,
  // check width of the container
  const cont4 = getChild(containerForMixInsideOutsideLabels, 'MyCont4');
  assertEqualsWithin(CONTAINER_WIDTH_MESSAGE, expectedCont4Width(cont4), cont4.getWidth(), 0);
}

/**
 * Check behavior for port labels that is fixed, empty `PortLabelPlacement` property, but partially located inside the node.
 */
function testFixedInsideLabels(graph: ElkNode): void {
  const containerForInsideLabels = getChild(
    graph,
    'ContainerWithFixedLabels',
    'Container_OneBorderNode_LabelFixedPartiallyInside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForInsideLabels))) {
    fail('Overlaps between labels detected in "Container_OneBorderNode_LabelFixedPartiallyInside"!');
  }

  // Port on north
  const node1 = getChild(containerForInsideLabels, 'MyNode1');
  const portOfNode1 = getPort(node1, 'P1');
  assertNodeWidthAccordingToPortWidth(node1, portOfNode1, null, false);
  assertNodeHeightAccordingToPortHeight(node1, portOfNode1, null, false);

  // Port on south
  const node3 = getChild(containerForInsideLabels, 'MyNode3');
  const portOfNode3 = getPort(node3, 'P1');
  assertNodeWidthAccordingToPortWidth(node3, portOfNode3, null, false);
  assertNodeHeightAccordingToPortHeight(node3, portOfNode3, null, false);

  // Port on east
  const node2 = getChild(containerForInsideLabels, 'MyNode2');
  const portOfNode2 = getPort(node2, 'P1');
  assertNodeHeightAccordingToPortHeight(node2, portOfNode2, null, true);
  assertNodeWidthAccordingToPortWidth(node2, portOfNode2, null, true);

  // Port on east
  // TODO (Java): Specific case with label centered under the port
  getChild(containerForInsideLabels, 'MyNode2Bis'); // `node2Bis`, unused in the Java; the lookup can throw
  getPort(node2, 'P1'); // `portOfNode2Bis` (of node2, as in the Java), unused; the lookup can throw

  // Port on west
  const node4 = getChild(containerForInsideLabels, 'MyNode4');
  const portOfNode4 = getPort(node4, 'P1');
  assertNodeWidthAccordingToPortWidth(node4, portOfNode4, null, true);
  assertNodeHeightAccordingToPortHeight(node4, portOfNode4, null, true);

  // Port on west
  // TODO (Java): Specific case with label centered under the port
  const node4Bis = getChild(containerForInsideLabels, 'MyNode4Bis');
  getPort(node4Bis, 'P1'); // `portOfNode4Bis`, unused in the Java; the lookup can throw
}

/**
 * Check behavior for port labels that is fixed, empty `PortLabelPlacement` property, but located outside the node.
 */
function testFixedOutsideLabels(graph: ElkNode): void {
  const containerForOutsideLabels = getChild(
    graph,
    'ContainerWithFixedLabels',
    'Container_OneBorderNode_LabelFixedOutside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForOutsideLabels))) {
    fail('Overlaps between labels detected in "Container_OneBorderNode_LabelFixedOutside"!');
  }

  // Port on north
  const node1 = getChild(containerForOutsideLabels, 'MyNode1');
  const portOfNode1 = getPort(node1, 'P1');
  assertNodeWidthAccordingToPortWidth(node1, portOfNode1, null, false);
  // No real effect on the height to check

  // Port on south
  const node3 = getChild(containerForOutsideLabels, 'MyNode3');
  const portOfNode3 = getPort(node3, 'P1');
  assertNodeWidthAccordingToPortWidth(node3, portOfNode3, null, false);
  // No real effect on the height to check

  // Port on east
  const node2 = getChild(containerForOutsideLabels, 'MyNode2');
  const portOfNode2 = getPort(node2, 'P1');
  // No real effect on the width to check
  assertNodeHeightAccordingToPortHeight(node2, portOfNode2, null, true);

  // Port on west
  const node4 = getChild(containerForOutsideLabels, 'MyNode4');
  const portOfNode4 = getPort(node4, 'P1');
  // No real effect on the width to check
  assertNodeHeightAccordingToPortHeight(node4, portOfNode4, null, true);
}

/**
 * Check behavior for port labels that is fixed, empty `PortLabelPlacement` property, located inside or outside the node,
 * with more complex cases than `testFixedInsideLabels` and `testFixedOutsideLabels`.
 */
function testFixedMixInsideAndOutsideLabels(graph: ElkNode): void {
  const containerForMixInsideOutsideLabels = getChild(
    graph,
    'ContainerWithFixedLabels',
    'Container_SeveralBorderNodes_LabelFixedPartiallyInside',
  );
  // Ensure there is no label overlaps
  if (haveOverlaps(assembleLabels(containerForMixInsideOutsideLabels))) {
    fail('Overlaps between labels detected in "Container_SeveralBorderNodes_LabelFixedPartiallyInside"!');
  }

  // Ports on north and on south sides
  const node1 = getChild(containerForMixInsideOutsideLabels, 'MyNode1');
  const node1Port1 = getPort(node1, 'P1');
  const node1Port2 = getPort(node1, 'P2');
  assertNodeWidthAccordingToPortWidth(node1, node1Port1, node1Port2, false);
  // TODO (Java): Probably a bug here (not same result as INSIDE): 12 pixels of difference; padding?
  // Ports on east and on west sides
  const node2 = getChild(containerForMixInsideOutsideLabels, 'MyNode2');
  const node2Port1 = getPort(node2, 'P1');
  const node2Port2 = getPort(node2, 'P2');
  // TODO (Java): Probably a bug here (not same result as INSIDE): 8 pixels of difference; port border offset?
  assertNodeHeightAccordingToPortHeight(node2, node2Port1, node2Port2, true);
  // TODO (Java): Specific case with label centered under the port
  // Ports on east and on west sides with label centered under the port
  getChild(containerForMixInsideOutsideLabels, 'MyNode2Bis'); // `node2Bis`, unused in the Java; the lookup can throw
  getPort(node2, 'P1'); // `node2BisPort1` (of node2, as in the Java), unused; the lookup can throw
  getPort(node2, 'P2'); // `node2BisPort2` (of node2, as in the Java), unused; the lookup can throw
  // Ports on east and on west sides with a node inside the container without edge
  // TODO (Java): Ignored. The behavior seems KO. Maybe to review for https://github.com/eclipse-elk/elk/issues/638.
  // Ports on east and on west sides with a node inside the container and linked to the ports, check width of the
  // container
  const cont3 = getChild(containerForMixInsideOutsideLabels, 'MyCont3');
  // The Java first computes the width from the ports' labels, then overrides it: "Test to review as the labels are centered
  // under the ports (constant 248 is used instead of above computation)". The computation reads the model, so it stays.
  expectedCont3Width(cont3);
  assertEqualsWithin(CONTAINER_WIDTH_MESSAGE, 248, cont3.getWidth(), 0);
  // Port on east side on a node in container, port on west side of the container, and with edge between ports,
  // check width of the container
  const cont4 = getChild(containerForMixInsideOutsideLabels, 'MyCont4');
  // As above: "constant 312.5 is used instead of above computation"
  expectedCont4Width(cont4);
  assertEqualsWithin(CONTAINER_WIDTH_MESSAGE, 312.5, cont4.getWidth(), 0);
}

const SPEC: LayoutTestSpec = {
  name: 'Issue701Test',
  graphs: GRAPHS,
  afterLayout: {
    testInsideLabels,
    testOutsideLabels,
    testMixInsideAndOutsideLabels,
    testFixedInsideLabels,
    testFixedOutsideLabels,
    testFixedMixInsideAndOutsideLabels,
  },
};

defineLayoutTest(SPEC);

describe('Issue701Test (non-vacuity)', () => {
  it('runs 6 cases (the oracle runs)', () => {
    expect(buildLayoutTests(SPEC).length).toBe(6);
  });

  it('(non-vacuity) the six methods run on one graph whose port labels are sized and whose containers are sized', () => {
    const seen = { runs: 0, labels: 0, sizedLabels: 0, ports: 0, minContainerWidth: Number.POSITIVE_INFINITY };
    const cases = buildLayoutTests({
      ...SPEC,
      afterLayout: {
        count: (graph) => {
          seen.runs += 1;
          const mix = getChild(
            graph,
            'ContainerWithLabelsInsideAndOutside',
            'Container_SeveralBorderNodes_LabelInsideAndOutside',
          );
          const labels = assembleLabels(mix);
          seen.labels = labels.length;
          seen.sizedLabels = labels.filter((label) => label.getWidth() > 0 && label.getHeight() > 0).length;
          seen.ports = getChild(mix, 'MyNode1').getPorts().size();
          seen.minContainerWidth = Math.min(getChild(mix, 'MyCont3').getWidth(), getChild(mix, 'MyCont4').getWidth());
        },
      },
    });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(1);
    expect(seen.runs).toBe(1);
    expect(seen.labels).toBeGreaterThan(0);
    expect(seen.sizedLabels).toBe(seen.labels);
    expect(seen.ports).toBe(2);
    expect(seen.minContainerWidth).toBeGreaterThan(0);
  });
});
