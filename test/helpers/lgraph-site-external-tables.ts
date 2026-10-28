// SPDX-License-Identifier: EPL-2.0
/**
 * Literal rows of the oracle site rows `site/lgraphutil/externalPorts/*` (JVM oracle, T10): per row the inputs of
 * `createExternalPortDummy` (a holder LPort with the optional options `holderOffset` PORT_BORDER_OFFSET, `holderAnchor`
 * PORT_ANCHOR and `holderIndex` PORT_INDEX; a graph of 120x90, padding 5/6/7/8, offset 2/3; node size (100, 80), port
 * position (7, 9) and port size (6, 4) for every row), then `dummy.setPosition(30, 40)` and
 * `getExternalPortPosition(graph, dummy, 6, 4)`; `expect` is the recorded outcome (null: the property is not set).
 */
export interface ExternalPortRow {
  readonly input: {
    readonly constraints: string;
    readonly side: string;
    readonly netFlow: number;
    readonly direction: string;
    readonly holderOffset?: number;
    readonly holderAnchor?: readonly [number, number];
    readonly holderIndex?: number;
  };
  readonly expect: {
    /** the size of the created dummy */
    readonly size: readonly [number, number];
    readonly externalPortSide: string;
    readonly inLayerConstraint: string | null;
    readonly layerConstraint: string | null;
    readonly edgeConstraint: string | null;
    /** the PORT_ANCHOR of the dummy */
    readonly anchor: readonly [number, number];
    readonly borderOffset: number;
    readonly ratioOrPosition: number | null;
    /** the single port of the dummy: side, x, y */
    readonly port: readonly [string, number, number];
    /** the returned port position */
    readonly position: readonly [number, number];
    /** the dummy position after getExternalPortPosition moved it */
    readonly moved: readonly [number, number];
  };
}

// prettier-ignore
export const EXTERNAL_PORT_ROWS: Readonly<Record<string, ExternalPortRow>> = {
  'north-implicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'NORTH', netFlow: 0, direction: 'RIGHT', holderOffset: -4 },
    expect: { size: [6, 4], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: -4, ratioOrPosition: 7, port: ['SOUTH', 3, 0], position: [40, 0], moved: [30, -4] },
  },
  'north-implicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'NORTH', netFlow: 0, direction: 'RIGHT', holderOffset: 3 },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 3, ratioOrPosition: 7, port: ['SOUTH', 3, 0], position: [40, -7], moved: [30, -11] },
  },
  'north-explicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'NORTH', netFlow: 0, direction: 'RIGHT', holderOffset: -4, holderAnchor: [1.5, 2.5] },
    expect: { size: [6, 4], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [1.5, -1.5], borderOffset: -4, ratioOrPosition: 7, port: ['SOUTH', 1.5, -1.5], position: [40, 0], moved: [30, -4] },
  },
  'north-explicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'NORTH', netFlow: 0, direction: 'RIGHT', holderOffset: 3, holderAnchor: [1.5, 2.5] },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [1.5, -1.5], borderOffset: 3, ratioOrPosition: 7, port: ['SOUTH', 1.5, -1.5], position: [40, -7], moved: [30, -11] },
  },
  'east-implicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'EAST', netFlow: 0, direction: 'RIGHT', holderOffset: -4 },
    expect: { size: [4, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: -4, ratioOrPosition: 9, port: ['WEST', 0, 2], position: [130, 48], moved: [120, 40] },
  },
  'east-implicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'EAST', netFlow: 0, direction: 'RIGHT', holderOffset: 3 },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 3, ratioOrPosition: 9, port: ['WEST', 0, 2], position: [137, 48], moved: [127, 40] },
  },
  'east-explicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'EAST', netFlow: 0, direction: 'RIGHT', holderOffset: -4, holderAnchor: [1.5, 2.5] },
    expect: { size: [4, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [1.5, 2.5], borderOffset: -4, ratioOrPosition: 9, port: ['WEST', 1.5, 2.5], position: [130, 48], moved: [120, 40] },
  },
  'east-explicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'EAST', netFlow: 0, direction: 'RIGHT', holderOffset: 3, holderAnchor: [1.5, 2.5] },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [1.5, 2.5], borderOffset: 3, ratioOrPosition: 9, port: ['WEST', 1.5, 2.5], position: [137, 48], moved: [127, 40] },
  },
  'south-implicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'SOUTH', netFlow: 0, direction: 'RIGHT', holderOffset: -4 },
    expect: { size: [6, 4], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: -4, ratioOrPosition: 7, port: ['NORTH', 3, 0], position: [40, 98], moved: [30, 90] },
  },
  'south-implicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'SOUTH', netFlow: 0, direction: 'RIGHT', holderOffset: 3 },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 3, ratioOrPosition: 7, port: ['NORTH', 3, 0], position: [40, 105], moved: [30, 97] },
  },
  'south-explicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'SOUTH', netFlow: 0, direction: 'RIGHT', holderOffset: -4, holderAnchor: [1.5, 2.5] },
    expect: { size: [6, 4], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [1.5, 2.5], borderOffset: -4, ratioOrPosition: 7, port: ['NORTH', 1.5, 2.5], position: [40, 98], moved: [30, 90] },
  },
  'south-explicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'SOUTH', netFlow: 0, direction: 'RIGHT', holderOffset: 3, holderAnchor: [1.5, 2.5] },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [1.5, 2.5], borderOffset: 3, ratioOrPosition: 7, port: ['NORTH', 1.5, 2.5], position: [40, 105], moved: [30, 97] },
  },
  'west-implicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'WEST', netFlow: 0, direction: 'RIGHT', holderOffset: -4 },
    expect: { size: [4, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: -4, ratioOrPosition: 9, port: ['EAST', 0, 2], position: [-2, 48], moved: [-6, 40] },
  },
  'west-implicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'WEST', netFlow: 0, direction: 'RIGHT', holderOffset: 3 },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 3, ratioOrPosition: 9, port: ['EAST', 0, 2], position: [-9, 48], moved: [-13, 40] },
  },
  'west-explicit-anchor-negative-offset': {
    input: { constraints: 'FIXED_POS', side: 'WEST', netFlow: 0, direction: 'RIGHT', holderOffset: -4, holderAnchor: [1.5, 2.5] },
    expect: { size: [4, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [-4.5, 2.5], borderOffset: -4, ratioOrPosition: 9, port: ['EAST', -4.5, 2.5], position: [-2, 48], moved: [-6, 40] },
  },
  'west-explicit-anchor-positive-offset': {
    input: { constraints: 'FIXED_POS', side: 'WEST', netFlow: 0, direction: 'RIGHT', holderOffset: 3, holderAnchor: [1.5, 2.5] },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [-4.5, 2.5], borderOffset: 3, ratioOrPosition: 9, port: ['EAST', -4.5, 2.5], position: [-9, 48], moved: [-13, 40] },
  },
  'fixed-order-index-north': {
    input: { constraints: 'FIXED_ORDER', side: 'NORTH', netFlow: 0, direction: 'RIGHT', holderIndex: 3 },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: 3, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'fixed-order-no-index-north': {
    input: { constraints: 'FIXED_ORDER', side: 'NORTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: 7, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'fixed-ratio-north': {
    input: { constraints: 'FIXED_RATIO', side: 'NORTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: 0.07, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'fixed-side-north': {
    input: { constraints: 'FIXED_SIDE', side: 'NORTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'fixed-order-index-east': {
    input: { constraints: 'FIXED_ORDER', side: 'EAST', netFlow: 0, direction: 'RIGHT', holderIndex: 3 },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: 3, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'fixed-order-no-index-east': {
    input: { constraints: 'FIXED_ORDER', side: 'EAST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: 9, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'fixed-ratio-east': {
    input: { constraints: 'FIXED_RATIO', side: 'EAST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: 0.1125, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'fixed-side-east': {
    input: { constraints: 'FIXED_SIDE', side: 'EAST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'fixed-order-index-south': {
    input: { constraints: 'FIXED_ORDER', side: 'SOUTH', netFlow: 0, direction: 'RIGHT', holderIndex: 3 },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: -3, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'fixed-order-no-index-south': {
    input: { constraints: 'FIXED_ORDER', side: 'SOUTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: 7, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'fixed-ratio-south': {
    input: { constraints: 'FIXED_RATIO', side: 'SOUTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: 0.07, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'fixed-side-south': {
    input: { constraints: 'FIXED_SIDE', side: 'SOUTH', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'fixed-order-index-west': {
    input: { constraints: 'FIXED_ORDER', side: 'WEST', netFlow: 0, direction: 'RIGHT', holderIndex: 3 },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: -3, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'fixed-order-no-index-west': {
    input: { constraints: 'FIXED_ORDER', side: 'WEST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: 9, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'fixed-ratio-west': {
    input: { constraints: 'FIXED_RATIO', side: 'WEST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: 0.1125, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'fixed-side-west': {
    input: { constraints: 'FIXED_SIDE', side: 'WEST', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'fixed-side-undefined': {
    input: { constraints: 'FIXED_SIDE', side: 'UNDEFINED', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 0], externalPortSide: 'UNDEFINED', inLayerConstraint: null, layerConstraint: null, edgeConstraint: null, anchor: [3, 2], borderOffset: 0, ratioOrPosition: null, port: ['UNDEFINED', 3, 2], position: [30, 40], moved: [30, 40] },
  },
  'free-right-netflow-positive': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: 1, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'free-right-netflow-zero': {
    input: { constraints: 'UNDEFINED', side: 'UNDEFINED', netFlow: 0, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'free-right-netflow-negative': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: -1, direction: 'RIGHT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'free-left-netflow-positive': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: 1, direction: 'LEFT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'free-left-netflow-zero': {
    input: { constraints: 'UNDEFINED', side: 'UNDEFINED', netFlow: 0, direction: 'LEFT' },
    expect: { size: [0, 4], externalPortSide: 'WEST', inLayerConstraint: null, layerConstraint: 'FIRST_SEPARATE', edgeConstraint: 'OUTGOING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['EAST', 0, 2], position: [-6, 48], moved: [-10, 40] },
  },
  'free-left-netflow-negative': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: -1, direction: 'LEFT' },
    expect: { size: [0, 4], externalPortSide: 'EAST', inLayerConstraint: null, layerConstraint: 'LAST_SEPARATE', edgeConstraint: 'INCOMING_ONLY', anchor: [0, 2], borderOffset: 0, ratioOrPosition: null, port: ['WEST', 0, 2], position: [134, 48], moved: [124, 40] },
  },
  'free-up-netflow-positive': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: 1, direction: 'UP' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'free-up-netflow-zero': {
    input: { constraints: 'UNDEFINED', side: 'UNDEFINED', netFlow: 0, direction: 'UP' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'free-up-netflow-negative': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: -1, direction: 'UP' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'free-down-netflow-positive': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: 1, direction: 'DOWN' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'free-down-netflow-zero': {
    input: { constraints: 'UNDEFINED', side: 'UNDEFINED', netFlow: 0, direction: 'DOWN' },
    expect: { size: [6, 0], externalPortSide: 'SOUTH', inLayerConstraint: 'BOTTOM', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['NORTH', 3, 0], position: [40, 102], moved: [30, 94] },
  },
  'free-down-netflow-negative': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: -1, direction: 'DOWN' },
    expect: { size: [6, 0], externalPortSide: 'NORTH', inLayerConstraint: 'TOP', layerConstraint: null, edgeConstraint: null, anchor: [3, 0], borderOffset: 0, ratioOrPosition: null, port: ['SOUTH', 3, 0], position: [40, -4], moved: [30, -8] },
  },
  'free-undefined-netflow-positive': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: 1, direction: 'UNDEFINED' },
    expect: { size: [0, 0], externalPortSide: 'UNDEFINED', inLayerConstraint: null, layerConstraint: null, edgeConstraint: null, anchor: [3, 2], borderOffset: 0, ratioOrPosition: null, port: ['UNDEFINED', 3, 2], position: [30, 40], moved: [30, 40] },
  },
  'free-undefined-netflow-zero': {
    input: { constraints: 'UNDEFINED', side: 'UNDEFINED', netFlow: 0, direction: 'UNDEFINED' },
    expect: { size: [0, 0], externalPortSide: 'UNDEFINED', inLayerConstraint: null, layerConstraint: null, edgeConstraint: null, anchor: [3, 2], borderOffset: 0, ratioOrPosition: null, port: ['UNDEFINED', 3, 2], position: [30, 40], moved: [30, 40] },
  },
  'free-undefined-netflow-negative': {
    input: { constraints: 'FREE', side: 'UNDEFINED', netFlow: -1, direction: 'UNDEFINED' },
    expect: { size: [0, 0], externalPortSide: 'UNDEFINED', inLayerConstraint: null, layerConstraint: null, edgeConstraint: null, anchor: [3, 2], borderOffset: 0, ratioOrPosition: null, port: ['UNDEFINED', 3, 2], position: [30, 40], moved: [30, 40] },
  },
};
