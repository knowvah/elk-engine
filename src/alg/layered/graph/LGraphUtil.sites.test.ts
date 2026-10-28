// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { coordinateScenario } from '../../../../test/helpers/lgraph-site-coordinates.js';
import { labelAt, nodeAt, portAt, xy } from '../../../../test/helpers/lgraph-site-shapes.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { InteractiveReferencePoint } from '../options/InteractiveReferencePoint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import { LGraphUtil } from './LGraphUtil.js';

/**
 * Cases anchored on the `site/lgraphutil/{resizeNode,coordinates}/*` rows of test/golden/refs/java/layered-sites.json
 * (JVM oracle, T10). The scenario of each case is built here with the TS API; the literals are the row values.
 */
beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const PORT_SIDES = [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST] as const;
const PORT_POSITIONS: [number, number][] = [
  [18, -4],
  [38, 13],
  [18, 28],
  [-2, 13],
];
const LABEL_NAMES = ['right', 'below', 'inside', 'tiny', 'farNegY', 'farNegX'] as const;
const LABEL_BOXES: [number, number, number, number][] = [
  [45, 5, 10, 10],
  [5, 35, 10, 10],
  [15, 10, 10, 10],
  [1, 1, 2, 2],
  [115, -35, 10, 10],
  [-45, 85, 10, 10],
];

function resizeScenario(constraints: PortConstraints) {
  const graph = new LGraph();
  const node = nodeAt(graph, 0, 0, 40, 30);
  node.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
  const ports = PORT_SIDES.map((side, i) => portAt(node, side, ...PORT_POSITIONS[i]!));
  const labels = LABEL_BOXES.map((box, i) => labelAt(LABEL_NAMES[i]!, ...box));
  node.getLabels().push(...labels);
  return { node, ports, labels };
}

type Moved = [PortConstraints, boolean, boolean, [number, number][], [number, number][]];

const RIGHT_BELOW_MOVED: [number, number][] = [
  [85, 15],
  [15, 65],
  [15, 10],
  [1, 1],
  [115, -35],
  [-45, 85],
];
const LABELS_STAY = LABEL_BOXES.map(([x, y]): [number, number] => [x, y]);

// oracle: site/lgraphutil/resizeNode/{free,fixed}-move-{none,ports,labels,both}; LGraphUtil.java:101-155
const RESIZE_ROWS: Record<string, Moved> = {
  'free-move-none': [PortConstraints.FREE, false, false, PORT_POSITIONS, LABELS_STAY],
  'free-move-ports': [
    PortConstraints.FREE,
    true,
    false,
    [
      [36, -4],
      [78, 26],
      [36, 58],
      [-2, 26],
    ],
    LABELS_STAY,
  ],
  'free-move-labels': [PortConstraints.FREE, false, true, PORT_POSITIONS, RIGHT_BELOW_MOVED],
  'free-move-both': [
    PortConstraints.FREE,
    true,
    true,
    [
      [36, -4],
      [78, 26],
      [36, 58],
      [-2, 26],
    ],
    RIGHT_BELOW_MOVED,
  ],
  'fixed-move-none': [PortConstraints.FIXED_POS, false, false, PORT_POSITIONS, LABELS_STAY],
  'fixed-move-ports': [
    PortConstraints.FIXED_POS,
    true,
    false,
    [
      [18, -4],
      [78, 13],
      [18, 58],
      [-2, 13],
    ],
    LABELS_STAY,
  ],
  'fixed-move-labels': [PortConstraints.FIXED_POS, false, true, PORT_POSITIONS, RIGHT_BELOW_MOVED],
  'fixed-move-both': [
    PortConstraints.FIXED_POS,
    true,
    true,
    [
      [18, -4],
      [78, 13],
      [18, 58],
      [-2, 13],
    ],
    RIGHT_BELOW_MOVED,
  ],
};

describe('LGraphUtil.resizeNode (oracle rows)', () => {
  it.each(Object.entries(RESIZE_ROWS))(
    'site/lgraphutil/resizeNode/%s: grows 40x30 to 80x60',
    (_row, [constraints, movePorts, moveLabels, portPositions, labelPositions]) => {
      const { node, ports, labels } = resizeScenario(constraints);
      LGraphUtil.resizeNode(node, new KVector(80, 60), movePorts, moveLabels);
      expect(xy(node.getSize())).toEqual([80, 60]);
      // the size constraints are the empty set: the size is fixed
      expect([...node.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS)]).toEqual([]);
      expect(ports.map((p) => xy(p.getPosition()))).toEqual(portPositions);
      // east ports of a free node move to ratio * y; the label midpoint decides right, bottom or stay
      expect(labels.map((l) => xy(l.getPosition()))).toEqual(labelPositions);
    },
  );
});

describe('LGraphUtil coordinates (oracle rows)', () => {
  // oracle: site/lgraphutil/coordinates/offsetGraphs; LGraphUtil.java:175-182
  it('offsetGraphs shifts the nodes, bend points, junction points and edge labels of every graph by (1, 2)', () => {
    const s = coordinateScenario();
    LGraphUtil.offsetGraphs([s.g0, s.g1, s.g2], 1, 2);
    expect(xy(s.p.getPosition())).toEqual([101, 52]);
    expect(xy(s.a.getPosition())).toEqual([6, 8]);
    expect(xy(s.b.getPosition())).toEqual([41, 32]);
    expect(xy(s.q.getPosition())).toEqual([13, 16]);
    expect(xy(s.c.getPosition())).toEqual([3, 5]);
    expect([...s.e1.getBendPoints()].map(xy)).toEqual([
      [11, 12],
      [21, 32],
    ]);
    expect([...s.e1.getProperty(LayeredOptions.JUNCTION_POINTS)].map(xy)).toEqual([
      [11, 12],
      [16, 22],
    ]);
    expect([...s.e2.getBendPoints()].map(xy)).toEqual([[2, 3]]);
  });

  // oracle: site/lgraphutil/coordinates/offsetGraph; LGraphUtil.java:192-210
  it('offsetGraph moves only the nodes of g1 by (7, -3), with their outgoing edges and the edge labels', () => {
    const s = coordinateScenario();
    LGraphUtil.offsetGraph(s.g1, 7, -3);
    expect(xy(s.a.getPosition())).toEqual([12, 3]);
    expect(xy(s.b.getPosition())).toEqual([47, 27]);
    expect(xy(s.q.getPosition())).toEqual([19, 11]);
    expect(xy(s.c.getPosition())).toEqual([2, 3]);
    expect([...s.e1.getBendPoints()].map(xy)).toEqual([
      [17, 7],
      [27, 27],
    ]);
    expect([...s.e1.getProperty(LayeredOptions.JUNCTION_POINTS)].map(xy)).toEqual([
      [17, 7],
      [22, 17],
    ]);
    expect([...s.e2.getBendPoints()].map(xy)).toEqual([[8, -2]]);
    expect([...s.e2.getProperty(LayeredOptions.JUNCTION_POINTS)]).toEqual([]);
    expect(xy(s.e1.getLabels()[0]!.getPosition())).toEqual([18, 9]);
    expect(xy(s.e2.getLabels()[0]!.getPosition())).toEqual([9, 0]);
  });

  // oracle: site/lgraphutil/coordinates/isDescendant; LGraphUtil.java:1036-1050
  it('isDescendant is true for nested descendants and false for a node, its ancestor, or itself', () => {
    const s = coordinateScenario();
    expect(LGraphUtil.isDescendant(s.c, s.p)).toBe(true);
    expect(LGraphUtil.isDescendant(s.c, s.q)).toBe(true);
    expect(LGraphUtil.isDescendant(s.a, s.q)).toBe(false);
    expect(LGraphUtil.isDescendant(s.p, s.p)).toBe(false);
    expect(LGraphUtil.isDescendant(s.p, s.c)).toBe(false);
    expect(LGraphUtil.isDescendant(s.a, s.p)).toBe(true);
    expect(LGraphUtil.isDescendant(s.c, s.a)).toBe(false);
  });

  // oracle: site/lgraphutil/coordinates/changeCoordSystem; LGraphUtil.java:1058-1100
  it.each([
    ['g2', 'g0', [145, 103]],
    ['g0', 'g2', [-125, -63]],
    ['g1', 'g2', [-11, -1]],
    ['g2', 'g1', [31, 41]],
    ['g1', 'g1', [10, 20]],
    ['g0', 'g1', [-104, -42]],
    ['g1', 'g0', [124, 82]],
  ] as const)('changeCoordSystem moves the point (10, 20) from %s to %s to %j', (from, to, expected) => {
    const s = coordinateScenario();
    const point = new KVector(10, 20);
    LGraphUtil.changeCoordSystem(point, s[from], s[to]);
    expect(xy(point)).toEqual([...expected]);
  });

  // oracle: site/lgraphutil/coordinates/actualSizeAndAnchors; LGraph.java:98, LPort.java:198
  it('getActualSize adds the padding and getAbsoluteAnchor the node position, port position and anchor', () => {
    const s = coordinateScenario();
    expect(xy(s.g0.getActualSize())).toEqual([314, 212]);
    expect(xy(s.g1.getActualSize())).toEqual([84, 62]);
    expect(xy(s.g2.getActualSize())).toEqual([6, 4]);
    expect(xy(s.ports.aOut.getAbsoluteAnchor())).toEqual([26, 11]);
    expect(xy(s.ports.bIn.getAbsoluteAnchor())).toEqual([39, 34]);
    expect(xy(s.ports.bOut.getAbsoluteAnchor())).toEqual([64, 35]);
    expect(xy(s.ports.cIn.getAbsoluteAnchor())).toEqual([-2, 7]);
  });

  // oracle: site/lgraphutil/coordinates/borderToContentAreaCoordinates; LNode.java:467
  it.each([
    [false, false, [50, 60]],
    [true, false, [36, 60]],
    [false, true, [50, 48]],
    [true, true, [36, 48]],
  ] as const)('borderToContentAreaCoordinates(%s, %s) of a node of g1 at (50, 60) gives %j', (h, v, expected) => {
    const s = coordinateScenario();
    const node = nodeAt(s.g1, 50, 60, 10, 10);
    node.borderToContentAreaCoordinates(h, v);
    expect(xy(node.getPosition())).toEqual([...expected]);
  });

  // oracle: site/lgraphutil/coordinates/borderToContentAreaCoordinates (bn.root); LNode.java:467
  it('borderToContentAreaCoordinates subtracts padding and offset of the root graph g0', () => {
    const s = coordinateScenario();
    const node = nodeAt(s.g0, 50, 60, 10, 10);
    node.borderToContentAreaCoordinates(true, true);
    expect(xy(node.getPosition())).toEqual([39, 51]);
  });

  // oracle: site/lgraphutil/coordinates/interactiveReferencePoint-{center,top-left}; LNode.java:490-503
  it.each([
    [InteractiveReferencePoint.CENTER, [15, 11], [50, 35]],
    [InteractiveReferencePoint.TOP_LEFT, [5, 6], [40, 30]],
  ] as const)('getInteractiveReferencePoint under %s is %j for A and %j for B', (reference, forA, forB) => {
    const s = coordinateScenario();
    s.g1.setProperty(LayeredOptions.INTERACTIVE_REFERENCE_POINT, reference);
    expect(xy(s.a.getInteractiveReferencePoint()!)).toEqual([...forA]);
    expect(xy(s.b.getInteractiveReferencePoint()!)).toEqual([...forB]);
  });
});
