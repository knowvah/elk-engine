// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type Scenario,
  StepArgs,
  VOID,
  loadGraphVectors,
  recordedStep,
  replayScenario,
} from '../../../test/helpers/graph-vectors.js';
import { Random } from '../../java/util/Random.js';
import type { ElkNode } from '../ElkNode.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from './ElkGraphUtil.js';
import { GraphIdentifierGenerator } from './GraphIdentifierGenerator.js';

const IDENTIFIER_VECTOR_SCENARIOS = ['generate-identifiers', 'generate-identifiers-root-and-subgraph'];
/** Recorded step counts of the two scenarios (frozen with `graph.json`, D9). */
const RECORDED_STEP_COUNTS = [28, 13];
const RANDOM_BOUND = 10000;
const UNIQUE_SUFFIX = /^n_g\d{4}$/;

function generate(graph: ElkNode): void {
  GraphIdentifierGenerator.forGraph(graph).assertValid().assertExists().execute();
}

function nodeIds(graph: ElkNode): Array<string | null> {
  return graph
    .getChildren()
    .toArray()
    .map((n) => n.getIdentifier());
}

/** A graph with one child node per given identifier. */
function graphWithNodes(...identifiers: Array<string | null>): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  for (const identifier of identifiers) {
    ElkGraphUtil.createNode(graph).setIdentifier(identifier);
  }
  return graph;
}

describe('GraphIdentifierGenerator replays the JVM vectors (D9)', () => {
  const vectors = loadGraphVectors();
  const scenarios = IDENTIFIER_VECTOR_SCENARIOS.map((name) => {
    const scenario = vectors.scenarios.find((s) => s.name === name);
    if (scenario === undefined) {
      throw new Error(`scenario ${name} missing from graph.json`);
    }
    return scenario;
  });
  const generateIdentifiers = {
    generateIdentifiers: (ctx: ConstructorParameters<typeof StepArgs>[0], step: Scenario['steps'][number]): symbol => {
      generate(new StepArgs(ctx, step).node('graph'));
      return VOID;
    },
  };

  it('holds the recorded step counts', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual(RECORDED_STEP_COUNTS);
  });

  describe.each(IDENTIFIER_VECTOR_SCENARIOS.map((name, i) => [name, scenarios[i] as Scenario] as const))(
    '%s',
    (_name, scenario) => {
      it('matches every recorded step', () => {
        const actual = replayScenario(scenario, generateIdentifiers);
        expect(actual).toHaveLength(scenario.steps.length);
        actual.forEach((step, i) => {
          const recorded = scenario.steps[i] as Scenario['steps'][number];
          expect({ step: i, op: recorded.op, ...step }).toEqual({
            step: i,
            op: recorded.op,
            ...recordedStep(recorded),
          });
        });
      });
    },
  );
});

describe('GraphIdentifierGenerator.assertValid', () => {
  it('replaces every invalid character with an underscore and a leading digit too', () => {
    const graph = graphWithNodes('a b', '1x', 'x1', 'Ok_9', '9', 'é-ü', '\u{1F600}');
    GraphIdentifierGenerator.forGraph(graph).assertValid().execute();
    expect(nodeIds(graph)).toEqual(['a_b', '_x', 'x1', 'Ok_9', '_', '___', '__']);
  });

  it('leaves null and empty identifiers alone', () => {
    const graph = graphWithNodes(null, '');
    GraphIdentifierGenerator.forGraph(graph).assertValid().execute();
    expect(nodeIds(graph)).toEqual([null, '']);
  });

  it('validates the root, ports, labels, edges and sections recursively', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setIdentifier('r r');
    const node = ElkGraphUtil.createNode(graph);
    const port = ElkGraphUtil.createPort(node);
    port.setIdentifier('p-1');
    const nodeLabel = ElkGraphUtil.createLabel(node);
    nodeLabel.setIdentifier('l 1');
    const innerLabel = ElkGraphUtil.createLabel(nodeLabel);
    innerLabel.setIdentifier('2l');
    const edge = ElkGraphUtil.createSimpleEdge(node, node);
    edge.setIdentifier('e!');
    const edgeLabel = ElkGraphUtil.createLabel(edge);
    edgeLabel.setIdentifier('el.');
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setIdentifier('s 1');
    const portLabel = ElkGraphUtil.createLabel(port);
    portLabel.setIdentifier('pl?');

    GraphIdentifierGenerator.forGraph(graph).assertValid().execute();

    expect(
      [graph, port, nodeLabel, innerLabel, edge, edgeLabel, section, portLabel].map((e) => e.getIdentifier()),
    ).toEqual(['r_r', 'p_1', 'l_1', '_l', 'e_', 'el_', 's_1', 'pl_']);
  });

  it('does not run without being asserted', () => {
    const graph = graphWithNodes('a b');
    GraphIdentifierGenerator.forGraph(graph).execute();
    expect(nodeIds(graph)).toEqual(['a b']);
  });
});

describe('GraphIdentifierGenerator.assertExists', () => {
  it('numbers each element kind separately: G1, N, P, E, ES, L', () => {
    const graph = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(graph);
    const n2 = ElkGraphUtil.createNode(n1);
    const port = ElkGraphUtil.createPort(n1);
    const edge = ElkGraphUtil.createSimpleEdge(n1, n2);
    const section = ElkGraphUtil.createEdgeSection(edge);
    const label = ElkGraphUtil.createLabel(port);
    const nested = ElkGraphUtil.createLabel(label);

    GraphIdentifierGenerator.forGraph(graph).assertExists().execute();

    expect([graph, n1, n2, port, edge, section, label, nested].map((e) => e.getIdentifier())).toEqual([
      'G1',
      'N1',
      'N2',
      'P1',
      'E1',
      'ES1',
      'L1',
      'L2',
    ]);
  });

  it('skips an existing identifier: a preset N1 sends the node to N2', () => {
    const graph = graphWithNodes('N1', null);
    GraphIdentifierGenerator.forGraph(graph).assertExists().execute();
    expect(nodeIds(graph)).toEqual(['N1', 'N2']);
  });

  it('skips identifiers held by edge sections and by nested elements', () => {
    const graph = graphWithNodes(null);
    const child = graph.getChildren().get(0) as ElkNode;
    const edge = ElkGraphUtil.createSimpleEdge(child, child);
    ElkGraphUtil.createEdgeSection(edge).setIdentifier('ES1');
    const fresh = ElkGraphUtil.createEdgeSection(edge);
    ElkGraphUtil.createLabel(graph.getChildren().get(0) as ElkNode).setIdentifier('L1');
    const label = ElkGraphUtil.createLabel(graph);

    GraphIdentifierGenerator.forGraph(graph).assertExists().execute();

    expect([fresh.getIdentifier(), label.getIdentifier()]).toEqual(['ES2', 'L2']);
  });

  it('treats blank identifiers (Java trim: chars up to U+0020) as missing', () => {
    const graph = graphWithNodes('   ', '\t\n', '\u0000', ' x ', ' ');
    GraphIdentifierGenerator.forGraph(graph).assertExists().execute();
    expect(nodeIds(graph)).toEqual(['N1', 'N2', 'N3', ' x ', ' ']);
  });

  it('keeps an existing root identifier, generates G1 for a blank or null one', () => {
    const named = graphWithNodes();
    named.setIdentifier('root');
    const blank = graphWithNodes();
    blank.setIdentifier(' ');
    const unnamed = graphWithNodes();
    for (const graph of [named, blank, unnamed]) {
      GraphIdentifierGenerator.forGraph(graph).assertExists().execute();
    }
    expect([named, blank, unnamed].map((g) => g.getIdentifier())).toEqual(['root', 'G1', 'G1']);
  });

  it('gives a non-root start node an N identifier, not G1', () => {
    const graph = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(graph);
    GraphIdentifierGenerator.forGraph(child).assertExists().execute();
    expect(child.getIdentifier()).toBe('N1');
    expect(graph.getIdentifier()).toBeNull();
  });

  it('does not deduplicate valid duplicates', () => {
    const graph = graphWithNodes('ok', 'ok');
    generate(graph);
    expect(nodeIds(graph)).toEqual(['ok', 'ok']);
  });

  it('ignores property entries and bend points while scanning', () => {
    const graph = graphWithNodes(null);
    graph.setProperty(new Property<string>('k'), 'v');
    const child = graph.getChildren().get(0) as ElkNode;
    const edge = ElkGraphUtil.createSimpleEdge(child, child);
    ElkGraphUtil.createBendPoint(ElkGraphUtil.createEdgeSection(edge));
    GraphIdentifierGenerator.forGraph(graph).assertExists().execute();
    expect([graph.getIdentifier(), edge.getIdentifier()]).toEqual(['G1', 'E1']);
  });
});

describe('GraphIdentifierGenerator.assertUnique', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends _g<4 digits> to the second of two equal identifiers', () => {
    const graph = graphWithNodes('n', 'n');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    const [first, second] = nodeIds(graph);
    expect(first).toBe('n');
    expect(second).toMatch(UNIQUE_SUFFIX);
  });

  it('ends with all identifiers unique for three duplicates', () => {
    const graph = graphWithNodes('n', 'n', 'n');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    const ids = nodeIds(graph);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('n');
    expect(ids[1]).toMatch(/^n_g\d{4}/);
    expect(ids[2]).toMatch(/^n_g\d{4}/);
  });

  it('draws from an unseeded Random with bound 10000 and pads to four digits', () => {
    const nextInt = vi.spyOn(Random.prototype, 'nextInt').mockReturnValue(7);
    const graph = graphWithNodes('n', 'n');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    expect(nodeIds(graph)).toEqual(['n', 'n_g0007']);
    expect(nextInt).toHaveBeenCalledTimes(1);
    expect(nextInt).toHaveBeenCalledWith(RANDOM_BOUND);
  });

  it('keeps a four-digit number unpadded', () => {
    vi.spyOn(Random.prototype, 'nextInt').mockReturnValue(1234);
    const graph = graphWithNodes('n', 'n');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    expect(nodeIds(graph)).toEqual(['n', 'n_g1234']);
  });

  it('pads zero, one, two and three digit numbers to four digits', () => {
    const nextInt = vi.spyOn(Random.prototype, 'nextInt');
    nextInt.mockReturnValueOnce(0).mockReturnValueOnce(12).mockReturnValueOnce(345);
    const graph = graphWithNodes('a', 'a', 'a', 'a');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    expect(nodeIds(graph)).toEqual(['a', 'a_g0000', 'a_g0012', 'a_g0345']);
  });

  it('retries while the suffixed identifier is itself taken', () => {
    const nextInt = vi.spyOn(Random.prototype, 'nextInt').mockReturnValue(7);
    const graph = graphWithNodes('n', 'n', 'n');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    expect(nodeIds(graph)).toEqual(['n', 'n_g0007', 'n_g0007_g0007']);
    expect(nextInt).toHaveBeenCalledTimes(3);
  });

  it('treats null identifiers as equal and renames the second to "null_g<4 digits>"', () => {
    const graph = graphWithNodes(null, null);
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    const [first, second] = nodeIds(graph);
    expect(first).toBeNull();
    expect(second).toMatch(/^null_g\d{4}$/);
  });

  it('covers nested elements but not the start node and not edge sections', () => {
    const graph = graphWithNodes('x');
    graph.setIdentifier('x');
    const child = graph.getChildren().get(0) as ElkNode;
    const edge = ElkGraphUtil.createSimpleEdge(child, child);
    const first = ElkGraphUtil.createEdgeSection(edge);
    const second = ElkGraphUtil.createEdgeSection(edge);
    first.setIdentifier('s');
    second.setIdentifier('s');
    GraphIdentifierGenerator.forGraph(graph).assertUnique().execute();
    expect([graph.getIdentifier(), first.getIdentifier(), second.getIdentifier()]).toEqual(['x', 's', 's']);
    expect(nodeIds(graph)).toEqual(['x']);
  });
});

describe('GraphIdentifierGenerator.execute', () => {
  it('changes nothing when no assertion was made', () => {
    const graph = graphWithNodes('a b', null, 'n', 'n');
    GraphIdentifierGenerator.forGraph(graph).execute();
    expect(nodeIds(graph)).toEqual(['a b', null, 'n', 'n']);
    expect(graph.getIdentifier()).toBeNull();
  });

  it('chains the assertions on the same instance and runs validate, generate, unique in order', () => {
    const graph = graphWithNodes('a b', null, 'a_b');
    const generator = GraphIdentifierGenerator.forGraph(graph);
    expect(generator.assertValid()).toBe(generator);
    expect(generator.assertExists()).toBe(generator);
    expect(generator.assertUnique()).toBe(generator);
    generator.execute();
    const [first, second, third] = nodeIds(graph);
    expect(graph.getIdentifier()).toBe('G1');
    expect(first).toBe('a_b');
    expect(second).toBe('N1');
    expect(third).toMatch(/^a_b_g\d{4}$/);
  });
});
