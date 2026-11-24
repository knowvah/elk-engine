// SPDX-License-Identifier: EPL-2.0
// Builds the candidates of the model-order comparator arms of issue #59 (plans/layered-arm-search, T3; arms 7-17 of
// tools/arm-search/arms.json) and writes them in the format of tools/arm-search/screen.spec.ts (kind `order`: a step
// row of tools/vectors/LayeredOrderVectors.java). Nothing is random: every graph is solved from the guard of its arm.
// Run: npx tsx tools/arm-search/model-order/generate.ts [<out file>]   (default: candidates.json beside this file;
// the output is formatted with the repository's prettier configuration)
//
// Java lines are those of the pinned oracle (ModelOrderNodeComparator.java "NC", ModelOrderPortComparator.java "PC",
// SortByInputModelProcessor.java "SBIM"). Layer ids: SBIM:66 sets layer.id to the index of the layer it is sorting;
// a later layer keeps the id it had, 0 for a layer that no step numbered (Layer ids start at 0).
// A "source" (s) dummy is a LONG_EDGE node whose first incoming edge comes from a node of a layer with its own layer id
// (NC:407-410), a "target" (t) dummy one whose first outgoing edge goes to such a node (NC:411-414); NC:429 compares two
// dummies with the same reference node. Arms 8-14 sit in the beforePorts block (NC:434-459, the first sort of SBIM:70).
//
// noModelOrderPorts (arm 15, PC:347 else): a node with considerModelOrder.noModelOrder gets no MODEL_ORDER, nor do its
//   ports (ElkGraphImporter.java:242, :998, needsModelOrder :475-479). Two unconnected EAST ports of it reach PC:316-322
//   with no in/out split and not both MODEL_ORDER. The steps are the prefix of the graph's plan up to
//   SORT_BY_INPUT_ORDER_OF_MODEL (as LayeredCompoundVectors.java --plan-dump prints it): reached through layout.
// sourceThenTargetFeedback (arms 8 and 9, NC:450): a node x with an inverted EAST input (an east dummy, t) and two WEST
//   outputs (west dummies, s). INVERTED_PORT_PROCESSOR creates x's east dummies before its west dummies
//   (InvertedPortProcessor.java:122-145), so the first sort meets (t, s), never (s, t). SBIM's second sort leaves a west
//   dummy before the east dummy (NC:464-471); running SORT_BY_INPUT_ORDER_OF_MODEL again sorts that order with
//   beforePorts: (s, t). Constructed state (a processor out of pipeline order). The EAST output x.p3 keeps x from
//   being a node whose ports are all inverted, whose edges EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER would reverse
//   (EdgeAndLayerConstraintEdgeReverser.java:172-215).
// targetFeedbackPair (arms 7, 10, 11, 13, 14, NC:453-456 and the fall-through to NC:479): two east dummies of x whose
//   sources sit in a LATER layer, so neither is connected to the previous layer (NC:145-166) and both are t on x. The
//   `layers` step puts s1, s2 after x (edges against the layering); LONG_EDGE_SPLITTER never splits an edge leaving the
//   last layer (LongEdgeSplitter.java:74-98). The layer of s1, s2 keeps id 0 while x's layer (2) is sorted. With
//   beforePorts, (t, t) takes NC:456; in the second sort, NC:464-471 finds neither source port on x: arm 7.
// westLongEdgeSources (arm 16, PC:185 alternative): ports of one node, same side WEST, fed by two LONG_EDGE nodes of a
//   layer whose id equals the node's (PC:171-173). w (layer 1) has two WEST outputs to t's WEST ports (layer 0); the two
//   west dummies of w (layer 1, id still 0 when layer 0 is sorted) feed t. Two layers: LONG_EDGE_SPLITTER returns at
//   once (LongEdgeSplitter.java:66-69) and so does not split the edges against the layering (its assertion at :90
//   would fail, and the port's dev assertion does).
// edgesWithoutModelOrder (arm 17, PC:275 false): the strategy is set after the import, so the importer numbers no edge
//   (ElkGraphImporter.java:262-264); both edges end at external port dummies, so SBIM's longEdgeTargetNodePreprocessing
//   finds no target node and does not unbox the missing MODEL_ORDER (SBIM:109-130, :139-155). Constructed state.
// The rows with a `layers` step get isolated filler nodes up to 10 imported nodes: below 10 the recorder also stores
// the full dump (LayeredOrderVectors.java FULL_DUMP_BELOW), whose layerless nodes hold TARGET_NODE_MODEL_ORDER as
// {class: HashMap} in Java and {class: Map} in the port, which the full-dump comparison does not map.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

type ElkObject = Record<string, unknown>;
type Step = readonly unknown[];
type Side = 'EAST' | 'WEST';

const NODE_SIZE = 30;
const PORT_SIZE = 4;
/** LayeredOrderVectors.java FULL_DUMP_BELOW: a step row with fewer imported nodes also stores the full dump. */
const FULL_DUMP_BELOW = 10;
const MODEL_ORDER_ROOT = { 'considerModelOrder.strategy': 'NODES_AND_EDGES' };
const FIXED_SIDE = { portConstraints: 'FIXED_SIDE' };
const SORT_BY_MODEL = 'SORT_BY_INPUT_ORDER_OF_MODEL';
/** The processors a pipeline runs from the long edge splitter up to the model-order sort (IntermediateProcessorStrategy order). */
const TO_SORT = [
  'LONG_EDGE_SPLITTER',
  'PORT_SIDE_PROCESSOR',
  'INVERTED_PORT_PROCESSOR',
  'PORT_LIST_SORTER',
  SORT_BY_MODEL,
];

const port = (id: string, side: Side): ElkObject => ({
  id,
  width: PORT_SIZE,
  height: PORT_SIZE,
  layoutOptions: { 'port.side': side },
});

const node = (id: string, layoutOptions?: ElkObject, ports?: readonly ElkObject[]): ElkObject => ({
  id,
  width: NODE_SIZE,
  height: NODE_SIZE,
  ...(layoutOptions === undefined ? {} : { layoutOptions }),
  ...(ports === undefined ? {} : { ports }),
});

/** A FIXED_SIDE node `id` with ports `<id>.p<k>` on the given sides. */
const fixedSide = (id: string, sides: readonly Side[], extra: ElkObject = {}): ElkObject =>
  node(
    id,
    { ...FIXED_SIDE, ...extra },
    sides.map((side, k) => port(`${id}.p${String(k)}`, side)),
  );

const edge = (id: string, source: string, target: string): ElkObject => ({ id, sources: [source], targets: [target] });

/** The children followed by isolated nodes f0, f1, ... up to `total` nodes. */
function padded(children: readonly ElkObject[], total: number = FULL_DUMP_BELOW): ElkObject[] {
  const fillers = Array.from({ length: total - children.length }, (_, i) => node(`f${String(i)}`));
  return [...children, ...fillers];
}

const flat = (children: readonly ElkObject[], edges: readonly ElkObject[]): ElkObject => ({
  id: 'root',
  layoutOptions: MODEL_ORDER_ROOT,
  children,
  edges,
});

const runProcessors = (members: readonly string[]): Step[] => members.map((member) => ['runProcessor', member]);

/**
 * The phases and processors of the plan up to P2 (the layout configuration's plan for these graphs: the edge reverser,
 * cycle breaking GREEDY, the layer constraint processors around layering NETWORK_SIMPLEX).
 */
const PHASES: readonly Step[] = [
  ['runProcessor', 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER'],
  ['runPhase', 'P1_CYCLE_BREAKING', 'GREEDY'],
  ['runProcessor', 'LAYER_CONSTRAINT_PREPROCESSOR'],
  ['runPhase', 'P2_LAYERING', 'NETWORK_SIMPLEX'],
  ['runProcessor', 'LAYER_CONSTRAINT_POSTPROCESSOR'],
];

/** importGraph, normalise and the plan's phases. */
const PIPELINE_HEAD: readonly Step[] = [['importGraph', null], ['normalise'], ...PHASES];

/** importGraph, normalise and a hand-placed layering of the first imported nodes (paths g0/n<k>). */
const layered = (layers: readonly (readonly number[])[]): Step[] => [
  ['importGraph', null],
  ['normalise'],
  ['layers', layers.map((layer) => layer.map((k) => `g0/n${String(k)}`))],
];

function noModelOrderPorts(): ElkObject {
  const a = fixedSide('a', ['EAST', 'EAST'], { 'considerModelOrder.noModelOrder': 'true' });
  return {
    id: 'scenarios/ModelOrderPortComparator/noModelOrderPorts',
    elk: flat([a, node('b'), node('c')], [edge('e0', 'b', 'c')]),
    target: null,
    steps: [...PIPELINE_HEAD, ...runProcessors(TO_SORT), ['dump']],
  };
}

function sourceThenTargetFeedback(): ElkObject {
  const x = fixedSide('x', ['EAST', 'WEST', 'WEST', 'EAST']);
  const edges = [edge('e0', 's', 'x.p0'), edge('e1', 'x.p1', 'y'), edge('e2', 'x.p2', 'z'), edge('e3', 'x.p3', 'u')];
  return {
    id: 'sites/ModelOrderNodeComparator/sourceThenTargetFeedback',
    elk: flat(padded([node('s'), x, node('y'), node('z'), node('u')]), edges),
    target: null,
    steps: [...PIPELINE_HEAD, ...runProcessors([...TO_SORT, SORT_BY_MODEL]), ['dump']],
  };
}

function targetFeedbackPair(): ElkObject {
  const children = [node('a'), node('b'), fixedSide('x', ['EAST', 'EAST']), node('s1'), node('s2')];
  const edges = [edge('e0', 'a', 'b'), edge('e1', 'b', 'x'), edge('e2', 's1', 'x.p0'), edge('e3', 's2', 'x.p1')];
  return {
    id: 'sites/ModelOrderNodeComparator/targetFeedbackPair',
    elk: flat(padded(children), edges),
    target: null,
    steps: [...layered([[0], [1], [2], [3, 4]]), ...runProcessors(TO_SORT), ['dump']],
  };
}

function westLongEdgeSources(): ElkObject {
  const children = [fixedSide('t', ['WEST', 'WEST']), fixedSide('w', ['WEST', 'WEST'])];
  return {
    id: 'sites/ModelOrderPortComparator/westLongEdgeSources',
    elk: flat(padded(children), [edge('e0', 'w.p0', 't.p0'), edge('e1', 'w.p1', 't.p1')]),
    target: null,
    steps: [...layered([[0], [1]]), ...runProcessors(TO_SORT), ['dump']],
  };
}

const STRATEGY_STEP: Step = [
  'setProperty',
  'g0',
  'org.eclipse.elk.layered.considerModelOrder.strategy',
  { c: 'OrderingStrategy', n: 'NODES_AND_EDGES', t: 'enum' },
];

/** The plan of a graph with external ports up to the model-order sort. */
const EXTERNAL_PORT_PIPELINE: readonly Step[] = [
  ...PHASES,
  ['runProcessor', 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR'],
  ...runProcessors(TO_SORT),
];

function edgesWithoutModelOrder(): ElkObject {
  // The two external port dummies of T's ports are imported nodes too.
  const children = padded([fixedSide('c', ['EAST', 'EAST'])], FULL_DUMP_BELOW - 2);
  const compound = {
    ...fixedSide('T', ['EAST', 'EAST']),
    width: 300,
    height: 200,
    children,
    edges: [edge('e0', 'c.p0', 'T.p0'), edge('e1', 'c.p1', 'T.p1')],
  };
  return {
    id: 'sites/ModelOrderPortComparator/edgesWithoutModelOrder',
    elk: { id: 'root', children: [compound] },
    target: 'T',
    steps: [['importGraph', 'T'], STRATEGY_STEP, ['normalise'], ...EXTERNAL_PORT_PIPELINE, ['dump']],
  };
}

function candidates(): ElkObject[] {
  const builders = [
    noModelOrderPorts,
    sourceThenTargetFeedback,
    targetFeedbackPair,
    westLongEdgeSources,
    edgesWithoutModelOrder,
  ];
  return builders.map((build) => {
    const { id, ...rest } = build();
    return { id, kind: 'order', ...rest };
  });
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.join(here, 'candidates.json');
// Formatted as the repository formats JSON, so that the committed file is the generator's output byte for byte.
const options = await resolveConfig(path.join(here, 'candidates.json'));
writeFileSync(out, await format(JSON.stringify(candidates()), { ...options, parser: 'json' }));
console.log(`wrote ${out}`);
