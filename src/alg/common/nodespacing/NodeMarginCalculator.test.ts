// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { marginFixture } from '../../../../test/helpers/node-margin-fixtures.js';
import { addPort, loadLayoutMetaData, nodeFixture } from '../../../../test/helpers/node-context-fixtures.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { NodeMarginCalculator } from './NodeMarginCalculator.js';

beforeAll(loadLayoutMetaData);

type Margins = readonly [top: number, bottom: number, left: number, right: number];

function marginsOf(node: ElkNode): Margins {
  const margin = node.getProperty(CoreOptions.MARGINS);
  return [margin.top, margin.bottom, margin.left, margin.right];
}

/*
 * Boxes of the fixture node (40x30 at (100, 50)), derived by hand from NodeMarginCalculator.java with label
 * spacing 4. Port label space is (-4 + label + 4) per OUTSIDE port label, at least 0.
 *
 *   node label       [105,125] x [25,35]
 *   EAST port        [138,140] x [60,62]   label [142,152] x [60,66]   TAIL [158,170] x [60,67]
 *                    (x = 138 + 2 + 4 + space 10 + 4)
 *   NORTH port       [120,122] x [48,50]   label [120,126] x [34,38]   HEAD [126,132] x [33,36]
 *                    (y = 48 - (4 + space 4 + 4 + 3))
 *   WEST port        [98,100] x [70,72]    HEAD [83,90] x [70,73]      (x = 98 - (4 + 0 + 4 + 7))
 *   SOUTH port       [110,112] x [80,82]   label [110,118] x [83,89]   TAIL [116,121] x [96,101]
 *                    (y = 80 + 2 + 4 + space 6 + 4)
 *   direct HEAD      [88,96] x [50,55]      direct TAIL [144,153] x [50,54]
 */
describe('NodeMarginCalculator', () => {
  it('returns itself from the exclude methods', () => {
    const { graph } = marginFixture();
    const calculator = new NodeMarginCalculator(graph);
    expect(calculator.excludeLabels()).toBe(calculator);
    expect(calculator.excludePorts()).toBe(calculator);
    expect(calculator.excludePortLabels()).toBe(calculator);
    expect(calculator.excludeEdgeHeadTailLabels()).toBe(calculator);
  });

  const cases: [string, (c: NodeMarginCalculator) => NodeMarginCalculator, Margins, Margins][] = [
    // [name, configure, node margins (top, bottom, left, right), other node margins]
    ['everything included', (c) => c, [25, 21, 17, 30], [0, 0, 304, 0]],
    ['without labels', (c) => c.excludeLabels(), [17, 21, 17, 30], [0, 0, 304, 0]],
    ['without edge head and tail labels', (c) => c.excludeEdgeHeadTailLabels(), [25, 9, 2, 12], [0, 0, 0, 0]],
    [
      'without edge labels and port labels',
      (c) => c.excludeEdgeHeadTailLabels().excludePortLabels(),
      [25, 2, 2, 0],
      [0, 0, 0, 0],
    ],
    [
      'without edge labels, port labels and ports',
      (c) => c.excludeEdgeHeadTailLabels().excludePortLabels().excludePorts(),
      [25, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      'only ports',
      (c) => c.excludeEdgeHeadTailLabels().excludePortLabels().excludeLabels(),
      [2, 2, 2, 0],
      [0, 0, 0, 0],
    ],
    [
      'without ports and edge labels',
      (c) => c.excludePorts().excludeEdgeHeadTailLabels(),
      [25, 9, 0, 12],
      [0, 0, 0, 0],
    ],
    [
      'nothing included',
      (c) => c.excludeLabels().excludePorts().excludePortLabels().excludeEdgeHeadTailLabels(),
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    // Excluding ports or port labels alone changes nothing here: the edge labels, which are computed from the port
    // positions and the port label sizes regardless, reach further.
    ['without ports', (c) => c.excludePorts(), [25, 21, 17, 30], [0, 0, 304, 0]],
    ['without port labels', (c) => c.excludePortLabels(), [25, 21, 17, 30], [0, 0, 304, 0]],
  ];

  it.each(cases)('process(): %s', (_name, configure, expectedNode, expectedOther) => {
    const fixture = marginFixture();
    configure(new NodeMarginCalculator(fixture.graph)).process();
    expect(marginsOf(fixture.node)).toEqual(expectedNode);
    expect(marginsOf(fixture.other)).toEqual(expectedOther);
  });

  it('reserves no port label space for inside port labels', () => {
    // EAST TAIL [148,160]; SOUTH TAIL [90,95]; NORTH HEAD [37,40]; the rest is unchanged
    const fixture = marginFixture(PortLabelPlacement.inside());
    new NodeMarginCalculator(fixture.graph).process();
    expect(marginsOf(fixture.node)).toEqual([25, 15, 17, 20]);
  });

  it('processNode() only touches the given node', () => {
    const fixture = marginFixture();
    new NodeMarginCalculator(fixture.graph).processNode(fixture.nodeAdapter);
    expect(marginsOf(fixture.node)).toEqual([25, 21, 17, 30]);
    expect(marginsOf(fixture.other)).toEqual([0, 0, 0, 0]);
  });

  it('process() reads the label spacing of the graph', () => {
    const fixture = marginFixture();
    fixture.root.setProperty(CoreOptions.SPACING_LABEL_NODE, 10);
    new NodeMarginCalculator(fixture.graph).process();
    // direct HEAD reaches x = 100 - (10 + 8) = 82; the WEST HEAD reaches 98 - (10 + 0 + 10 + 7) = 71
    expect(marginsOf(fixture.node)[2]).toBe(29);
  });

  it('treats a port without side like an EAST port', () => {
    const { node, root, graph } = nodeFixture((node, root) => {
      node.setLocation(0, 0);
      const port = addPort(node, PortSide.UNDEFINED, 10, 10);
      const label = ElkGraphUtil.createLabel(ElkGraphUtil.createSimpleEdge(port, ElkGraphUtil.createNode(root)));
      label.setDimensions(100, 2);
      label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
    });
    root.setProperty(CoreOptions.SPACING_LABEL_NODE, 4);
    // Port level: x = 10 + 2 + 4 + 0 + 4 = 20 -> [20,120]. The node's own outgoing edges include the ports' edges
    // (ElkGraphUtil.allOutgoingEdges), so the node level adds x = 40 + 4 = 44 -> [44,144]; the node ends at 40.
    new NodeMarginCalculator(graph).process();
    expect(marginsOf(node)).toEqual([0, 0, 0, 104]);
  });

  it('measures port labels alone', () => {
    const fixture = marginFixture();
    new NodeMarginCalculator(fixture.graph).excludeEdgeHeadTailLabels().excludePorts().excludeLabels().process();
    // EAST label [142,152] x [60,66], NORTH [120,126] x [34,38], SOUTH [110,118] x [83,89]
    expect(marginsOf(fixture.node)).toEqual([16, 9, 0, 12]);
  });
});
