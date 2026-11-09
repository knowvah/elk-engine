// SPDX-License-Identifier: EPL-2.0
// Anchored cases of EndLabelPreprocessor (mission 7f2, T17a, G12, task 2): `placeLabels` per `PortSide`
// (`EndLabelPreprocessor.java:279-345`) and the `getLabelSide` ABOVE arms (`:285,305,325,345`, listed U in unreached.md
// because `LabelSideSelector` runs after the preprocessor in the one slot, so the oracle never sees `ABOVE` there). The
// rows of `DIRECTIONS` stop right after the preprocessor with `LABEL_SIDE` unset: the
// replay of each equals the row (the BELOW arms), and a twin that sets `LABEL_SIDE` before the preprocessor runs gives
// (a) the BELOW arms' state under `BELOW` identical to the row's state under `UNKNOWN` and (b) the ABOVE arms' alignments
// and anchor-relative sides that the Java code fixes per side. No numeric expectation is derived by hand (AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow, type LabelsStepsResult } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { isStopRow, loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { HorizontalLabelAlignment } from '../../common/nodespacing/cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../common/nodespacing/cellsystem/VerticalLabelAlignment.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

/**
 * The recorded rows that stop right after the preprocessor: the head-tail scenarios reach the EAST and WEST ports (the
 * direction preprocessor has turned every layout to left-to-right), the `northSouthPorts` models the NORTH and SOUTH ones.
 */
const DIRECTIONS = [
  'scenarios/EndLabelPreprocessor/head-tail/RIGHT',
  'scenarios/EndLabelPreprocessor/head-tail/LEFT',
  'scenarios/EndLabelPreprocessor/head-tail/DOWN',
  'scenarios/EndLabelPreprocessor/head-tail/UP',
  'models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default',
  'models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default',
  'models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default',
  'models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default',
] as const;
const PROCESSOR = 'END_LABEL_PREPROCESSOR';

/** The `LABEL_SIDE` every edge label is given before the preprocessor runs; `null`: untouched (the recorded state). */
let forcedSide: LabelSide | null = null;

/** The preprocessor wrapped so that it sees `forcedSide` on every label (`LabelSideSelector` would write it, `:380`). */
function withSide(inner: ILayoutProcessor<LGraph>, name: string): ILayoutProcessor<LGraph> {
  if (name !== PROCESSOR) {
    return inner;
  }
  return {
    process(graph: LGraph, monitor: IElkProgressMonitor): void {
      if (forcedSide !== null) {
        for (const layer of graph.getLayers()) {
          for (const node of layer.getNodes()) {
            for (const port of node.getPorts()) {
              for (const edge of port.getConnectedEdges()) {
                edge.getLabels().forEach((label) => label.setProperty(InternalProperties.LABEL_SIDE, forcedSide!));
              }
            }
          }
        }
      }
      inner.process(graph, monitor);
    },
  };
}

const factories: Factories = {
  createProcessor: (name) => withSide(IntermediateProcessorStrategy.valueOf(name).create(), name),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

const rowOf = (id: string): PipelineStopRow =>
  loadLabelsRows()
    .filter(isStopRow)
    .find((r) => r.id === id)!;

function replay(direction: string, side: LabelSide | null): { graph: LGraph; dump: LabelsExpected } {
  forcedSide = side;
  try {
    const row = rowOf(direction);
    const result: LabelsStepsResult =
      row.steps === null
        ? { graph: runRoutingPrefix(row, factories), components: null, terminal: null }
        : runLabelsRow(row, { factories, components: new ComponentsProcessor() });
    return { graph: result.graph, dump: labelsDump(result, row.expected as unknown as LabelsExpected) };
  } finally {
    forcedSide = null;
  }
}

interface Placed {
  readonly side: PortSide;
  readonly horizontal: HorizontalLabelAlignment | null;
  readonly vertical: VerticalLabelAlignment | null;
  readonly rect: readonly [number, number, number, number];
  readonly anchor: readonly [number, number];
}

/** Every end label cell of the graph with the side of its port, its alignments, its rectangle and the port anchor. */
function placedCells(graph: LGraph): Placed[] {
  const placed: Placed[] = [];
  for (const node of graph.getLayers().flatMap((layer) => layer.getNodes())) {
    for (const [port, cell] of node.getProperty(InternalProperties.END_LABELS) ?? []) {
      const rect = cell.getCellRectangle();
      placed.push({
        side: port.getSide(),
        horizontal: cell.getHorizontalAlignment(),
        vertical: cell.getVerticalAlignment(),
        rect: [rect.x, rect.y, rect.width, rect.height],
        anchor: [port.getPosition().x + port.getAnchor().x, port.getPosition().y + port.getAnchor().y],
      });
    }
  }
  return placed;
}

/** The Java-fixed alignments of `placeLabels` per side and label side (`EndLabelPreprocessor.java:279-345`), as names. */
function expectedAlignment(side: PortSide, above: boolean): string[] {
  const { LEFT, RIGHT } = HorizontalLabelAlignment;
  const { TOP, BOTTOM } = VerticalLabelAlignment;
  switch (side) {
    case PortSide.NORTH:
      return [above ? RIGHT : LEFT, BOTTOM].map(String);
    case PortSide.EAST:
      return [LEFT, above ? BOTTOM : TOP].map(String);
    case PortSide.SOUTH:
      return [above ? RIGHT : LEFT, TOP].map(String);
    default:
      return [RIGHT, above ? BOTTOM : TOP].map(String);
  }
}

/** Whether the rectangle lies on the Java-fixed ABOVE side of the port anchor (west/east: above it, north/south: left of it). */
function liesAbove(cell: Placed): boolean {
  const [x, y, width, height] = cell.rect;
  return cell.side === PortSide.EAST || cell.side === PortSide.WEST
    ? y + height < cell.anchor[1]
    : x + width < cell.anchor[0];
}

/** The names of the enum constants of a cell: `toEqual` equates any two field-less enum instances, so compare names. */
const alignmentOf = (cell: Placed): string[] => [String(cell.horizontal), String(cell.vertical)];
const cellNames = (cell: Placed): string[] => [String(cell.side), ...alignmentOf(cell)];

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('EndLabelPreprocessor per port side (T17a)', () => {
  it('finds the eight recorded rows', () => {
    expect(DIRECTIONS.map((direction) => rowOf(direction).id)).toHaveLength(8);
  });

  it('places end labels on all four port sides across the rows', () => {
    const sides = new Set(
      DIRECTIONS.flatMap((direction) => placedCells(replay(direction, null).graph).map((c) => c.side)),
    );
    // the enum constants have no own fields, so `toEqual` would equate any two: compare their names
    expect([...sides].map(String).sort()).toEqual(
      [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST].map(String).sort(),
    );
  });

  for (const direction of DIRECTIONS) {
    describe(direction, () => {
      it('replays the recorded row with LABEL_SIDE unset (the BELOW arms)', () => {
        // oracle: <row id above>; EndLabelPreprocessor.java:279-345
        const { dump } = replay(direction, null);
        expect(compareLabels(dump, rowOf(direction).expected as unknown as LabelsExpected)).toEqual([]);
      });

      it('gives the recorded cells under BELOW and the Java alignments of the non-ABOVE arms', () => {
        const recorded = placedCells(replay(direction, null).graph);
        const below = placedCells(replay(direction, LabelSide.BELOW).graph);
        expect(recorded.length).toBeGreaterThan(0);
        expect(below.map(cellNames)).toEqual(recorded.map(cellNames));
        expect(below.map((cell) => cell.rect)).toEqual(recorded.map((cell) => cell.rect));
        for (const cell of below) {
          // EndLabelPreprocessor.java:279-345, the else arms
          expect(alignmentOf(cell)).toEqual(expectedAlignment(cell.side, false));
        }
      });

      it('takes the ABOVE arms: the Java alignments, the cell on the above side of the anchor (java:285,305,325,345)', () => {
        const above = placedCells(replay(direction, LabelSide.ABOVE).graph);
        const recorded = placedCells(replay(direction, null).graph);
        expect(above).toHaveLength(recorded.length);
        for (const cell of above) {
          expect(alignmentOf(cell)).toEqual(expectedAlignment(cell.side, true));
          expect(liesAbove(cell)).toBe(true);
        }
        expect(recorded.some(liesAbove)).toBe(false);
      });
    });
  }
});
