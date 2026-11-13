// SPDX-License-Identifier: EPL-2.0
// Proof of the spore graph importer against spore-layout.json (mission 8c, T7): the `underlying`, `import`, `update` and `end` stops of every
// stops row, the end dump and tie summary of every full row, the throws rows, and the PK4 invariants of the jitter rows. The two providers do
// not exist yet (T11), so `replayRow` drives their bodies step by step from the test (test/helpers/spore-replay-dump.ts).
import { describe, expect, it } from 'vitest';
import { RootSelection } from './options/RootSelection.js';
import { SpanningTreeCostFunction } from './options/SpanningTreeCostFunction.js';
import { SporeCompactionOptions } from './options/SporeCompactionOptions.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import {
  childOrigins,
  compareTo,
  displacementBound,
  dumpImport,
  maxDisplacement,
  overlapFree,
  replayRow,
  runStepwise,
  type StepwiseResult,
} from '../../../test/helpers/spore-replay-dump.js';
import { dumpElk, importInput } from '../../../test/helpers/spore-replay-elk.js';
import {
  COMPACTION_ALGORITHM,
  decodeHex,
  loadSporeRows,
  onlySteps,
  OVERLAP_ALGORITHM,
  STEP_END,
  STEP_IMPORT,
  STEP_UNDERLYING,
  STEP_UPDATE,
  type FullRow,
  type SporeRow,
} from '../../../test/helpers/spore-replay-rows.js';

const TIMEOUT = { timeout: 60_000 };
const STEPS = [STEP_UNDERLYING, STEP_IMPORT, STEP_UPDATE, STEP_END] as const;

/** The 2,000-node sporeCompaction row: DepthFirstCompaction is cubic in the path length (PK6, T14 probes it; the engine run is T11). */
const COMPACTION_CHAIN = 'full/compaction/chain2000/default';

/** Asserts a comparison found no difference and returns the number of raw-bit identical doubles. */
function expectSame(expected: unknown, actual: unknown, where: string): number {
  const tally = compareTo(expected, actual, where);
  expect(tally.first).toBeNull();
  expect(tally.within).toBe(0);
  return tally.identical;
}

function run(row: SporeRow): StepwiseResult {
  const result = replayRow(row as FullRow);
  expect(result.thrown).toBeNull();
  return result;
}

describe('ElkGraphImporter: stops rows (underlying, import, update, end)', () => {
  const rows = loadSporeRows('stops');

  it('the ref has 60 stops rows', () => {
    expect(rows).toHaveLength(60);
  });

  it.each(rows.map((row) => row.id))('%s: every recorded field equals the port dump', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const result = run(row);
    const expected = onlySteps(row.expected.stops, STEPS);
    const identical = expectSame(expected, onlySteps(result.stops, STEPS), id);
    expect(expected.length).toBeGreaterThan(0);
    expect(identical).toBeGreaterThan(0);
    expect(result.jitterNodes).toBe(row.expected.jitterNodes);
  });

  it('every update stop of the ref has mapSize equal to the node count (no two centres collapse in these rows)', () => {
    for (const row of rows) {
      for (const stop of onlySteps(row.expected.stops, [STEP_UPDATE])) {
        if (stop.step === STEP_UPDATE) {
          expect(stop.mapSize).toBe(stop.vertices.length);
        }
      }
    }
  });
});

describe('ElkGraphImporter: full rows (end dump, tie summary)', () => {
  const rows = loadSporeRows('full').filter((row) => row.id !== COMPACTION_CHAIN);

  it('the ref has 113 full rows, one of them the cubic compaction chain', () => {
    expect(loadSporeRows('full')).toHaveLength(113);
    expect(rows).toHaveLength(112);
  });

  it.each(rows.map((row) => row.id))('%s: the end dump and tie summary equal the row', TIMEOUT, (id) => {
    const row = rows.find((r) => r.id === id)!;
    const result = run(row);
    const end = result.stops[result.stops.length - 1]!;
    expect(end.step).toBe(STEP_END);
    const { algorithm, jitterNodes, tieOrder, ...expectedDump } = row.expected;
    expect(algorithm).toBe(row.expected.algorithm);
    const { step, iterations, ...actualDump } = end as typeof end & { iterations: number | null };
    expect(step).toBe(STEP_END);
    expect(iterations === null).toBe(algorithm === COMPACTION_ALGORITHM);
    expectSame(expectedDump, actualDump, id);
    expect(result.jitterNodes).toBe(jitterNodes);
    expect({
      calls: result.minst.length,
      orderSensitive: result.minst.some((m) => m.orderSensitive),
      treeified: result.minst.some((m) => m.treeified),
    }).toEqual(tieOrder);
  });

  it(
    'the only treeified row is the 2,000-node overlap chain: classified here, and compared above because it is order-insensitive',
    TIMEOUT,
    () => {
      const treeified = loadSporeRows('full').filter((row) => row.expected.tieOrder.treeified);
      expect(treeified.map((row) => row.id)).toEqual(['full/overlap/chain2000/default']);
      // orderSensitive is false there: the bin order inside a tree bin cannot change the tree, so the end dump is compared too
      expect(treeified[0]!.expected.tieOrder.orderSensitive).toBe(false);
    },
  );
});

describe('ElkGraphImporter: throws rows', () => {
  const rows = loadSporeRows('throws');

  /** The Java classes of the recorded root causes and what the port throws instead (a JVM NullPointerException is a TypeError, D10). */
  const CLASSES: Record<string, abstract new (...args: never[]) => unknown> = {
    'java.lang.IllegalArgumentException': IllegalArgumentException,
    'java.lang.IllegalStateException': IllegalStateException,
    'java.lang.NullPointerException': TypeError,
  };

  it.each(rows.map((row) => row.id))('%s: the same class, and the same message unless it is JVM text', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const { thrown } = replayRow(row);
    const recorded = row.expected.throws;
    expect(thrown).toBeInstanceOf(CLASSES[recorded.class]);
    if (recorded.class !== 'java.lang.NullPointerException') {
      expect((thrown as Error).message).toBe(recorded.message);
    }
  });
});

describe('ElkGraphImporter: jitter rows (PK4, invariants only)', () => {
  const rows = loadSporeRows('jitter');
  const RUNS = 3;

  it.each(rows.map((row) => row.id))('%s: node count, jittered centres, displacement bound, overlap freedom', (id) => {
    const row = rows.find((r) => r.id === id)!;
    const invariants = row.expected.invariants;
    const dumps = new Set<string>();
    for (let k = 0; k < RUNS; k++) {
      const root = importInput(row);
      const before = childOrigins(root);
      const result = runStepwise(root, row.expected.algorithm);
      expect(result.thrown).toBeNull();
      expect([...root.getChildren()]).toHaveLength(invariants.nodeCount);
      expect(result.jitterNodes).toBe(invariants.jitterNodes);
      expect(maxDisplacement(root, before)).toBeLessThanOrEqual(decodeHex(invariants.maxDisplacementBound));
      expect(row.expected.algorithm === OVERLAP_ALGORITHM ? overlapFree(root) : null).toBe(invariants.overlapFree);
      dumps.add(JSON.stringify(dumpElk(root)));
    }
    // the bound is computed from the input alone
    expect(displacementBound(importInput(row))).toBe(decodeHex(invariants.maxDisplacementBound));
    // Math.random() shifts the coincident centres differently in every run
    expect(invariants.runsAgree).toBe(false);
    expect(dumps.size).toBe(RUNS);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// units

const TWO_NODES = {
  id: 'root',
  layoutOptions: { 'elk.algorithm': COMPACTION_ALGORITHM },
  children: [
    { id: 'a', x: 0, y: 0, width: 20, height: 20 },
    { id: 'b', x: 100, y: 0, width: 20, height: 20 },
  ],
};

/** The default of `SporeCompactionOptions.PADDING` (SPOrE.melk). */
const PADDING = 8;

const unit = (input: Record<string, unknown>) => ({ input, expected: { algorithm: COMPACTION_ALGORITHM } });

describe('ElkGraphImporter.updateGraph (ElkGraphImporter.java:227-241)', () => {
  it('two nodes ending at identical centres collapse into one nodeMap entry (HashMap.put replaces the value); applyPositions then moves only the last node', () => {
    const root = importInput(unit(TWO_NODES));
    const importer = new ElkGraphImporter();
    const graph = importer.importGraph(root);
    const [first, second] = graph.vertices as [(typeof graph.vertices)[number], (typeof graph.vertices)[number]];
    second.rect.x = first.rect.x;
    second.rect.y = first.rect.y;

    importer.updateGraph(graph);

    const nodeMap = (importer as unknown as { nodeMap: { size: number } }).nodeMap;
    expect(nodeMap.size).toBe(1);
    expect(graph.tEdges).toBeNull();
    expect(graph.tree).toBeNull();

    importer.applyPositions(graph);
    const children = [...root.getChildren()];
    const a = children[0]!;
    const b = children[1]!;
    // only b is mapped, so only b is placed (setLocation(rect.x, rect.y)), and minX / minY are b's: the translation then puts b at the
    // padding (SporeCompactionOptions.PADDING default 8) and carries a, which kept its input location (0, 0), by the same offset
    expect([b.getX(), b.getY()]).toEqual([PADDING, PADDING]);
    expect([a.getX() - b.getX(), a.getY() - b.getY()]).toEqual([0 - first.rect.x, 0 - first.rect.y]);
  });

  it('updateGraph sets originalVertex to the rectangle centre, a new KVector each', () => {
    const root = importInput(unit(TWO_NODES));
    const importer = new ElkGraphImporter();
    const graph = importer.importGraph(root);
    const before = graph.vertices.map((n) => n.originalVertex);
    graph.vertices[0]!.rect.x += 5;
    importer.updateGraph(graph);
    expect(graph.vertices[0]!.originalVertex).not.toBe(before[0]);
    expect(graph.vertices[0]!.originalVertex.x).toBe(graph.vertices[0]!.rect.getCenter().x);
  });
});

describe('ElkGraphImporter.importGraph: option switches', () => {
  it('an empty graph returns before nodes and root selection (ElkGraphImporter.java:154-157)', () => {
    const root = importInput(unit({ id: 'root', layoutOptions: { 'elk.algorithm': COMPACTION_ALGORITHM } }));
    const graph = new ElkGraphImporter().importGraph(root);
    expect(graph.vertices).toEqual([]);
    expect(graph.preferredRoot).toBeNull();
  });

  it('an unknown cost function throws IllegalArgumentException with its text (ElkGraphImporter.java:144-146)', () => {
    const root = importInput(unit(TWO_NODES));
    const fake = { toString: () => 'NO_SUCH_COST' } as unknown as SpanningTreeCostFunction;
    root.setProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION, fake);
    expect(() => new ElkGraphImporter().importGraph(root)).toThrow(IllegalArgumentException);
    expect(() => new ElkGraphImporter().importGraph(root)).toThrow('No implementation available for NO_SUCH_COST');
  });

  it('an unknown root selection throws IllegalArgumentException with its text (ElkGraphImporter.java:218-220)', () => {
    const root = importInput(unit(TWO_NODES));
    const fake = { toString: () => 'NO_SUCH_ROOT' } as unknown as RootSelection;
    root.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, fake);
    expect(() => new ElkGraphImporter().importGraph(root)).toThrow(IllegalArgumentException);
    expect(() => new ElkGraphImporter().importGraph(root)).toThrow('No implementation available for NO_SUCH_ROOT');
  });

  it('FIXED with a preferred id that matches no child leaves preferredRoot null; with a match it is that node', () => {
    const miss = importInput(
      unit({
        ...TWO_NODES,
        layoutOptions: {
          'elk.algorithm': COMPACTION_ALGORITHM,
          'elk.processingOrder.rootSelection': 'FIXED',
          'elk.processingOrder.preferredRoot': 'zz',
        },
      }),
    );
    expect(new ElkGraphImporter().importGraph(miss).preferredRoot).toBeNull();

    const hit = importInput(
      unit({
        ...TWO_NODES,
        layoutOptions: {
          'elk.algorithm': COMPACTION_ALGORITHM,
          'elk.processingOrder.rootSelection': 'FIXED',
          'elk.processingOrder.preferredRoot': 'b',
        },
      }),
    );
    const graph = new ElkGraphImporter().importGraph(hit);
    expect(graph.preferredRoot).toBe(graph.vertices[1]);
  });

  it('the import dump of a graph with two nodes has the node ids and margins in child order', () => {
    const root = importInput(unit(TWO_NODES));
    const graph = new ElkGraphImporter().importGraph(root);
    const stop = dumpImport(root, graph, false);
    expect(stop.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(stop.root).toBe(0);
    expect(stop.maxIterations).toBeNull();
  });
});
