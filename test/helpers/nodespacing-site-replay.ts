// SPDX-License-Identifier: EPL-2.0
// Generic replay of test/golden/refs/java/nodespacing-sites.json (mission 6c, D1-D7, E1-E3). One function per `site`,
// each mirroring the construction sequence ("harness") documented in the header of
// tools/vectors/NodespacingSiteVectors.java: import the row `input`, build the NodeContext, apply `steps`, run the
// site's call sequence and collect the site's `expected` shape (doubles as plain numbers, enums and ids as strings).
import { AtomicCell } from '../../src/alg/common/nodespacing/cellsystem/AtomicCell.js';
import type { Cell } from '../../src/alg/common/nodespacing/cellsystem/Cell.js';
import { HorizontalLabelAlignment } from '../../src/alg/common/nodespacing/cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../src/alg/common/nodespacing/cellsystem/VerticalLabelAlignment.js';
import { CellSystemConfigurator } from '../../src/alg/common/nodespacing/internal/algorithm/CellSystemConfigurator.js';
import { HorizontalPortPlacementSizeCalculator } from '../../src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.js';
import { InsidePortLabelCellCreator } from '../../src/alg/common/nodespacing/internal/algorithm/InsidePortLabelCellCreator.js';
import { LabelPlacer } from '../../src/alg/common/nodespacing/internal/algorithm/LabelPlacer.js';
import { NodeLabelAndSizeUtilities } from '../../src/alg/common/nodespacing/internal/algorithm/NodeLabelAndSizeUtilities.js';
import { NodeLabelCellCreator } from '../../src/alg/common/nodespacing/internal/algorithm/NodeLabelCellCreator.js';
import { NodeSizeCalculator } from '../../src/alg/common/nodespacing/internal/algorithm/NodeSizeCalculator.js';
import { PortContextCreator } from '../../src/alg/common/nodespacing/internal/algorithm/PortContextCreator.js';
import { PortPlacementCalculator } from '../../src/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.js';
import { VerticalPortPlacementSizeCalculator } from '../../src/alg/common/nodespacing/internal/algorithm/VerticalPortPlacementSizeCalculator.js';
import { NodeContext } from '../../src/alg/common/nodespacing/internal/NodeContext.js';
import { NodeLabelLocation } from '../../src/alg/common/nodespacing/internal/NodeLabelLocation.js';
import type { PortContext } from '../../src/alg/common/nodespacing/internal/PortContext.js';
import { NodeDimensionCalculation } from '../../src/alg/common/nodespacing/NodeDimensionCalculation.js';
import { KVector } from '../../src/core/math/KVector.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../src/core/options/NodeLabelPlacement.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { ElkGraphAdapters } from '../../src/core/util/adapters/ElkGraphAdapters.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import { longBitsToDouble } from '../../src/java/lang/JavaDouble.js';

export type Hex = string;
export type StepArg = Hex | boolean | null;

/** One in-memory mutation applied to the NodeContext after construction (D7, E2, E3). */
export interface SiteStep {
  readonly op: string;
  readonly cell?: string;
  readonly side?: string;
  readonly index?: number;
  readonly args: readonly StepArg[];
}

/** A row of nodespacing-sites.json. `expected` holds hex strings where the Java recorded doubles. */
export interface SiteRow {
  readonly id: string;
  readonly site: string;
  readonly input: unknown;
  readonly steps: readonly SiteStep[];
  readonly expected: unknown;
}

export interface SiteFile {
  readonly jdk: string;
  readonly oracle: string;
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly SiteRow[];
}

const HEX_DOUBLE = /^[0-9a-f]{16}$/;
const SIDES: readonly PortSide[] = [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST];
const { NORTH, EAST, WEST } = PortSide;
const { OUTSIDE, V_TOP, H_LEFT, H_CENTER, H_PRIORITY } = NodeLabelPlacement;

/** 16 hex digits of raw double bits (the `JavaVectors.hex` convention) to a double. */
export function decodeHex(hex: Hex): number {
  return longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
}

/** Decodes every 16-hex-digit string inside a recorded `expected` into a number; all else is kept. */
export function decodeExpected(value: unknown): unknown {
  if (typeof value === 'string') {
    return HEX_DOUBLE.test(value) ? decodeHex(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(decodeExpected);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, decodeExpected(v)]));
  }
  return value;
}

// ---------------------------------------------------------------------------------------------------------------
// Contexts (NodespacingSiteVectors.baseContext / placementContext / cellSystemContext / layOut)

function baseContext(root: ElkNode): NodeContext {
  const graph = ElkGraphAdapters.adapt(root);
  const context = new NodeContext(graph, [...graph.getNodes()][0]!);
  PortContextCreator.createPortContexts(context, false);
  return context;
}

function placementContext(root: ElkNode): NodeContext {
  const context = baseContext(root);
  for (const side of SIDES) {
    context.insidePortLabelCells.put(side, new AtomicCell());
  }
  return context;
}

function cellSystemContext(root: ElkNode): NodeContext {
  const context = baseContext(root);
  NodeLabelCellCreator.createNodeLabelCells(context, false, true);
  InsidePortLabelCellCreator.createInsidePortLabelCells(context);
  return context;
}

function layOut(context: NodeContext): void {
  CellSystemConfigurator.configureCellSystemSizeContributions(context);
  NodeSizeCalculator.setNodeWidth(context);
  NodeSizeCalculator.setNodeHeight(context);
}

function cellAt(c: NodeContext, address: string): Cell {
  const [group, key = ''] = address.split('.');
  let found: Cell | undefined;
  switch (group) {
    case 'nodeContainer':
      found = c.nodeContainer;
      break;
    case 'nodeContainerMiddleRow':
      found = c.nodeContainerMiddleRow;
      break;
    case 'insideNodeLabelContainer':
      found = c.insideNodeLabelContainer;
      break;
    case 'insidePortLabelCells':
      found = c.insidePortLabelCells.get(PortSide.valueOf(key));
      break;
    case 'outsideNodeLabelContainers':
      found = c.outsideNodeLabelContainers.get(PortSide.valueOf(key));
      break;
    case 'nodeLabelCells':
      found = c.nodeLabelCells.get(NodeLabelLocation.valueOf(key));
      break;
  }
  if (found === undefined) {
    throw new Error(`no cell ${address}`);
  }
  return found;
}

function portContextAt(c: NodeContext, side: string, index: number): PortContext {
  return [...c.portContexts.get(PortSide.valueOf(side))][index]!;
}

// ---------------------------------------------------------------------------------------------------------------
// Steps (D7 vocabulary, E2, E3)

function setPortMargin(c: NodeContext, step: SiteStep): void {
  const [top, right, bottom, left] = step.args.map((a) => decodeHex(a as Hex));
  const margin = portContextAt(c, step.side!, step.index!).portMargin;
  margin.top = top!;
  margin.right = right!;
  margin.bottom = bottom!;
  margin.left = left!;
}

function setPortRatio(c: NodeContext, root: ElkNode, step: SiteStep): void {
  const port = portContextAt(c, step.side!, step.index!).port;
  root
    .getChildren()
    .get(0)
    .getPorts()
    .get(port.getVolatileId())
    .setProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION, decodeHex(step.args[0] as Hex));
}

function setContributes(cell: Cell, step: SiteStep): void {
  const [width, height] = step.args;
  if (width !== null && width !== undefined) {
    cell.setContributesToMinimumWidth(width as boolean);
  }
  if (height !== null && height !== undefined) {
    cell.setContributesToMinimumHeight(height as boolean);
  }
}

function applyStep(c: NodeContext, root: ElkNode, step: SiteStep): void {
  const nums = step.args.map((a) => (typeof a === 'string' ? decodeHex(a) : NaN));
  switch (step.op) {
    case 'setMinimumContentAreaSize':
      (cellAt(c, step.cell!) as AtomicCell).setMinimumContentAreaSize(new KVector(nums[0]!, nums[1]!), false);
      return;
    case 'setContributes':
      setContributes(cellAt(c, step.cell!), step);
      return;
    case 'setCellRectangle':
      cellAt(c, step.cell!).getCellRectangle().setRect(nums[0]!, nums[1]!, nums[2]!, nums[3]!);
      return;
    case 'setPortMargin':
      setPortMargin(c, step);
      return;
    case 'setPortRatio':
      setPortRatio(c, root, step);
      return;
    default:
      throw new Error(`unknown step ${step.op}`);
  }
}

function applySteps(c: NodeContext, root: ElkNode, steps: readonly SiteStep[]): void {
  for (const step of steps) {
    applyStep(c, root, step);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Collectors

const at = (l: { getX(): number; getY(): number }): number[] => [l.getX(), l.getY()];

function rectOf(r: { x: number; y: number; width: number; height: number }): number[] {
  return [r.x, r.y, r.width, r.height];
}

function containers(c: NodeContext, ...sides: PortSide[]): Record<string, number[]> {
  return Object.fromEntries(
    sides.map((s) => [s.name(), rectOf(c.outsideNodeLabelContainers.get(s)!.getCellRectangle())]),
  );
}

function marginsOn(c: NodeContext, side: PortSide, pick: (m: PortContext['portMargin']) => number[]): number[][] {
  return [...c.portContexts.get(side)].map((pc) => pick(pc.portMargin));
}

const marginsH = (c: NodeContext): number[][] => marginsOn(c, NORTH, (m) => [m.left, m.right]);
const marginsV = (c: NodeContext): number[][] => marginsOn(c, EAST, (m) => [m.top, m.bottom]);

// ---------------------------------------------------------------------------------------------------------------
// Sites

/** `labelLocation/<name>`: the placement set of the row id (NodespacingSiteVectors.labelLocationRows). */
const LABEL_SETS: Readonly<Record<string, EnumSet<NodeLabelPlacement>>> = {
  'labelLocation/out-l-t-set': EnumSet.of(OUTSIDE, V_TOP, H_LEFT, H_PRIORITY),
  'labelLocation/unmatched': EnumSet.of(OUTSIDE, H_LEFT, H_CENTER),
};

function labelLocation(row: SiteRow): unknown {
  return { location: NodeLabelLocation.fromNodeLabelPlacement(LABEL_SETS[row.id]!).name() };
}

function applyStuff(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = baseContext(root);
  applySteps(c, root, steps);
  c.nodeSize.x = 70;
  c.nodeSize.y = 60;
  c.portContexts.values().forEach((pc, i) => pc.portPosition.set(10 + i, 20 + i));
  NodeLabelAndSizeUtilities.applyStuff(c);
  const node = root.getChildren().get(0);
  return {
    nodeSize: [node.getWidth(), node.getHeight()],
    ports: [...c.portContexts.values()].map((pc) => {
      const p = node.getPorts().get(pc.port.getVolatileId());
      return { id: p.getIdentifier(), x: p.getX(), y: p.getY() };
    }),
  };
}

function fixedRatioMargins(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = placementContext(root);
  applySteps(c, root, steps);
  HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
  return { margins: marginsH(c), size: c.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().x };
}

function sidelessPortMargins(root: ElkNode): unknown {
  NodeDimensionCalculation.getNodeMarginCalculator(ElkGraphAdapters.adapt(root)).process();
  const m = root.getChildren().get(0).getProperty(CoreOptions.MARGINS);
  return { margins: [m.top, m.right, m.bottom, m.left] };
}

function insideLabels(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = cellSystemContext(root);
  applySteps(c, root, steps);
  layOut(c);
  const portLabelCell = [...c.portContexts.values()][0]!.portLabelCell!;
  portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
  portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
  portLabelCell.getCellRectangle().setRect(100, 200, 50, 20);
  LabelPlacer.placeLabels(c);
  const labels = root.getChildren().get(0).getLabels();
  return {
    labels: {
      insideTopLeft: at(labels.get(4)),
      insideBottomRight: at(labels.get(5)),
      west: at(labels.get(2)),
      east: at(labels.get(3)),
    },
    containers: containers(c, WEST, EAST),
  };
}

function allConstraints(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = cellSystemContext(root);
  applySteps(c, root, steps);
  layOut(c);
  const north = c.insidePortLabelCells.get(NORTH)!.getCellRectangle();
  const middle = c.nodeContainerMiddleRow.getCellRectangle();
  const south = c.insidePortLabelCells.get(PortSide.SOUTH)!.getCellRectangle();
  return {
    size: [c.nodeSize.x, c.nodeSize.y],
    north: [north.y, north.height],
    middle: [middle.y, middle.height, middle.width],
    south: [south.y, south.height],
  };
}

function collapsedContainers(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = cellSystemContext(root);
  applySteps(c, root, steps);
  layOut(c);
  c.nodeSize.set(50, 30);
  LabelPlacer.placeLabels(c);
  const labels = root.getChildren().get(0).getLabels();
  return { containers: containers(c, NORTH, WEST), labels: { north: at(labels.get(0)), west: at(labels.get(1)) } };
}

function t4HorizontalSize(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = placementContext(root);
  applySteps(c, root, steps);
  HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
  const cell = c.insidePortLabelCells.get(NORTH)!;
  const padding = cell.getPadding();
  return {
    side: 'NORTH',
    size: cell.getMinimumContentAreaSize().x,
    padding: [padding.left, padding.right],
    margins: marginsH(c),
  };
}

function t4VerticalSize(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = placementContext(root);
  applySteps(c, root, steps);
  VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(c);
  const cell = c.insidePortLabelCells.get(EAST)!;
  const padding = cell.getPadding();
  return {
    side: 'EAST',
    size: cell.getMinimumContentAreaSize().y,
    padding: [padding.top, padding.bottom],
    margins: marginsV(c),
  };
}

function t4HorizontalPlacement(root: ElkNode, steps: readonly SiteStep[]): unknown {
  const c = placementContext(root);
  applySteps(c, root, steps);
  HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
  PortPlacementCalculator.placeHorizontalPorts(c);
  const along = (axis: 'x' | 'y'): Record<string, number[]> =>
    Object.fromEntries(SIDES.map((s) => [s.name(), [...c.portContexts.get(s)].map((pc) => pc.portPosition[axis])]));
  return { xs: along('x'), ys: along('y') };
}

/** `t4.minSize` has no graph; the recorded `{ spacing, first, second }` triples are the inputs. */
function t4MinSize(row: SiteRow): unknown {
  const cases = (decodeExpected(row.expected) as { cases: { spacing: number; first: number; second: number }[] }).cases;
  return {
    cases: cases.map(({ spacing, first, second }) => ({
      spacing,
      first,
      second,
      result: HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(spacing, first, second),
    })),
  };
}

type GraphSite = (root: ElkNode, steps: readonly SiteStep[]) => unknown;

const GRAPH_SITES: Readonly<Record<string, GraphSite>> = {
  applyStuff,
  fixedRatioMargins,
  sidelessPortMargins: (root) => sidelessPortMargins(root),
  insideLabels,
  allConstraints,
  collapsedContainers,
  't4.horizontalSize': t4HorizontalSize,
  't4.verticalSize': t4VerticalSize,
  't4.horizontalPlacement': t4HorizontalPlacement,
};

/** The group of `rowCounts` a row belongs to: the part of its id before the first slash. */
export function groupOf(row: SiteRow): string {
  return row.id.substring(0, row.id.indexOf('/'));
}

/** Replays one row and returns the site's result shape with every double as a number. */
export function replayRow(row: SiteRow): unknown {
  if (row.site === 'labelLocation') {
    return labelLocation(row);
  }
  if (row.site === 't4.minSize') {
    return t4MinSize(row);
  }
  const site = GRAPH_SITES[row.site];
  if (site === undefined) {
    throw new Error(`unknown site ${row.site}`);
  }
  const root = ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
  return site(root, row.steps);
}
