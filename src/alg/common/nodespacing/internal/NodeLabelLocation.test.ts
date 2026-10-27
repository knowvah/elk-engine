// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NodeLabelPlacement } from '../../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { ContainerArea } from '../cellsystem/ContainerArea.js';
import { HorizontalLabelAlignment as H } from '../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment as V } from '../cellsystem/VerticalLabelAlignment.js';
import { NodeLabelLocation } from './NodeLabelLocation.js';

const { INSIDE, OUTSIDE, H_LEFT, H_CENTER, H_RIGHT, V_TOP, V_CENTER, V_BOTTOM, H_PRIORITY } = NodeLabelPlacement;
const { BEGIN, CENTER, END } = ContainerArea;

type Row = [
  NodeLabelLocation,
  H,
  V,
  ContainerArea,
  ContainerArea,
  NodeLabelPlacement[][], // every placement set assigned to the location, as listed in the Java source
  PortSide, // outside side
];

const TABLE: Row[] = [
  [NodeLabelLocation.OUT_T_L, H.LEFT, V.BOTTOM, BEGIN, BEGIN, [[OUTSIDE, V_TOP, H_LEFT]], PortSide.NORTH],
  [
    NodeLabelLocation.OUT_T_C,
    H.CENTER,
    V.BOTTOM,
    BEGIN,
    CENTER,
    [
      [OUTSIDE, V_TOP, H_CENTER],
      [OUTSIDE, V_TOP, H_CENTER, H_PRIORITY],
    ],
    PortSide.NORTH,
  ],
  [NodeLabelLocation.OUT_T_R, H.RIGHT, V.BOTTOM, BEGIN, END, [[OUTSIDE, V_TOP, H_RIGHT]], PortSide.NORTH],
  [NodeLabelLocation.OUT_B_L, H.LEFT, V.TOP, END, BEGIN, [[OUTSIDE, V_BOTTOM, H_LEFT]], PortSide.SOUTH],
  [
    NodeLabelLocation.OUT_B_C,
    H.CENTER,
    V.TOP,
    END,
    CENTER,
    [
      [OUTSIDE, V_BOTTOM, H_CENTER],
      [OUTSIDE, V_BOTTOM, H_CENTER, H_PRIORITY],
    ],
    PortSide.SOUTH,
  ],
  [NodeLabelLocation.OUT_B_R, H.RIGHT, V.TOP, END, END, [[OUTSIDE, V_BOTTOM, H_RIGHT]], PortSide.SOUTH],
  [NodeLabelLocation.OUT_L_T, H.RIGHT, V.TOP, BEGIN, BEGIN, [[OUTSIDE, H_LEFT, V_TOP, H_PRIORITY]], PortSide.WEST],
  [
    NodeLabelLocation.OUT_L_C,
    H.RIGHT,
    V.CENTER,
    CENTER,
    BEGIN,
    [
      [OUTSIDE, H_LEFT, V_CENTER],
      [OUTSIDE, H_LEFT, V_CENTER, H_PRIORITY],
    ],
    PortSide.WEST,
  ],
  [NodeLabelLocation.OUT_L_B, H.RIGHT, V.BOTTOM, END, BEGIN, [[OUTSIDE, H_LEFT, V_BOTTOM, H_PRIORITY]], PortSide.WEST],
  [NodeLabelLocation.OUT_R_T, H.LEFT, V.TOP, BEGIN, END, [[OUTSIDE, H_RIGHT, V_TOP, H_PRIORITY]], PortSide.EAST],
  [
    NodeLabelLocation.OUT_R_C,
    H.LEFT,
    V.CENTER,
    CENTER,
    END,
    [
      [OUTSIDE, H_RIGHT, V_CENTER],
      [OUTSIDE, H_RIGHT, V_CENTER, H_PRIORITY],
    ],
    PortSide.EAST,
  ],
  [NodeLabelLocation.OUT_R_B, H.LEFT, V.BOTTOM, END, END, [[OUTSIDE, H_RIGHT, V_BOTTOM, H_PRIORITY]], PortSide.EAST],
  ...inside(NodeLabelLocation.IN_T_L, H.LEFT, V.TOP, BEGIN, BEGIN, V_TOP, H_LEFT),
  ...inside(NodeLabelLocation.IN_T_C, H.CENTER, V.TOP, BEGIN, CENTER, V_TOP, H_CENTER),
  ...inside(NodeLabelLocation.IN_T_R, H.RIGHT, V.TOP, BEGIN, END, V_TOP, H_RIGHT),
  ...inside(NodeLabelLocation.IN_C_L, H.LEFT, V.CENTER, CENTER, BEGIN, V_CENTER, H_LEFT),
  ...inside(NodeLabelLocation.IN_C_C, H.CENTER, V.CENTER, CENTER, CENTER, V_CENTER, H_CENTER),
  ...inside(NodeLabelLocation.IN_C_R, H.RIGHT, V.CENTER, CENTER, END, V_CENTER, H_RIGHT),
  ...inside(NodeLabelLocation.IN_B_L, H.LEFT, V.BOTTOM, END, BEGIN, V_BOTTOM, H_LEFT),
  ...inside(NodeLabelLocation.IN_B_C, H.CENTER, V.BOTTOM, END, CENTER, V_BOTTOM, H_CENTER),
  ...inside(NodeLabelLocation.IN_B_R, H.RIGHT, V.BOTTOM, END, END, V_BOTTOM, H_RIGHT),
];

/** The nine inside locations each list a plain set and one with H_PRIORITY. */
function inside(
  location: NodeLabelLocation,
  h: H,
  v: V,
  row: ContainerArea,
  column: ContainerArea,
  vertical: NodeLabelPlacement,
  horizontal: NodeLabelPlacement,
): Row[] {
  return [
    [
      location,
      h,
      v,
      row,
      column,
      [
        [INSIDE, vertical, horizontal],
        [INSIDE, vertical, horizontal, H_PRIORITY],
      ],
      PortSide.UNDEFINED,
    ],
  ];
}

describe('NodeLabelLocation', () => {
  it('declares 22 values in the Java order, UNDEFINED last', () => {
    const names = NodeLabelLocation.values().map((l) => l.name());
    expect(names).toEqual([...TABLE.map(([l]) => l.name()), 'UNDEFINED']);
    expect(names).toHaveLength(22);
    expect(NodeLabelLocation.UNDEFINED.ordinal()).toBe(21);
  });

  describe.each(TABLE)('%s', (location, h, v, row, column, placements, side) => {
    it('exposes its alignments, container row and column', () => {
      expect(location.getHorizontalAlignment()).toBe(h);
      expect(location.getVerticalAlignment()).toBe(v);
      expect(location.getContainerRow()).toBe(row);
      expect(location.getContainerColumn()).toBe(column);
    });

    it('round-trips every assigned placement set through fromNodeLabelPlacement', () => {
      for (const [first, ...rest] of placements) {
        expect(NodeLabelLocation.fromNodeLabelPlacement(EnumSet.of(first!, ...rest))).toBe(location);
      }
    });

    it('classifies inside locations and reports the outside side', () => {
      expect(location.isInsideLocation()).toBe(location.name().startsWith('IN_'));
      expect(location.getOutsideSide()).toBe(side);
    });
  });

  // Oracle row labelLocation/out-l-t-set (nodespacing-sites.json): OUT_L_T. The set {OUTSIDE, V_TOP, H_LEFT,
  // H_PRIORITY} is OUT_L_T's own assigned set (NodeLabelLocation.java:108-115), and fromNodeLabelPlacement returns the
  // location whose set equals the argument (NodeLabelLocation.java:371).
  it('maps {OUTSIDE, V_TOP, H_LEFT, H_PRIORITY} to OUT_L_T', () => {
    expect(NodeLabelLocation.fromNodeLabelPlacement(EnumSet.of(OUTSIDE, V_TOP, H_LEFT, H_PRIORITY))).toBe(
      NodeLabelLocation.OUT_L_T,
    );
  });

  // Oracle row labelLocation/unmatched: UNDEFINED. No location is assigned {OUTSIDE, H_LEFT, H_CENTER}
  // (NodeLabelLocation.java:371 falls through to UNDEFINED).
  it('returns UNDEFINED for unmatched placement sets', () => {
    expect(NodeLabelLocation.fromNodeLabelPlacement(EnumSet.of(INSIDE))).toBe(NodeLabelLocation.UNDEFINED);
    expect(NodeLabelLocation.fromNodeLabelPlacement(EnumSet.of(OUTSIDE, H_LEFT, H_CENTER))).toBe(
      NodeLabelLocation.UNDEFINED,
    );
    expect(NodeLabelLocation.fromNodeLabelPlacement(EnumSet.noneOf(NodeLabelPlacement))).toBe(
      NodeLabelLocation.UNDEFINED,
    );
  });

  it('has no alignments, row or column for UNDEFINED and is neither inside nor outside', () => {
    const undefinedLocation = NodeLabelLocation.UNDEFINED;
    expect(undefinedLocation.getHorizontalAlignment()).toBeNull();
    expect(undefinedLocation.getVerticalAlignment()).toBeNull();
    expect(undefinedLocation.getContainerRow()).toBeNull();
    expect(undefinedLocation.getContainerColumn()).toBeNull();
    expect(undefinedLocation.isInsideLocation()).toBe(false);
    expect(undefinedLocation.getOutsideSide()).toBe(PortSide.UNDEFINED);
  });

  it('resolves names and rejects unknown ones with the Java message', () => {
    expect(NodeLabelLocation.valueOf('IN_C_C')).toBe(NodeLabelLocation.IN_C_C);
    expect(() => NodeLabelLocation.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.nodespacing.internal.NodeLabelLocation.NOPE',
    );
  });
});
