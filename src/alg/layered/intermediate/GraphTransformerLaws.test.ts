// SPDX-License-Identifier: EPL-2.0
// GraphTransformer (mission 7f, T5): what no oracle row reaches. The recorded rows all use the default
// `READING_DIRECTION` congruency and carry no node `ALIGNMENT`, so the `ROTATION` dispatch (`GraphTransformer.java:106-138`),
// the alignment cases (`:226-233`, `:425-432`, `:831-844`) and the layer-constraint cases (`:370-386`, `:795-811`) are proven by
// twin comparison and by the round-trip law, not by a hand-derived value (F16): the two modes are inverse transformations, so
// `TO_INTERNAL_LTR` followed by `TO_INPUT_DIRECTION` restores the graph, and each rotation is the composition of the
// reading-direction transformations the row-proven branches perform.
import { beforeAll, describe, expect, it } from 'vitest';
// the enum first: tests enter through it, never through the class (E1/F10, module cycle)
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { normalise } from '../../../../test/helpers/layered-phase-replay-normalise.js';
import { loadPipelineRows } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { DirectionCongruency } from '../options/DirectionCongruency.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';

void IntermediateProcessorStrategy;

const PIPELINE_FILE = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const SCENARIO = 'scenarios/GraphTransformer/UP/labels/pre';
const GRAPH_SIZE = 100;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

function run(graph: LGraph, mode: Mode, direction: Direction, congruency: DirectionCongruency): void {
  graph.setProperty(LayeredOptions.DIRECTION, direction);
  graph.setProperty(LayeredOptions.DIRECTION_CONGRUENCY, congruency);
  new GraphTransformer(mode).process(graph, new NullElkProgressMonitor());
}

/** The labels scenario of the rows, normalised, with distinct node positions so a mirror or a transpose shows. */
function scenarioGraph(): { graph: LGraph; snapshot: () => unknown } {
  const row = loadPipelineRows(PIPELINE_FILE).find((r) => r.id === SCENARIO)!;
  const imported = importRow(row as never);
  const { graph } = imported;
  normalise(graph);
  graph.getLayerlessNodes().forEach((node, i) => {
    node.getPosition().x = 7 * i + 1;
    node.getPosition().y = 3 * i + 2;
  });
  return {
    graph,
    snapshot: () => JSON.parse(JSON.stringify(routingDump(graph, imported.importDump).geometry)) as unknown,
  };
}

type Step = readonly [Direction, Mode];
const { LEFT, DOWN, UP } = { LEFT: Direction.LEFT, DOWN: Direction.DOWN, UP: Direction.UP };
const { TO_INTERNAL_LTR: INTERNAL, TO_INPUT_DIRECTION: INPUT } = Mode;
const READING = DirectionCongruency.READING_DIRECTION;
const ROTATION = DirectionCongruency.ROTATION;

/** What the reading-direction transformations compose to (Java `rotate90Clockwise`, `rotate90CounterClockwise`, mirror X, mirror Y). */
function sequences(): Record<string, Step[]> {
  const mirrorX: Step[] = [[LEFT, INTERNAL]];
  const transpose: Step[] = [[DOWN, INTERNAL]];
  const mirrorY: Step[] = [[UP, INPUT], ...transpose]; // reading UP / TO_INPUT is mirrorAllY then transposeAll
  return {
    clockwise: [...transpose, ...mirrorX],
    counterClockwise: [...mirrorX, ...transpose],
    leftRotation: [...mirrorX, ...mirrorY],
  };
}

describe('GraphTransformer ROTATION dispatch (twin: the composition of reading-direction runs)', () => {
  const seq = sequences();
  const cases: readonly [Direction, Mode, keyof ReturnType<typeof sequences>][] = [
    [DOWN, INTERNAL, 'clockwise'],
    [UP, INPUT, 'clockwise'],
    [UP, INTERNAL, 'counterClockwise'],
    [DOWN, INPUT, 'counterClockwise'],
    [LEFT, INTERNAL, 'leftRotation'],
    [LEFT, INPUT, 'leftRotation'],
  ];
  it.each(cases)('%s with %s equals %s', (direction, mode, name) => {
    const rotated = scenarioGraph();
    const initial = rotated.snapshot();
    run(rotated.graph, mode, direction, ROTATION);
    const composed = scenarioGraph();
    for (const [d, m] of seq[name]!) {
      run(composed.graph, m, d, READING);
    }
    composed.graph.setProperty(LayeredOptions.DIRECTION, direction);
    composed.graph.setProperty(LayeredOptions.DIRECTION_CONGRUENCY, ROTATION);
    rotated.graph.setProperty(LayeredOptions.DIRECTION, direction);
    expect(rotated.snapshot()).toEqual(composed.snapshot());
    expect(rotated.snapshot()).not.toEqual(initial);
  });
});

/** A graph of fixed size with a node that holds the given alignment and an external port dummy with the given constraints. */
function lawGraph(alignment: Alignment, layer: LayerConstraint, inLayer: InLayerConstraint): LGraph {
  const graph = new LGraph();
  graph.getSize().x = GRAPH_SIZE;
  graph.getSize().y = GRAPH_SIZE;
  const node = addNode(graph);
  node.getSize().x = 20;
  node.getSize().y = 10;
  node.setProperty(LayeredOptions.ALIGNMENT, alignment);
  const dummy = addNode(graph, NodeType.EXTERNAL_PORT);
  dummy.setProperty(InternalProperties.EXT_PORT_SIDE, PortSide.NORTH);
  dummy.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, layer);
  dummy.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, inLayer);
  addPort(dummy, PortSide.EAST);
  return graph;
}

const state = (graph: LGraph): unknown[] =>
  graph
    .getLayerlessNodes()
    .map((n) => [
      n.getProperty(LayeredOptions.ALIGNMENT).toString(),
      n.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT).toString(),
      n.getProperty(InternalProperties.IN_LAYER_CONSTRAINT).toString(),
      n.getProperty(InternalProperties.EXT_PORT_SIDE).toString(),
    ]);

describe('GraphTransformer round trip (TO_INTERNAL_LTR then TO_INPUT_DIRECTION restores the properties)', () => {
  const alignments = [Alignment.LEFT, Alignment.RIGHT, Alignment.TOP, Alignment.BOTTOM];
  const layers = [
    LayerConstraint.FIRST,
    LayerConstraint.FIRST_SEPARATE,
    LayerConstraint.LAST,
    LayerConstraint.LAST_SEPARATE,
  ];
  const inLayers = [InLayerConstraint.TOP, InLayerConstraint.BOTTOM];
  const directions = [LEFT, DOWN, UP];

  /** Round-trips the graph under every direction: always restored; reports whether any direction changed it. */
  function roundTrips(make: () => LGraph, congruency: DirectionCongruency): boolean {
    let changed = false;
    for (const direction of directions) {
      const graph = make();
      const before = state(graph);
      run(graph, INTERNAL, direction, congruency);
      changed ||= JSON.stringify(state(graph)) !== JSON.stringify(before);
      run(graph, INPUT, direction, congruency);
      expect(state(graph)).toEqual(before);
    }
    return changed;
  }

  for (const congruency of [READING, ROTATION]) {
    it.each(alignments)(`${congruency.toString()}: alignment %s is restored and moved by some direction`, (a) => {
      expect(roundTrips(() => lawGraph(a, LayerConstraint.NONE, InLayerConstraint.NONE), congruency)).toBe(true);
    });

    it.each(layers)(`${congruency.toString()}: layer constraint %s is restored and moved by some direction`, (l) => {
      expect(roundTrips(() => lawGraph(Alignment.CENTER, l, InLayerConstraint.NONE), congruency)).toBe(true);
    });

    it.each(inLayers)(
      `${congruency.toString()}: in-layer constraint %s is restored and moved by some direction`,
      (i) => {
        expect(roundTrips(() => lawGraph(Alignment.CENTER, LayerConstraint.NONE, i), congruency)).toBe(true);
      },
    );
  }
});
