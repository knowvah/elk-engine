// SPDX-License-Identifier: EPL-2.0
// Proof of HierarchicalNodeResizingProcessor (mission 7h, T5).
//   structure   what follows from the Java text with no numeric derivation: which methods run for a nested vs. a root graph
//               (`resizeNode` is stubbed to observe the call, `getExternalPortPosition` returns a stub vector).
//   twin        `ElkLayeredResize.resizeGraph` is the other Java copy (`ElkLayered.java:675-772`). The two copies are textually
//               identical except for the `NODE_SIZE_FIXED_GRAPH_SIZE` guard (`ElkLayered.java:702`, absent at
//               `HierarchicalNodeResizingProcessor.java:163`) and comments. So on a graph with that flag false they must leave
//               the same size, offset and external-port positions; with the flag true the processor must equal the twin run
//               on the unflagged graph, while the twin leaves the flagged graph untouched. Every input is a builder value; the
//               only expectations are the other copy's outputs (L4, twin comparison).
//   rows        the T1 `models` stops after the resizer, replayed through the real driver with no spy (T8 wired the enum arm).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
} from '../../../../test/helpers/layered-compound-replay-rows.js';
import { HIERARCHICAL_NODE_RESIZER } from '../../../../test/helpers/layered-compound-replay-run.js';
import { runToStop } from '../../../../test/helpers/layered-compound-replay-stops.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { ContentAlignment } from '../../../core/options/ContentAlignment.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../core/options/SizeOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { DEFAULT_MIN_HEIGHT, DEFAULT_MIN_WIDTH } from '../../../core/util/ElkUtil.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { resizeGraph as twinResizeGraph } from '../ElkLayeredResize.js';
import { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { Layer } from '../graph/Layer.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { HierarchicalNodeResizingProcessor } from './HierarchicalNodeResizingProcessor.js';

const run = (graph: LGraph): void => new HierarchicalNodeResizingProcessor().process(graph, new BasicProgressMonitor());

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------------------------------------------------
// builders

interface Shape {
  readonly layered: boolean;
  readonly constraints?: readonly SizeConstraint[];
  readonly options?: readonly SizeOptions[];
  readonly minimum?: readonly [number, number];
  readonly alignment?: readonly ContentAlignment[];
  readonly externalPorts?: boolean;
  readonly fixedGraphSize?: boolean;
}

interface Built {
  readonly graph: LGraph;
  readonly dummies: readonly LNode[];
  readonly plain: LNode;
}

function dummyOn(graph: LGraph, side: PortSide, x: number, y: number): LNode {
  const dummy = new LNode(graph);
  dummy.setType(NodeType.EXTERNAL_PORT);
  dummy.setProperty(InternalProperties.EXT_PORT_SIDE, side);
  dummy.getPosition().x = x;
  dummy.getPosition().y = y;
  return dummy;
}

function addAll<E extends { readonly ordinal: () => number }>(
  set: EnumSet<E>,
  members: readonly E[] | undefined,
): void {
  for (const member of members ?? []) {
    set.add(member);
  }
}

/** The graph's size, padding and the options `resizeGraph` reads. */
function configure(shape: Shape): LGraph {
  const graph = new LGraph();
  graph.getSize().x = 100;
  graph.getSize().y = 50;
  graph.getPadding().left = 5;
  graph.getPadding().right = 7;
  graph.getPadding().top = 3;
  graph.getPadding().bottom = 11;
  graph.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, EnumSet.noneOf(SizeConstraint));
  addAll(graph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS), shape.constraints);
  graph.setProperty(LayeredOptions.NODE_SIZE_OPTIONS, EnumSet.noneOf(SizeOptions));
  addAll(graph.getProperty(LayeredOptions.NODE_SIZE_OPTIONS), shape.options);
  graph.setProperty(LayeredOptions.NODE_SIZE_MINIMUM, new KVector(shape.minimum?.[0] ?? 0, shape.minimum?.[1] ?? 0));
  graph.setProperty(LayeredOptions.CONTENT_ALIGNMENT, EnumSet.noneOf(ContentAlignment));
  addAll(graph.getProperty(LayeredOptions.CONTENT_ALIGNMENT), shape.alignment);
  graph.setProperty(LayeredOptions.NODE_SIZE_FIXED_GRAPH_SIZE, shape.fixedGraphSize === true);
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  if (shape.externalPorts === true) {
    graph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.EXTERNAL_PORTS);
  }
  return graph;
}

/** A graph holding a layerless node, a normal node and EAST/SOUTH/WEST dummies; `layered` puts the last four into two layers. */
function build(shape: Shape): Built {
  const graph = configure(shape);
  const first = new LNode(graph);
  graph.getLayerlessNodes().push(first);
  const plain = new LNode(graph);
  const dummies = [
    dummyOn(graph, PortSide.EAST, 11, 12),
    dummyOn(graph, PortSide.SOUTH, 21, 22),
    dummyOn(graph, PortSide.WEST, 31, 32),
  ];
  const members = [plain, ...dummies];
  if (shape.layered) {
    const layers = [new Layer(graph), new Layer(graph)];
    graph.getLayers().push(...layers);
    members.forEach((node, index) => {
      node.setGraph(null);
      node.setLayer(layers[index < 2 ? 0 : 1]!);
    });
  } else {
    graph.getLayerlessNodes().push(...members);
  }
  return { graph, dummies, plain };
}

/** What `resizeGraph` may change: the size, the offset and every node position. */
function resized(built: Built): unknown {
  const { graph } = built;
  return {
    size: [graph.getSize().x, graph.getSize().y],
    offset: [graph.getOffset().x, graph.getOffset().y],
    positions: graph.getLayerlessNodes().map((node) => [node.getPosition().x, node.getPosition().y]),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// structure

describe('HierarchicalNodeResizingProcessor (structure, from the Java text)', () => {
  it('moves the layers nodes to the layerless list after the existing ones and empties the layers (:56-63)', () => {
    const { graph, plain, dummies } = build({ layered: true });
    const [first] = graph.getLayerlessNodes();
    const layers = [...graph.getLayers()];
    run(graph);
    expect(graph.getLayerlessNodes()).toEqual([first, plain, ...dummies]);
    expect(graph.getLayerlessNodes()[0]).toBe(first);
    expect(graph.getLayerlessNodes().slice(1)).toHaveLength(4);
    expect(graph.getLayers()).toHaveLength(0);
    expect(layers.map((layer) => layer.getNodes().length)).toEqual([0, 0]);
    expect([plain, ...dummies].map((node) => node.getLayer())).toEqual([null, null, null, null]);
  });

  it('runs a root graph through resizeGraph only: no parent node, no resizeNode, no external port position', () => {
    const resizeNode = vi.spyOn(LGraphUtil, 'resizeNode');
    const portPosition = vi.spyOn(LGraphUtil, 'getExternalPortPosition');
    const { graph } = build({ layered: true });
    expect(graph.getParentNode()).toBeNull();
    run(graph);
    expect(resizeNode).not.toHaveBeenCalled();
    expect(portPosition).not.toHaveBeenCalled();
  });

  /** A nested graph in a parent node of its own graph; `resizeNode` is observed, not run. */
  function nested(shape: Shape): { readonly parent: LNode; readonly child: Built } {
    const outer = new LGraph();
    outer.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    const parent = new LNode(outer);
    const child = build(shape);
    child.graph.setParentNode(parent);
    parent.setNestedGraph(child.graph);
    return { parent, child };
  }

  it('transfers a nested graph without external ports to its parent node, leaving the ports to the next layouter', () => {
    const resizeNode = vi.spyOn(LGraphUtil, 'resizeNode').mockImplementation(() => undefined);
    const { parent, child } = nested({ layered: true });
    run(child.graph);
    expect(resizeNode).toHaveBeenCalledTimes(1);
    const [node, size, movePorts, moveLabels] = resizeNode.mock.calls[0]!;
    expect(node).toBe(parent);
    expect(size.equals(child.graph.getActualSize())).toBe(true);
    expect([movePorts, moveLabels]).toEqual([true, true]);
    expect(parent.hasProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(false);
    expect(
      parent.getGraph()!.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.NON_FREE_PORTS),
    ).toBe(false);
  });

  it('fixes the parent ports and marks its graph NON_FREE_PORTS when the nested graph has external ports', () => {
    const resizeNode = vi.spyOn(LGraphUtil, 'resizeNode').mockImplementation(() => undefined);
    const { parent, child } = nested({ layered: true, externalPorts: true });
    run(child.graph);
    const [node, size, movePorts, moveLabels] = resizeNode.mock.calls[0]!;
    expect(node).toBe(parent);
    expect(size.equals(child.graph.getActualSize())).toBe(true);
    expect([movePorts, moveLabels]).toEqual([false, true]);
    expect(String(parent.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toBe(String(PortConstraints.FIXED_POS));
    expect(
      parent.getGraph()!.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.NON_FREE_PORTS),
    ).toBe(true);
  });

  it('copies the external port position and side onto the origin port of a dummy with an LPort origin only', () => {
    vi.spyOn(LGraphUtil, 'resizeNode').mockImplementation(() => undefined);
    const stub = new KVector(41, 43);
    const portPosition = vi.spyOn(LGraphUtil, 'getExternalPortPosition').mockReturnValue(stub);
    const { child } = nested({ layered: true, externalPorts: true });
    const port = new LPort();
    port.getSize().x = 2;
    port.getSize().y = 3;
    const [east, south] = child.dummies as [LNode, LNode];
    east.setProperty(InternalProperties.ORIGIN, port);
    south.setProperty(InternalProperties.ORIGIN, 'not a port');
    run(child.graph);
    expect(portPosition).toHaveBeenCalledTimes(1);
    expect(portPosition.mock.calls[0]).toEqual([child.graph, east, 2, 3]);
    expect([port.getPosition().x, port.getPosition().y]).toEqual([41, 43]);
    expect(String(port.getSide())).toBe(String(PortSide.EAST));
  });

  it('is a stateless processor of its own class (the engine and the replay helpers name it by constructor)', () => {
    const processor: ILayoutProcessor<LGraph> = new HierarchicalNodeResizingProcessor();
    expect(processor.constructor.name).toBe('HierarchicalNodeResizingProcessor');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// twin: ElkLayeredResize.resizeGraph (the other Java copy)

const MIN_BIGGER: readonly [number, number] = [300, 200];
const TWIN_SHAPES: readonly (readonly [string, Omit<Shape, 'layered'>])[] = [
  ['no constraints', {}],
  ['minimum size, bigger than the graph', { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: MIN_BIGGER }],
  ['minimum size, smaller than the graph', { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: [1, 1] }],
  [
    'minimum size, unset, with the default minimum',
    { constraints: [SizeConstraint.MINIMUM_SIZE], options: [SizeOptions.DEFAULT_MINIMUM_SIZE] },
  ],
  [
    'minimum size, one side unset, with the default minimum',
    { constraints: [SizeConstraint.MINIMUM_SIZE], options: [SizeOptions.DEFAULT_MINIMUM_SIZE], minimum: [999, 0] },
  ],
  [
    'minimum size, the other side unset, with the default minimum',
    { constraints: [SizeConstraint.MINIMUM_SIZE], options: [SizeOptions.DEFAULT_MINIMUM_SIZE], minimum: [0, 999] },
  ],
  ['minimum size, unset, without the default minimum', { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: [0, 0] }],
  [
    'H_CENTER and V_CENTER',
    {
      constraints: [SizeConstraint.MINIMUM_SIZE],
      minimum: MIN_BIGGER,
      alignment: [ContentAlignment.H_CENTER, ContentAlignment.V_CENTER],
    },
  ],
  [
    'H_RIGHT and V_BOTTOM',
    {
      constraints: [SizeConstraint.MINIMUM_SIZE],
      minimum: MIN_BIGGER,
      alignment: [ContentAlignment.H_RIGHT, ContentAlignment.V_BOTTOM],
    },
  ],
  [
    'H_LEFT and V_TOP',
    {
      constraints: [SizeConstraint.MINIMUM_SIZE],
      minimum: MIN_BIGGER,
      alignment: [ContentAlignment.H_LEFT, ContentAlignment.V_TOP],
    },
  ],
  [
    'external ports, bigger in both directions',
    { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: MIN_BIGGER, externalPorts: true },
  ],
  [
    'external ports, bigger in x only',
    { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: [300, 1], externalPorts: true },
  ],
  [
    'external ports, bigger in y only',
    { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: [1, 200], externalPorts: true },
  ],
  ['external ports, not bigger', { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: [1, 1], externalPorts: true }],
  ['bigger, no external ports flag', { constraints: [SizeConstraint.MINIMUM_SIZE], minimum: MIN_BIGGER }],
];

describe('HierarchicalNodeResizingProcessor (twin of ElkLayeredResize.resizeGraph, flag NODE_SIZE_FIXED_GRAPH_SIZE false)', () => {
  it.each(TWIN_SHAPES)('leaves what the other copy leaves: %s', (_title, shape) => {
    const twin = build({ ...shape, layered: false });
    twinResizeGraph(twin.graph);
    const mine = build({ ...shape, layered: true });
    run(mine.graph);
    expect(resized(mine)).toEqual(resized(twin));
  });

  it('moves the EAST dummy by the width growth, the SOUTH dummy by the height growth, and no other node', () => {
    // the shape is one of the twin rows above; the expectations are the ELK twin's own positions, not derived here
    const shape: Shape = {
      layered: true,
      constraints: [SizeConstraint.MINIMUM_SIZE],
      minimum: MIN_BIGGER,
      externalPorts: true,
    };
    const before = build(shape);
    const after = build(shape);
    run(after.graph);
    const [east, south, west] = after.dummies as [LNode, LNode, LNode];
    const [eastBefore, southBefore, westBefore] = before.dummies as [LNode, LNode, LNode];
    expect(east.getPosition().x).not.toBe(eastBefore.getPosition().x);
    expect(east.getPosition().y).toBe(eastBefore.getPosition().y);
    expect(south.getPosition().y).not.toBe(southBefore.getPosition().y);
    expect(south.getPosition().x).toBe(southBefore.getPosition().x);
    expect([west.getPosition().x, west.getPosition().y]).toEqual([
      westBefore.getPosition().x,
      westBefore.getPosition().y,
    ]);
    expect(after.plain.getPosition().x).toBe(before.plain.getPosition().x);
  });

  it('defaults an unset minimum to the ElkUtil default only under DEFAULT_MINIMUM_SIZE', () => {
    const withDefault = build({
      layered: true,
      constraints: [SizeConstraint.MINIMUM_SIZE],
      options: [SizeOptions.DEFAULT_MINIMUM_SIZE],
    });
    run(withDefault.graph);
    const minimum = withDefault.graph.getProperty(LayeredOptions.NODE_SIZE_MINIMUM);
    expect([minimum.x, minimum.y]).toEqual([DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT]);
    const without = build({ layered: true, constraints: [SizeConstraint.MINIMUM_SIZE] });
    run(without.graph);
    const unset = without.graph.getProperty(LayeredOptions.NODE_SIZE_MINIMUM);
    expect([unset.x, unset.y]).toEqual([0, 0]);
  });
});

describe('HierarchicalNodeResizingProcessor (NODE_SIZE_FIXED_GRAPH_SIZE true: no guard, unlike ElkLayeredResize)', () => {
  const grows: Omit<Shape, 'layered'> = {
    constraints: [SizeConstraint.MINIMUM_SIZE],
    minimum: MIN_BIGGER,
    alignment: [ContentAlignment.H_CENTER, ContentAlignment.V_BOTTOM],
    externalPorts: true,
  };

  it('resizes the graph anyway: it equals the twin run on the unflagged graph', () => {
    const flagged = build({ ...grows, layered: true, fixedGraphSize: true });
    run(flagged.graph);
    const twinUnflagged = build({ ...grows, layered: false });
    twinResizeGraph(twinUnflagged.graph);
    expect(resized(flagged)).toEqual(resized(twinUnflagged));
  });

  it('differs from the twin, which leaves the flagged graph as it was', () => {
    const flagged = build({ ...grows, layered: true, fixedGraphSize: true });
    run(flagged.graph);
    const twinFlagged = build({ ...grows, layered: false, fixedGraphSize: true });
    const untouched = resized(twinFlagged);
    twinResizeGraph(twinFlagged.graph);
    expect(resized(twinFlagged)).toEqual(untouched);
    expect(resized(flagged)).not.toEqual(untouched);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// rows

const resizerRows: readonly CompoundModelsRow[] = loadCompoundRowsIfPresent('models')
  .filter(isCompoundModelsRow)
  .filter((row) => row.expected.stop.processor === HIERARCHICAL_NODE_RESIZER);

describe('HierarchicalNodeResizingProcessor (T1 models stops after the resizer)', () => {
  it('has recorded rows', () => {
    expect(resizerRows.length).toBeGreaterThan(0);
  });

  it.each(resizerRows.map((row) => [row.id, row] as const))('reproduces the tree of %s', (_id, row) => {
    expect(runToStop(row).diffs).toEqual([]);
  });
});
