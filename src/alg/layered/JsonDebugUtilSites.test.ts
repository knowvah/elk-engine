// SPDX-License-Identifier: EPL-2.0
// Anchored cases of JsonDebugUtil (mission 7f2, T17b): the segment-graph overload (`JsonDebugUtil.java:99-130`, row
// `sites/JsonDebugUtil/segmentGraph`, Sc1) with the `PROCESSORS` value representation (`:598`), and the J items of
// `JsonDebugUtilJavaString` (`:611`, from the Javadoc of `Object.toString` and `AbstractCollection.toString`). The
// strings are copied from the row (`// oracle: <row id>; <Java file:line>`); the segment graph prints ids that are not
// identity hashes, so its children and edges compare exactly; the whole logged row also passes G3's comparator. L4: no
// hand-written output.
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../test/helpers/layered-labels-replay-ops.js';
import { loadLabelsRows } from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { javaToString } from './JsonDebugUtilJavaString.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

interface Logged {
  readonly tags: readonly string[];
  readonly dot: readonly string[];
  readonly json: readonly string[];
}

/** Replays the logging row with the real enums; `diffs` is the whole-row comparison with the oracle (G3, G3a). */
function replay(id: string): { logged: Logged; diffs: unknown[] } {
  const row = loadLabelsRows().find((candidate) => candidate.id === id);
  if (row === undefined || !isStopRow(row)) {
    throw new Error(`no stop row ${id}`);
  }
  const result = runLabelsRow(row, { factories, components: new ComponentsProcessor() });
  return { logged: result.logged as Logged, diffs: compareLabels(labelsDump(result, row.expected), row.expected) };
}

/** The logged DOT or JSON string(s) under a tag, in log order. */
const underTag = (logged: Logged, tag: string, strings: readonly string[]): string[] =>
  logged.tags.flatMap((t, i) => (t === tag ? [strings[i] as string] : []));

const SEGMENT_ROW = 'sites/JsonDebugUtil/segmentGraph';
const FROM_CHILDREN = /^[\s\S]*?(?=  "children": \[)/;

/** The part of a debug JSON from its `children` member on: nodes, then edges. */
const childrenAndEdges = (json: string): string => json.replace(FROM_CHILDREN, '');

describe('JsonDebugUtil, segment graph overload', () => {
  // oracle: sites/JsonDebugUtil/segmentGraph; JsonDebugUtil.java:99-130 (:118 the comma after the target, empty edges for one segment)
  it('writes the successor edge of the chain component and an empty edge list for the single segment', () => {
    const { logged, diffs } = replay(SEGMENT_ROW);
    expect(underTag(logged, 'segment graph', logged.json).map(childrenAndEdges)).toEqual([
      '  "children": [\n    {\n      "id": "n0",\n      "labels": [ { "text": "ls[n_root.a]" } ],\n      "width": 50,\n      "height": 25\n    },\n    {\n      "id": "n1",\n      "labels": [ { "text": "ls[n(long_edge)_0]" } ],\n      "width": 50,\n      "height": 25\n    },\n    {\n      "id": "n2",\n      "labels": [ { "text": "ls[n_root.b]" } ],\n      "width": 50,\n      "height": 25\n    },\n    {\n      "id": "n3",\n      "labels": [ { "text": "ls[n_root.c]" } ],\n      "width": 50,\n      "height": 25\n    }\n  ],\n  "edges": [\n    {\n      "id": "e0",\n      "source": "n1",\n      "target": "n2",\n    }\n    ]\n}\n',
      '  "children": [\n    {\n      "id": "n0",\n      "labels": [ { "text": "ls[n_root.d]" } ],\n      "width": 50,\n      "height": 25\n    }\n  ],\n  "edges": [\n    ]\n}\n',
    ]);
    expect(diffs).toEqual([]);
  });

  // oracle: sites/JsonDebugUtil/segmentGraph; JsonDebugUtil.java:598 (getValueRepresentation of PROCESSORS: simple class names)
  it('prints the processors property of the logged graph as the simple names of the plan', () => {
    const { logged } = replay(SEGMENT_ROW);
    const line =
      '    "processors": "[EdgeAndLayerConstraintEdgeReverser, GreedyCycleBreaker, LayerConstraintPreprocessor, NetworkSimplexLayerer, LayerConstraintPostprocessor, LongEdgeSplitter, PortSideProcessor, PortListSorter, LayerSweepCrossingMinimizer, LayerSweepCrossingMinimizer, InLayerConstraintProcessor, LabelAndNodeSizeProcessor, InnermostNodeMarginCalculator, LinearSegmentsNodePlacer, LayerSizeAndGraphHeightCalculator, OrthogonalEdgeRouter, LongEdgeJoiner, EndLabelSorter, ReversedEdgeRestorer]",';
    for (const json of underTag(logged, 'segment graph', logged.json)) {
      expect(json.split('\n')).toContain(line);
    }
  });
});

describe('JsonDebugUtilJavaString (J items)', () => {
  // J: JsonDebugUtil.java:611 `String.valueOf` -> Object.toString(): getClass().getName() + "@" + Integer.toHexString(hashCode())
  it('prints an object of a class the port does not know by its simple name, an @, and the hex identity hash', () => {
    class Unlisted {}
    const unlisted = new Unlisted();
    expect(javaToString(unlisted)).toBe(`Unlisted@${identityHashCode(unlisted).toString(16)}`);
  });

  // J: JsonDebugUtil.java:611 -> AbstractCollection.toString Javadoc: "[a, b]" (a LinkedList has no toString of its own)
  it('prints a LinkedList as the AbstractCollection does', () => {
    expect(javaToString(new LinkedList<string>(['a', 'b']))).toBe('[a, b]');
  });

  // J: JsonDebugUtil.java:611 -> AbstractCollection.toString Javadoc: elements via String.valueOf, so a null prints as "null"
  it('prints a null element inside a container as null', () => {
    expect(javaToString(['a', null])).toBe('[a, null]');
  });
});
