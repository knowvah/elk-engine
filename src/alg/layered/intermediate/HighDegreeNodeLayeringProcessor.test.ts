// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { dumpLGraph } from '../../../../test/helpers/layered-framework-replay.js';
import { compareExpected, compareFullDump } from '../../../../test/helpers/layered-phase-replay-compare.js';
import { phaseDump } from '../../../../test/helpers/layered-phase-replay-dump.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import {
  importRow,
  loadRows,
  type Expected,
  type PhaseRow,
} from '../../../../test/helpers/layered-phase-replay-rows.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { MAX_VALUE as INTEGER_MAX_VALUE } from '../../../java/lang/JavaInteger.js';
import { ArrayListIterator, type ListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { Layer } from '../graph/Layer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LongestPathLayerer } from '../p2layers/LongestPathLayerer.js';
import { HighDegreeNodeLayeringProcessor } from './HighDegreeNodeLayeringProcessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
const ROW_PREFIX = 'scenarios/HighDegreeNodeLayeringProcessor/';
const PROCESSOR_NAME = 'HIGH_DEGREE_NODE_LAYER_PROCESSOR';
const rows = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(ROW_PREFIX) && row.steps !== null);
const DEEP_NODE_COUNT = 5000;

type EdgeSelector = (node: LNode) => Iterable<LEdge>;
const INCOMING: EdgeSelector = (n) => n.getIncomingEdges();
const OUTGOING: EdgeSelector = (n) => n.getOutgoingEdges();

/**
 * B8 twin: a verbatim recursive transcription of `HighDegreeNodeLayeringProcessor.java` (the recursions are
 * `isTreeRoot` `:330` and `moveTree` `:252`; `degree` `:268` is an overload chain).
 */
class RecursiveHighDegreeNodeLayeringProcessor implements ILayoutProcessor<LGraph> {
  private layeredGraph!: LGraph;
  private degreeThreshold = 0;
  private treeHeightThreshold = 0;

  process(graph: LGraph): void {
    this.layeredGraph = graph;
    this.degreeThreshold = graph.getProperty(LayeredOptions.HIGH_DEGREE_NODES_THRESHOLD);
    this.treeHeightThreshold = graph.getProperty(LayeredOptions.HIGH_DEGREE_NODES_TREE_HEIGHT);
    if (this.treeHeightThreshold === 0) {
      this.treeHeightThreshold = INTEGER_MAX_VALUE;
    }
    const layerIt = new ArrayListIterator(graph.getLayers());
    while (layerIt.hasNext()) {
      const lay = layerIt.next();
      const highDegreeNodes: { node: LNode; inc: LNode[]; out: LNode[]; incMax: number; outMax: number }[] = [];
      let incMax = -1;
      let outMax = -1;
      for (const n of lay.getNodes()) {
        if (this.isHighDegreeNode(n)) {
          const info = this.calculateInformation(n);
          incMax = Math.max(incMax, info.incMax);
          outMax = Math.max(outMax, info.outMax);
          highDegreeNodes.push({ node: n, ...info });
        }
      }
      const preLayers: Layer[] = [];
      for (let i = 0; i < incMax; ++i) {
        preLayers.unshift(this.prependLayer(layerIt));
      }
      for (const hd of highDegreeNodes) {
        for (const incRoot of hd.inc) {
          this.moveTree(incRoot, INCOMING, preLayers);
        }
      }
      const afterLayers: Layer[] = [];
      for (let i = 0; i < outMax; ++i) {
        afterLayers.push(this.appendLayer(layerIt));
      }
      for (const hd of highDegreeNodes) {
        for (const outRoot of hd.out) {
          this.moveTree(outRoot, OUTGOING, afterLayers);
        }
      }
    }
    const layerIt2 = new ArrayListIterator(graph.getLayers());
    while (layerIt2.hasNext()) {
      if (layerIt2.next().getNodes().length === 0) {
        layerIt2.remove();
      }
    }
  }

  private isHighDegreeNode(node: LNode): boolean {
    return [...node.getConnectedEdges()].length >= this.degreeThreshold;
  }

  private calculateInformation(hdn: LNode): { inc: LNode[]; out: LNode[]; incMax: number; outMax: number } {
    const info = { inc: [] as LNode[], out: [] as LNode[], incMax: -1, outMax: -1 };
    for (const incEdge of hdn.getIncomingEdges()) {
      if (incEdge.isSelfLoop()) {
        continue;
      }
      const src = incEdge.getSource()!.getNode()!;
      if (this.hasSingleConnection(src, OUTGOING)) {
        const treeHeight = this.isTreeRoot(src, OUTGOING, INCOMING);
        if (treeHeight === -1) {
          continue;
        }
        info.incMax = Math.max(info.incMax, treeHeight);
        info.inc.push(src);
      }
    }
    for (const outEdge of hdn.getOutgoingEdges()) {
      if (outEdge.isSelfLoop()) {
        continue;
      }
      const tgt = outEdge.getTarget()!.getNode()!;
      if (this.hasSingleConnection(tgt, INCOMING)) {
        const treeHeight = this.isTreeRoot(tgt, INCOMING, OUTGOING);
        if (treeHeight === -1) {
          continue;
        }
        info.outMax = Math.max(info.outMax, treeHeight);
        info.out.push(tgt);
      }
    }
    return info;
  }

  private prependLayer(layerIt: ListIterator<Layer>): Layer {
    layerIt.previous();
    const l = new Layer(this.layeredGraph);
    layerIt.add(l);
    layerIt.next();
    return l;
  }

  private appendLayer(layerIt: ListIterator<Layer>): Layer {
    const l = new Layer(this.layeredGraph);
    layerIt.add(l);
    return l;
  }

  private moveTree(root: LNode, edgesFun: EdgeSelector, layers: Layer[]): void {
    root.setLayer(layers[0]!);
    const subList = layers.slice(1);
    for (const e of edgesFun(root)) {
      this.moveTree(this.other(e, root), edgesFun, subList);
    }
  }

  private hasSingleConnection(node: LNode, edgeSelector: EdgeSelector): boolean {
    let connection: LNode | null = null;
    for (const e of edgeSelector(node)) {
      if (connection === null) {
        connection = this.other(e, node);
      } else if (this.other(e, node) !== connection) {
        return false;
      }
    }
    return true;
  }

  private other(edge: LEdge, node: LNode): LNode {
    if (edge.getSource()!.getNode() === node) {
      return edge.getTarget()!.getNode()!;
    }
    return edge.getSource()!.getNode()!;
  }

  private isTreeRoot(root: LNode, ancestorEdges: EdgeSelector, descendantEdges: EdgeSelector): number {
    if (this.isHighDegreeNode(root)) {
      return -1;
    }
    if (!this.hasSingleConnection(root, ancestorEdges)) {
      return -1;
    }
    if ([...descendantEdges(root)].length === 0) {
      return 1;
    }
    let currentHeight = 0;
    for (const e of descendantEdges(root)) {
      const other = this.other(e, root);
      const height = this.isTreeRoot(other, ancestorEdges, descendantEdges);
      if (height === -1) {
        return -1;
      }
      currentHeight = Math.max(currentHeight, height);
      if (currentHeight > this.treeHeightThreshold - 1) {
        return -1;
      }
    }
    return currentHeight + 1;
  }
}

function factories(createProcessor: () => ILayoutProcessor<LGraph>): Factories {
  return {
    createProcessor(name) {
      if (name !== PROCESSOR_NAME) {
        throw new Error(`unexpected processor ${name}`);
      }
      return createProcessor();
    },
    createPhase(phase, strategy) {
      throw new Error(`unexpected phase ${phase}/${strategy}`);
    },
  };
}

function replay(row: PhaseRow, createProcessor: () => ILayoutProcessor<LGraph>): Expected {
  const graph = runSteps(row, factories(createProcessor));
  return { ...phaseDump(graph, importRow(row).importDump), dump: dumpLGraph(graph) };
}

describe('HighDegreeNodeLayeringProcessor (oracle rows)', () => {
  it('has the three recorded rows', () => {
    expect(rows.map((row) => row.id.slice(ROW_PREFIX.length))).toEqual([
      'threshold3-height1',
      'threshold3-height3',
      'threshold8-height2',
    ]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('replays %s', (_id, row) => {
    const actual = replay(row, () => new HighDegreeNodeLayeringProcessor());
    expect(compareExpected(actual, row.expected)).toEqual([]);
    expect(row.expected.dump).toBeDefined();
    expect(compareFullDump(actual, row.expected)).toEqual([]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: the recursive twin shows the same result', (_id, row) => {
    const twin = replay(row, () => new RecursiveHighDegreeNodeLayeringProcessor());
    expect(compareExpected(twin, row.expected)).toEqual([]);
    expect(twin).toEqual(replay(row, () => new HighDegreeNodeLayeringProcessor()));
  });
});

/** Hub in the last layer; a path of `length` nodes hangs off it on the incoming side, plus two leaves to make the hub high degree. */
function deepIncomingPath(length: number): { graph: LGraph; nodes: LNode[]; hub: LNode } {
  const graph = new LGraph();
  const nodes = Array.from({ length }, () => addNode(graph));
  const leaves = [addNode(graph), addNode(graph)];
  const hub = addNode(graph);
  [...nodes.map((n) => [n]), [...leaves], [hub]].forEach((group) => {
    const layer = addLayer(graph);
    group.forEach((n) => {
      n.setLayer(layer);
    });
  });
  graph.getLayerlessNodes().length = 0;
  nodes.slice(1).forEach((n, i) => connect(addPort(nodes[i]!), addPort(n)));
  connect(addPort(nodes[length - 1]!), addPort(hub));
  leaves.forEach((leaf) => connect(addPort(leaf), addPort(hub)));
  graph.setProperty(LayeredOptions.HIGH_DEGREE_NODES_THRESHOLD, 3);
  graph.setProperty(LayeredOptions.HIGH_DEGREE_NODES_TREE_HEIGHT, 0);
  return { graph, nodes, hub };
}

function layerOf(graph: LGraph, node: LNode): number {
  return graph.getLayers().indexOf(node.getLayer()!);
}

describe('HighDegreeNodeLayeringProcessor (deep trees, B8)', () => {
  it(`runs a ${String(DEEP_NODE_COUNT)}-node incoming path without a stack overflow, equal to the twin`, () => {
    const { graph, nodes } = deepIncomingPath(DEEP_NODE_COUNT);
    new HighDegreeNodeLayeringProcessor().process(graph, new NullElkProgressMonitor());
    let reference: LGraph | null = null;
    const built = deepIncomingPath(DEEP_NODE_COUNT);
    try {
      new RecursiveHighDegreeNodeLayeringProcessor().process(built.graph);
      reference = built.graph;
    } catch (e) {
      // the recursive reference itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (reference !== null) {
      expect(built.nodes.map((n) => layerOf(built.graph, n))).toEqual(nodes.map((n) => layerOf(graph, n)));
      expect(graph.getLayers().length).toBe(built.graph.getLayers().length);
    }
  });

  it('throws as Java does when a tree is deeper than the layers it is moved into', () => {
    const { graph } = deepIncomingPath(3);
    const processor = new HighDegreeNodeLayeringProcessor();
    const root = graph.getLayers()[2]!.getNodes()[0]!;
    const tooFew = [new Layer(graph)];
    expect(() => {
      processor['moveTree'](root, (n) => n.getIncomingEdges(), tooFew);
    }).toThrow(/out of bounds/);
  });
});

// ------------------------------------------------------------------------------------------------------------
// Site rows (T11): tree height and self-loops on the hub (S10)

const SITE_PREFIX = 'sites/HighDegreeNodeLayeringProcessor/treeHeight/';
const SITE_ROWS = loadRows(ROWS_FILE).filter((row) => row.id.startsWith(SITE_PREFIX));

function siteRow(name: string): PhaseRow {
  const row = SITE_ROWS.find((candidate) => candidate.id === `${SITE_PREFIX}${name}`);
  if (row === undefined) {
    throw new Error(`no site row ${SITE_PREFIX}${name}`);
  }
  return row;
}

function replaySite(row: PhaseRow): Expected {
  const graph = runSteps(row, {
    createProcessor(name) {
      if (name !== PROCESSOR_NAME) {
        throw new Error(`unexpected processor ${name}`);
      }
      return new HighDegreeNodeLayeringProcessor();
    },
    createPhase(phase, strategy) {
      if (phase === 'P2_LAYERING' && strategy === 'LONGEST_PATH') {
        return new LongestPathLayerer();
      }
      throw new Error(`unexpected phase ${phase}/${strategy}`);
    },
  });
  return phaseDump(graph, importRow(row).importDump);
}

describe('HighDegreeNodeLayeringProcessor (site rows)', () => {
  // oracle: sites/HighDegreeNodeLayeringProcessor/treeHeight/h0; HighDegreeNodeLayeringProcessor.java:77
  // (height 0 is unlimited; :169 and :197 skip the hub's self-loop; :365 never cuts a tree)
  it('moves whole trees when the tree height is 0, ignoring the hub self-loop', () => {
    const actual = replaySite(siteRow('h0'));
    expect(actual.layers).toEqual([['g0/n3'], ['g0/n2'], ['g0/n1'], ['g0/n0'], ['g0/n4', 'g0/n6'], ['g0/n5']]);
    expect(actual.layerless).toEqual([]);
  });

  // oracle: sites/HighDegreeNodeLayeringProcessor/treeHeight/h1; HighDegreeNodeLayeringProcessor.java:365
  // (a tree deeper than treeHeight - 1 is not a tree: the outgoing chain stays in its own layers)
  it('leaves trees deeper than the threshold in place when the tree height is 1', () => {
    const actual = replaySite(siteRow('h1'));
    expect(actual.layers).toEqual([['g0/n3'], ['g0/n2'], ['g0/n1'], ['g0/n0'], ['g0/n6'], ['g0/n4'], ['g0/n5']]);
    expect(actual.layerless).toEqual([]);
  });
});
