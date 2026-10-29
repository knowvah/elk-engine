// SPDX-License-Identifier: EPL-2.0
// Port of LayerConstraintProcessorTest (testLayerConstraints, noEmptyLayers) over every row whose last replayed entry is
// LAYER_CONSTRAINT_POSTPROCESSOR (mission 7b, T8).
//
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LayerConstraintProcessorTest.java
import { describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { runPrefix, runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { loadRows, type PhaseRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-phases.json`;
// `sites/*` rows are branch probes with crafted pre-states (a pre-reversed edge, external port dummies, cleared
// constraints) that the Java test configurations never produce; the Java invariants are claimed for pipeline states
// only, so those rows are anchored by their own cases (T12), not run through this test (T11 journal row).
const allRows = loadRows(ROWS_FILE).filter((row) => row.group !== 'sites');

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/** A row's last replayed entry, spelled like a prefix entry (`NAME` or `PHASE/STRATEGY`). */
function lastEntry(row: PhaseRow): string | undefined {
  if (row.prefix !== null) {
    return row.prefix.at(-1);
  }
  const ran = row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase');
  const last = ran.at(-1);
  return last === undefined ? undefined : last.slice(1).join('/');
}

function replay(row: PhaseRow): LGraph {
  return row.steps === null ? runPrefix(row, factories) : runSteps(row, factories);
}

const PROCESSOR = 'LAYER_CONSTRAINT_POSTPROCESSOR';
const rows = allRows.filter((row) => lastEntry(row) === PROCESSOR);

/** Guava `HashMultimap`: a set of values per key; `get` of an absent key is the empty collection. */
class HashMultimap<K, V> {
  private readonly map = new Map<K, Set<V>>();

  put(key: K, value: V): void {
    const values = this.map.get(key) ?? new Set<V>();
    values.add(value);
    this.map.set(key, values);
  }

  get(key: K): ReadonlySet<V> {
    return this.map.get(key) ?? new Set<V>();
  }

  containsKey(key: K): boolean {
    return this.map.has(key);
  }
}

/** LayerConstraintProcessorTest.java:63-133 (testLayerConstraints). */
function testLayerConstraints(lGraph: LGraph): void {
  const constraintMap = new HashMultimap<LayerConstraint, number>();

  let nextLayerId = 0;
  for (const layer of lGraph) {
    layer.id = nextLayerId++;
    for (const node of layer) {
      constraintMap.put(node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT), layer.id);
    }
  }

  // if FIRST_SEPARATE nodes are available
  if (constraintMap.containsKey(LayerConstraint.FIRST_SEPARATE)) {
    // FIRST_SEPARATE must only occur in the first layer
    const firstSep = constraintMap.get(LayerConstraint.FIRST_SEPARATE);
    expect(firstSep.size === 1 && firstSep.has(0)).toBe(true);

    // first layer must not contain a NONE node
    expect(!constraintMap.get(LayerConstraint.NONE).has(0)).toBe(true);

    // all FIRST nodes have to be at position 1
    const first = constraintMap.get(LayerConstraint.FIRST);
    if (first.size !== 0) {
      expect(first.size === 1 && first.has(1)).toBe(true);
    }
  } else {
    // all FIRST nodes must be at position 0
    const first = constraintMap.get(LayerConstraint.FIRST);
    if (first.size !== 0) {
      expect(first.size === 1 && first.has(0)).toBe(true);
    }
  }

  const lastLayer = lGraph.getLayers().length - 1;

  // if LAST_SEPARATE nodes are available
  if (constraintMap.containsKey(LayerConstraint.LAST_SEPARATE)) {
    // LAST_SEPARATE must only occur in the last layer
    const lastSep = constraintMap.get(LayerConstraint.LAST_SEPARATE);
    expect(lastSep.size === 1 && lastSep.has(lastLayer)).toBe(true);

    // last layer must not contain a NONE node
    expect(!constraintMap.get(LayerConstraint.NONE).has(lastLayer)).toBe(true);

    // all LAST nodes have to be at position lastLayer - 1
    const last = constraintMap.get(LayerConstraint.LAST);
    if (last.size !== 0) {
      expect(last.size === 1 && last.has(lastLayer - 1)).toBe(true);
    }
  } else {
    // all LAST nodes must be at position lastLayer
    const last = constraintMap.get(LayerConstraint.LAST);
    if (last.size !== 0) {
      expect(last.size === 1 && last.has(lastLayer)).toBe(true);
    }
  }
}

/** LayerConstraintProcessorTest.java:~125-132 (noEmptyLayers). */
function noEmptyLayers(lGraph: LGraph): void {
  lGraph.getLayers().forEach((layer) => {
    expect(!(layer.getNodes().length === 0)).toBe(true);
  });
}

describe('LayerConstraintProcessorTest on the replayed rows', () => {
  it('covers the 58 models rows and the 3 scenario rows ending in the postprocessor', () => {
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(58);
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(3);
  });

  describe.each([
    ['testLayerConstraints', testLayerConstraints],
    ['noEmptyLayers', noEmptyLayers],
  ] as const)('%s', (_name, check) => {
    it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      check(replay(row));
    });
  });
});
