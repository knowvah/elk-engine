// SPDX-License-Identifier: EPL-2.0
// Proof of the parts of DotDebugUtil / JsonDebugUtil / DebugUtil that the recorded `logged` rows do not reach (the rows stop
// at the first slot whose processor is not wired yet, `DebugUtilLogged.test.ts`): the Java string formats of nodes, edges,
// bend points, nested graphs, segment graphs and hypernode graphs on small hand-built graphs. The expectations quote the
// Java format strings (`DotDebugUtil.java`, `JsonDebugUtil.java`) fragment by fragment and take identity hashes from the
// `identityHashCode` shim, so they assert structure, never a hand-computed number. T12 replays the recorded `phase5` and
// segment graphs once the pipeline is wired.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect, label } from '../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../core/math/KVector.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { DotDebugUtil } from './DotDebugUtil.js';
import { JsonDebugUtil } from './JsonDebugUtil.js';
import { LGraph } from './graph/LGraph.js';
import type { LNode } from './graph/LNode.js';
import { NodeType } from './graph/LNodeNodeType.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './p4nodes/LinearSegmentsNodePlacerLinearSegment.js';
import { HyperEdgeSegment } from './p5edges/orthogonal/HyperEdgeSegment.js';
import { HyperEdgeSegmentDependency } from './p5edges/orthogonal/HyperEdgeSegmentDependency.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const hash = (o: object): string => String(identityHashCode(o));

interface Fixture {
  readonly graph: LGraph;
  readonly first: LNode;
  readonly second: LNode;
  readonly dummy: LNode;
}

/** Layer 0: a NORMAL node labelled `a"b` (30x20) and a LONG_EDGE dummy; layer 1: one NORMAL node; one edge with bends. */
function fixture(): Fixture {
  const graph = new LGraph();
  const first = addNode(graph);
  first.getLabels().push(label('a"b'));
  first.getSize().x = 30;
  first.getSize().y = 20;
  const dummy = addNode(graph, NodeType.LONG_EDGE);
  const second = addNode(graph);
  first.setLayer(addLayer(graph));
  dummy.setLayer(graph.getLayers()[0]!);
  second.setLayer(addLayer(graph));
  // the nodes now belong to layers; `setLayer` does not touch the layerless list (as in Java)
  graph.getLayerlessNodes().length = 0;
  const edge = connect(addPort(first), addPort(second));
  edge.getBendPoints().add(new KVector(5, 7.5));
  return { graph, first, second, dummy };
}

describe('DotDebugUtil.createDebugGraph', () => {
  it('writes the digraph frame, the nodes of each layer and the edges as the Java format strings do', () => {
    const { graph, first, second, dummy } = fixture();
    const dot = DotDebugUtil.createDebugGraph(graph);
    expect(dot.startsWith('digraph {\n    rankdir=LR;\n')).toBe(true);
    expect(dot.endsWith('}\n')).toBe(true);
    expect(dot).toContain(`        ${hash(first)}[label="a\\"b (0,0)",shape=box];\n`);
    expect(dot).toContain(
      `        ${hash(dummy)}[label="${dummy.getDesignation()!} (0,1)",style="rounded,filled",color="#eaed00"];\n`,
    );
    expect(dot).toContain(`        ${hash(second)}[label="${second.getDesignation()!} (1,0)",shape=box];\n`);
    expect(dot).toContain(`    ${hash(first)} -> ${hash(second)};\n`);
  });

  it('writes layerless nodes as layer -1 before the layers', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    expect(DotDebugUtil.createDebugGraph(graph)).toBe(
      `digraph {\n    rankdir=LR;\n        ${hash(node)}[label="${node.getDesignation()!} (-1,0)",shape=box];\n}\n`,
    );
  });

  it('prints the origin of a NORTH_SOUTH_PORT dummy through LNode.toString', () => {
    const { graph, first, dummy } = fixture();
    dummy.setType(NodeType.NORTH_SOUTH_PORT);
    dummy.setProperty(InternalProperties.ORIGIN, first);
    expect(DotDebugUtil.createDebugGraph(graph)).toContain(
      `${dummy.getDesignation()!} (${first.toString()})(0,1)",style=`,
    );
  });
});

describe('JsonDebugUtil.createDebugGraph', () => {
  it('prints doubles as Java does: 30.0, not 30', () => {
    const json = JsonDebugUtil.createDebugGraph(fixture().graph);
    expect(json).toContain('"width": 30.0,\n');
    expect(json).toContain('"height": 20.0,\n');
  });

  it('writes the node ids, escaped names, ports, the edge with its points and the frame', () => {
    const { graph, first, second } = fixture();
    const json = JsonDebugUtil.createDebugGraph(graph);
    const edge = [...first.getOutgoingEdges()][0]!;
    expect(json.startsWith('{\n  "id": "root",\n')).toBe(true);
    expect(json.endsWith('\n}\n')).toBe(true);
    expect(json).toContain(`"id": "n${hash(first)}",\n`);
    expect(json).toContain('"labels": [ { "text": "a\\"b (0,0)" } ],\n');
    expect(json).toContain(`"id": "p${hash(edge.getSource()!)}",\n`);
    expect(json).toContain(`"id": "e${hash(edge)}",\n`);
    expect(json).toContain(`"source": "n${hash(first)}",\n`);
    expect(json).toContain(`"target": "n${hash(second)}",\n`);
    expect(json).toContain('"bendPoints": [\n');
    expect(json).toContain('{ "x": 5.0, "y": 7.5}');
  });

  it('adds the TARGET_OFFSET to the target point and writes the dummy name with its type suffix', () => {
    const { graph, first, dummy } = fixture();
    const edge = [...first.getOutgoingEdges()][0]!;
    const plain = JsonDebugUtil.createDebugGraph(graph);
    edge.setProperty(InternalProperties.TARGET_OFFSET, new KVector(2, 4));
    const moved = JsonDebugUtil.createDebugGraph(graph);
    expect(moved).not.toBe(plain);
    expect(moved).toContain(`"targetPoint": { "x": ${String(edge.getTarget()!.getAbsoluteAnchor().x + 2)}.0`);
    expect(plain).toContain(`"text": "${dummy.getDesignation()!} (0,1) [ DUMMY: LONG_EDGE ]"`);
  });

  it('names the origin of a NORTH_SOUTH_PORT dummy before its position', () => {
    const { graph, first, dummy } = fixture();
    dummy.setType(NodeType.NORTH_SOUTH_PORT);
    dummy.setProperty(InternalProperties.ORIGIN, first);
    expect(JsonDebugUtil.createDebugGraph(graph)).toContain(
      `${dummy.getDesignation()!}(${first.toString().replaceAll('"', '\\"')}) (0,1) [ DUMMY: NORTH_SOUTH_PORT ]`,
    );
  });

  it('writes a nested graph below its node, layerless nodes first and a comma between them and the layers', () => {
    const { graph, first } = fixture();
    const nested = new LGraph();
    const inner = addNode(nested);
    first.setNestedGraph(nested);
    addNode(graph);
    const json = JsonDebugUtil.createDebugGraph(graph);
    expect(json).toContain(`"id": "n${hash(inner)}",\n`);
    expect(json.match(/"children": \[/g)).toHaveLength(2);
  });

  it('measures min and max over ports and bend points (graph x/y/width/height)', () => {
    const { graph, first } = fixture();
    first.getMargin().left = 3;
    const port = [...first.getPorts()][0]!;
    port.getPosition().x = -10;
    port.getMargin().top = 4;
    port.getSize().x = 1;
    const json = JsonDebugUtil.createDebugGraph(graph);
    expect(json).toContain('"x": -10.0,\n  "y": -4.0,\n');
  });
});

describe('segment and hypernode graphs', () => {
  function segments(): LinearSegment[] {
    const { first, second } = fixture();
    const a = new LinearSegment();
    a.id = 1;
    a.nodes.push(first);
    const b = new LinearSegment();
    b.id = 2;
    b.nodes.push(second);
    return [a, b];
  }

  it('DOT: one label line per segment and one arrow per successor, in list order', () => {
    const [a, b] = segments() as [LinearSegment, LinearSegment];
    const dot = DotDebugUtil.createDebugGraphSegments(new LGraph(), [a, b], [[b], []]);
    expect(dot).toBe(
      `digraph {\n  ${String(a.hashCode())}[label="${a.toString()}"]\n  ${String(a.hashCode())}->${String(b.hashCode())}\n` +
        `  ${String(b.hashCode())}[label="${b.toString()}"]\n}\n`,
    );
  });

  it('JSON: the nodes, then one edge per successor numbered from 0, and no edges when there are none', () => {
    const [a, b] = segments() as [LinearSegment, LinearSegment];
    const json = JsonDebugUtil.createDebugGraphSegments(new LGraph(), [a, b], [[b], []]);
    expect(json).toContain(`"id": "n${String(a.hashCode())}",\n`);
    expect(json).toContain(`"labels": [ { "text": "${a.toString()}" } ],\n`);
    expect(json).toContain(`"id": "e0",\n      "source": "n${String(a.hashCode())}",\n`);
    expect(json).toContain(`"target": "n${String(b.hashCode())}",\n    }`);
    const none = JsonDebugUtil.createDebugGraphSegments(new LGraph(), [a], [[]]);
    expect(none).toContain('"edges": [\n    ]');
  });

  function hypernodes(): [HyperEdgeSegment, HyperEdgeSegment] {
    const source = new HyperEdgeSegment(null);
    const target = new HyperEdgeSegment(null);
    source.mark = 1;
    target.mark = 2;
    HyperEdgeSegmentDependency.createAndAddRegular(source, target, 3);
    return [source, target];
  }

  it('DOT: hypernode labels, then the dependencies with type and weight', () => {
    const [source, target] = hypernodes();
    const dot = DotDebugUtil.createDebugGraphHyperedges(new LGraph(), [source, target]);
    expect(dot).toBe(
      `digraph {\n  1[label="${source.toString()}"]\n  2[label="${target.toString()}"]\n` +
        `  1->2[label="REGULAR (3)"]\n}\n`,
    );
  });

  it('JSON: identity-hash ids (not the mark), one edge per dependency', () => {
    const [source, target] = hypernodes();
    const json = JsonDebugUtil.createDebugGraphHyperedges(new LGraph(), [source, target]);
    expect(json).toContain(`"id": "n${hash(source)}",\n`);
    expect(json).toContain(`"source": "n${hash(source)}",\n      "target": "n${hash(target)}"\n    }`);
    expect(json).toContain('"edges": [\n    {\n      "id": "e0"');
    expect(JsonDebugUtil.createDebugGraphHyperedges(new LGraph(), [target])).toContain('"edges": [\n  ]');
  });
});
