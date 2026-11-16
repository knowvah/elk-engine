// SPDX-License-Identifier: EPL-2.0
// Proof of ElkGraphImporter (mission 8b, T6): importGraph against the `import` stops of test/golden/refs/java/{force,stress}.json at the
// AD-4 bar (every other number of the rows is the recorder's), plus Java-traced hand cases for the branches no row reaches (L4:
// expectations from the Java source, the line named in the test).
import { describe, expect, it } from 'vitest';
import {
  classify,
  compareState,
  dumpState,
  formatDifferences,
  registerForce,
} from '../../../test/helpers/force-replay-dump.js';
import {
  findStop,
  FORCE_REFS,
  loadForceRows,
  STEP_IMPORT,
  stopOf,
  type ForceRef,
} from '../../../test/helpers/force-replay-rows.js';
import { dumpOptionsOf, runImport } from '../../../test/helpers/force-replay-run.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import { FBendpoint } from './graph/FBendpoint.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

const HEAVY = { timeout: 60_000 } as const;
const IMPORT_STOPS = { force: 194, stress: 108 } as const;

registerForce();

describe.each(FORCE_REFS)('ElkGraphImporter.importGraph against the %s ref', (ref: ForceRef) => {
  const rows = loadForceRows(ref, 'stops');

  it(`replays the ${String(IMPORT_STOPS[ref])} recorded import stops`, HEAVY, () => {
    const withStop = rows.filter((row) => findStop(row, STEP_IMPORT) !== undefined);
    expect(withStop).toHaveLength(IMPORT_STOPS[ref]);
    const failing = withStop.flatMap((row) => {
      const differences = compareState(stopOf(row, STEP_IMPORT).state, dumpState(runImport(row), dumpOptionsOf(row)));
      return differences.length === 0 ? [] : [`${row.id}\n${formatDifferences(differences, 3)}`];
    });
    expect(failing).toEqual([]);
  });

  it('classifies no import stop as differing', HEAVY, () => {
    const classes = rows.map((row) =>
      classify(stopOf(row, STEP_IMPORT).state, dumpState(runImport(row), dumpOptionsOf(row))),
    );
    expect(classes.filter((c) => c === 'differs')).toEqual([]);
  });
});

/** A graph of two nodes joined by one edge, built bottom-up the way ForceImportTest does. */
function twoNodes(): { graph: ElkNode; n1: ElkNode; n2: ElkNode } {
  const graph = ElkGraphUtil.createGraph();
  const n1 = ElkGraphUtil.createNode(graph);
  const n2 = ElkGraphUtil.createNode(graph);
  return { graph, n1, n2 };
}

describe('ElkGraphImporter.importGraph, Java-traced cases', () => {
  it('ElkGraphImporter.java:70: a node takes the text of its first label, an unlabelled node the empty string', () => {
    const { graph, n1 } = twoNodes();
    ElkGraphUtil.createLabelWithText('first', n1);
    ElkGraphUtil.createLabelWithText('second', n1);
    const fgraph = new ElkGraphImporter().importGraph(graph);
    expect(fgraph.getNodes().map((n) => n.getLabel())).toEqual(['first', '']);
  });

  it('ElkGraphImporter.java:78-83: the position is the centre, the size at least 1, ids count from 0', () => {
    const { graph, n1, n2 } = twoNodes();
    n1.setLocation(10, 20);
    n1.setDimensions(30, 40);
    n2.setLocation(-4, 6);
    n2.setDimensions(0, 0.5);
    const [a, b] = new ElkGraphImporter().importGraph(graph).getNodes();
    expect([a!.id, a!.getPosition().x, a!.getPosition().y, a!.getSize().x, a!.getSize().y]).toEqual([
      0, 25, 40, 30, 40,
    ]);
    expect([b!.id, b!.getPosition().x, b!.getPosition().y, b!.getSize().x, b!.getSize().y]).toEqual([
      1, -4, 6.25, 1, 1,
    ]);
  });

  it('ElkGraphImporter.java:53-56: the graph copies the properties of the ElkGraph and remembers it as its origin', () => {
    const { graph } = twoNodes();
    graph.setProperty(ForceOptions.ITERATIONS, 17);
    const fgraph = new ElkGraphImporter().importGraph(graph);
    expect(fgraph.getProperty(ForceOptions.ITERATIONS)).toBe(17);
    expect(fgraph.getProperty(InternalProperties.ORIGIN)).toBe(graph);
  });

  it('ElkGraphImporter.java:91-94: an UNDEFINED or explicit port-constraints option is read and changes nothing', () => {
    const { graph, n1, n2 } = twoNodes();
    n1.setProperty(ForceOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    n2.setProperty(ForceOptions.PORT_CONSTRAINTS, PortConstraints.UNDEFINED);
    const nodes = new ElkGraphImporter().importGraph(graph).getNodes();
    expect(nodes.map((n) => n.getProperty(ForceOptions.PORT_CONSTRAINTS))).toEqual([
      PortConstraints.FIXED_ORDER,
      PortConstraints.UNDEFINED,
    ]);
  });

  it('ElkGraphImporter.java:112-114: a hyperedge throws UnsupportedGraphException', () => {
    const { graph, n1, n2 } = twoNodes();
    const n3 = ElkGraphUtil.createNode(graph);
    const edge = ElkGraphUtil.createSimpleEdge(n1, n2);
    edge.getTargets().add(n3);
    expect(() => new ElkGraphImporter().importGraph(graph)).toThrow(
      new UnsupportedGraphException('Graph must not contain hyperedges.'),
    );
  });

  it('ElkGraphImporter.java:126-127: a self-loop and a hierarchy-crossing edge are not imported', () => {
    const { graph, n1, n2 } = twoNodes();
    const inner = ElkGraphUtil.createNode(n1);
    ElkGraphUtil.createSimpleEdge(n1, n1);
    ElkGraphUtil.createSimpleEdge(inner, n2);
    ElkGraphUtil.createSimpleEdge(n1, n2);
    const fgraph = new ElkGraphImporter().importGraph(graph);
    expect(fgraph.getEdges()).toHaveLength(1);
    expect(fgraph.getEdges()[0]!.getSource()!.id).toBe(0);
    expect(fgraph.getEdges()[0]!.getTarget()!.id).toBe(1);
  });

  it('ElkGraphImporter.java:140-147: an edge label is imported with size at least 1 and a refreshed position', () => {
    const { graph, n1, n2 } = twoNodes();
    n1.setDimensions(10, 10);
    n2.setLocation(100, 0);
    n2.setDimensions(10, 10);
    const edge = ElkGraphUtil.createSimpleEdge(n1, n2);
    const label = ElkGraphUtil.createLabelWithText('l', edge);
    label.setDimensions(8, 0);
    label.setProperty(ForceOptions.EDGE_LABELS_INLINE, true);
    const [flabel] = new ElkGraphImporter().importGraph(graph).getLabels();
    // inline: src centre (5,5), tgt centre (105,5), midpoint (55,5), minus half the label size (4, 0.5)
    expect([flabel!.getText(), flabel!.getSize().x, flabel!.getSize().y]).toEqual(['l', 8, 1]);
    expect([flabel!.getPosition().x, flabel!.getPosition().y]).toEqual([51, 4.5]);
    expect(flabel!.getProperty(InternalProperties.ORIGIN)).toBe(label);
  });

  it('ElkGraphImporter.java:134: the edge keeps its origin and the nodes it joins', () => {
    const { graph, n1, n2 } = twoNodes();
    const edge = ElkGraphUtil.createSimpleEdge(n2, n1);
    const [fedge] = new ElkGraphImporter().importGraph(graph).getEdges();
    expect(fedge!.getProperty(InternalProperties.ORIGIN)).toBe(edge);
    expect([fedge!.getSource()!.id, fedge!.getTarget()!.id]).toEqual([1, 0]);
  });
});

describe('ElkGraphImporter.applyLayout, Java-traced cases', () => {
  /** Two nodes 40 wide and 20 high at centres (100, 50) and (300, 50), an edge with a bend point and a label. */
  function laidOut() {
    const { graph, n1, n2 } = twoNodes();
    n1.setDimensions(40, 20);
    n2.setDimensions(40, 20);
    const edge = ElkGraphUtil.createSimpleEdge(n1, n2);
    const label = ElkGraphUtil.createLabelWithText('l', edge);
    label.setDimensions(10, 6);
    const importer = new ElkGraphImporter();
    const fgraph = importer.importGraph(graph);
    const [f1, f2] = fgraph.getNodes();
    f1!.getPosition().x = 100;
    f1!.getPosition().y = 50;
    f2!.getPosition().x = 300;
    f2!.getPosition().y = 50;
    return { graph, n1, n2, edge, label, importer, fgraph };
  }

  it('ElkGraphImporter.java:164-196: nodes move so the bounding box starts at the padding', () => {
    const { graph, n1, n2, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(7, 3, 5, 11));
    importer.applyLayout(fgraph);
    // minX = 80, minY = 40; offset = (11 - 80, 7 - 40); node location = centre + offset - size / 2
    expect([n1.getX(), n1.getY()]).toEqual([11, 7]);
    expect([n2.getX(), n2.getY()]).toEqual([211, 7]);
  });

  it('ElkGraphImporter.java:230-238: the graph is resized to the bounding box plus padding and records the child area', () => {
    const { graph, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(7, 3, 5, 11));
    importer.applyLayout(fgraph);
    // bounding box 80..320 by 40..60 = 240 x 20; padding 14 horizontal, 12 vertical
    expect([graph.getWidth(), graph.getHeight()]).toEqual([254, 32]);
    expect(graph.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(240);
    expect(graph.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(20);
  });

  it('ElkGraphImporter.java:232: a fixed graph size keeps the size but still records the child area', () => {
    const { graph, importer, fgraph } = laidOut();
    graph.setDimensions(1000, 900);
    graph.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    importer.applyLayout(fgraph);
    expect([graph.getWidth(), graph.getHeight()]).toEqual([1000, 900]);
    expect(graph.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(240);
  });

  it('ElkGraphImporter.java:202-221: an edge section runs between the docking points through the bend points, shifted by the offset', () => {
    const { graph, edge, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(0));
    importer.applyLayout(fgraph);
    // offset = (0 - 80, 0 - 40); source point (120, 50) clipped at the node border, target (280, 50)
    const section = ElkGraphUtil.firstEdgeSection(edge, false, false);
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([40, 10, 200, 10]);
  });

  it('ElkGraphImporter.java:174-180, 205-208: a bend point widens the bounds and becomes a bend point of the section', () => {
    const { graph, edge, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(0));
    const bend = new FBendpoint(fgraph.getEdges()[0]!);
    bend.getPosition().x = 200;
    bend.getPosition().y = 130;
    fgraph.getBendpoints().push(bend);
    importer.applyLayout(fgraph);
    // bounds 80..320 by 40..130: the child area grows to 90 high and the bend point is shifted by (-80, -40)
    expect(graph.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(90);
    const [bendPoint] = ElkGraphUtil.firstEdgeSection(edge, false, false).getBendPoints();
    expect([bendPoint!.getX(), bendPoint!.getY()]).toEqual([120, 90]);
  });

  it('ElkGraphImporter.java:191-192: a node whose origin is not an ElkNode keeps no new location but still counts for the bounds', () => {
    const { n1, n2, graph, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(0));
    fgraph.getNodes()[1]!.setProperty(InternalProperties.ORIGIN, 'not an ElkNode');
    importer.applyLayout(fgraph);
    // bounds 80..320 as before: n1 moves to (0, 0), n2 stays where it was (0, 0 by default, never set)
    expect([n1.getX(), n1.getY(), n2.getX(), n2.getY()]).toEqual([0, 0, 0, 0]);
    expect(graph.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(240);
  });

  it('ElkGraphImporter.java:223-228: a label moves by the offset', () => {
    const { graph, label, importer, fgraph } = laidOut();
    graph.setProperty(ForceOptions.PADDING, new ElkPadding(0));
    const flabel = fgraph.getLabels()[0]!;
    flabel.getPosition().x = 190;
    flabel.getPosition().y = 30;
    importer.applyLayout(fgraph);
    expect([label.getX(), label.getY()]).toEqual([110, -10]);
  });
});
