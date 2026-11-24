// SPDX-License-Identifier: EPL-2.0
// Builds the candidate of the barycenter/Forster arm 24 of issue #59 (plans/layered-arm-search, T4; group
// `barycenter` of tools/arm-search/arms.json) and writes it in the format of tools/arm-search/screen.spec.ts. Nothing
// is random: the graph is solved from the guard, and the layout's own seed is fixed at 1 in the graph's options.
// Run: npx tsx tools/arm-search/barycenter/generate.ts [<out file>]   (default: candidates.json beside this file;
// the output is formatted with the repository's prettier configuration)
//
// Arm 24 (ForsterConstraintResolver.ts:323 if[0], ForsterConstraintResolver.java:261): a violated in-layer constraint
// whose predecessor group has the same float barycenter as its successor group and a higher index in `groups`.
// - considerModelOrder.strategy NODES_AND_EDGES sets FIRST_TRY_WITH_INITIAL_ORDER (LayerSweepCrossingMinimizer.java
//   :213-216): the first run sweeps forward from the initial (model) order and calls the heuristic with
//   preOrdered = true (:461), so a node without a barycenter gets the mean of its predecessor's value and the next
//   defined value in the current order (BarycenterHeuristic.java:131-160).
// - Layer 1 is [p, x, g] (model order). p and g have one incoming edge each, from u1 and u2; x has none (its only
//   edge goes to w), so x = (p + g) / 2 exactly. The layer-0 order [u2, u1] makes p's barycenter larger than g's (the
//   port ranks differ by at least one, the random perturbation by at most 0.07, :204, :275); the edges u2 -> g and
//   u1 -> p cross, so the first run is not skipped for a crossing-free initial order (:239-243).
// - crossingMinimization.semiInteractive with positions y(p) < y(g) < y(x) chains p -> g -> x
//   (SemiInteractiveCrossMinProcessor.java:62-75). The sort gives [g, x, p]; p -> g is violated (ForsterConstraint
//   Resolver.java:265) and merged into one group whose barycenter is the mean (p + g) / 2 (:445-448, single-node
//   groups have degree 0), the same double as x's. The merged group is inserted after x, before the first strictly
//   larger barycenter (:323), and keeps g's constraint to x: in the next search its constraint to x has an equal float
//   barycenter and index 1 > 0 (:260-263).
// The steps are those of the scenarios rows (LayeredOrderVectors.java:125-130): normalise, P1 GREEDY,
// P2 NETWORK_SIMPLEX, the processors the assembled plan runs before P3 in IntermediateProcessorStrategy order, P3.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

type ElkObject = Record<string, unknown>;

const NODE_SIZE = 30;
const POSITION = 'org.eclipse.elk.position';
/** Positions of the semi-interactive chain p -> g -> x (only y is compared). */
const CHAIN_Y: Readonly<Record<string, number>> = { p: 0, g: 10, x: 20 };
const ROOT_OPTIONS: Readonly<Record<string, string>> = {
  'org.eclipse.elk.layered.crossingMinimization.semiInteractive': 'true',
  'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'org.eclipse.elk.separateConnectedComponents': 'false',
  'org.eclipse.elk.randomSeed': '1',
};
/** Model order: layer 0 [u2, u1], layer 1 [p, x, g], layer 2 [w]. */
const NODE_IDS = ['u2', 'u1', 'p', 'x', 'g', 'w'];
const EDGES: readonly (readonly [string, string])[] = [
  ['u2', 'g'],
  ['u1', 'p'],
  ['x', 'w'],
  ['p', 'w'],
  ['g', 'w'],
];
const PRE_P3 = [
  'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR',
  'LONG_EDGE_SPLITTER',
  'PORT_SIDE_PROCESSOR',
  'PORT_LIST_SORTER',
  'SORT_BY_INPUT_ORDER_OF_MODEL',
];

function node(id: string): ElkObject {
  const y = CHAIN_Y[id];
  const options = y === undefined ? {} : { layoutOptions: { [POSITION]: `(0.0,${y.toFixed(1)})` } };
  return { id, width: NODE_SIZE, height: NODE_SIZE, ...options };
}

function equalFloatBarycenter(): ElkObject {
  return {
    id: 'root',
    layoutOptions: ROOT_OPTIONS,
    children: NODE_IDS.map(node),
    edges: EDGES.map(([source, target], i) => ({ id: `e${i}`, sources: [source], targets: [target] })),
  };
}

function candidates(): ElkObject[] {
  const steps = [
    ['importGraph', null],
    ['normalise'],
    ['runPhase', 'P1_CYCLE_BREAKING', 'GREEDY'],
    ['runPhase', 'P2_LAYERING', 'NETWORK_SIMPLEX'],
    ...PRE_P3.map((member) => ['runProcessor', member]),
    ['runPhase', 'P3_NODE_ORDERING', 'LAYER_SWEEP'],
    ['dump'],
  ];
  return [
    {
      id: 'scenarios/ForsterConstraintResolver/equalFloatBarycenter',
      kind: 'order',
      elk: equalFloatBarycenter(),
      target: null,
      steps,
    },
  ];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.join(here, 'candidates.json');
// Formatted as the repository formats JSON, so that the committed file is the generator's output byte for byte.
const options = await resolveConfig(path.join(here, 'candidates.json'));
writeFileSync(out, await format(JSON.stringify(candidates()), { ...options, parser: 'json' }));
console.log(`wrote ${out}`);
