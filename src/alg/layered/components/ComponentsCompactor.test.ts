// SPDX-License-Identifier: EPL-2.0
// Oracle rows of ComponentsCompactor (mission 7g, T12): every `scenarios/ComponentsCompactor/*` row, every
// `full/components-compaction/*` row and the converted `ticket-213_componentsCompaction` row, replayed through the real
// enum (the three placers construct the compactor under `compaction.connectedComponents`), plus the W6 reversal twin of
// the identity-hashed edge sets of the external extensions. W9: this file replaces the staged-class pin.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import {
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  rowsByClass,
  type LoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LEdge } from '../graph/LEdge.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { ComponentsCompactor } from './ComponentsCompactor.js';
import { ComponentsCompactorInternalExternalExtension } from './ComponentsCompactorInternalExternalExtension.js';
import type { ComponentsCompactorInternalUnionExternalExtension } from './ComponentsCompactorInternalUnionExternalExtension.js';

const SCENARIO_CLASS = 'scenarios/ComponentsCompactor';
const FULL_PREFIX = 'full/components-compaction/';
const CONVERTED_ROW = 'full/converted/labels/ticket-213_componentsCompaction';
const SPAWN_TIMEOUT_MS = 60_000;
/** The arms of 7g that are still unported: a row whose plan names one is replayed by the task that ports it. */
const STAGED_ARMS: ReadonlySet<string> = new Set([
  'SELF_LOOP_PREPROCESSOR',
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
  'BREAKING_POINT_INSERTER',
  'BREAKING_POINT_PROCESSOR',
  'BREAKING_POINT_REMOVER',
  'SINGLE_EDGE_GRAPH_WRAPPER',
  'HORIZONTAL_COMPACTOR',
]);

/**
 * The processor and phase names a row's plan runs: `expected.plans` of a `full` row (every hierarchy level), the steps and
 * prefix of the others. A `scenarios` row of this class has no plan: it lays out through the real enum, which throws at
 * plan build when it names a staged arm (none does, the rows below all replay).
 */
function planNames(row: LoopsRow): string[] {
  const plans = (row.expected as { plans?: Record<string, string[]> }).plans;
  const fromPlans = Object.values(plans ?? {}).flatMap((entries) => entries.map((entry) => entry.split('/')[0]!));
  const fromPrefix = (row.prefix ?? []).map((entry) => entry.split('/')[0]!);
  const fromSteps = (row.steps ?? []).flatMap((step) => (step[0] === 'runProcessor' ? [String(step[1])] : []));
  return [...fromPlans, ...fromPrefix, ...fromSteps];
}

const needsStagedArm = (row: LoopsRow): boolean => planNames(row).some((name) => STAGED_ARMS.has(name));

const allRows = (): readonly LoopsRow[] => loadLoopsRowsIfPresent();
const scenarioRows = (): LoopsRow[] => rowsByClass(SCENARIO_CLASS, allRows());
const fullRows = (): LoopsRow[] =>
  allRows().filter((row) => row.id.startsWith(FULL_PREFIX) || row.id === CONVERTED_ROW);
const compactorRows = (): LoopsRow[] => [...scenarioRows(), ...fullRows()];
const replayable = compactorRows().filter((row) => !needsStagedArm(row));
const skipped = compactorRows().filter(needsStagedArm);

// ------------------------------------------------------------------------------------------------------------
// W6 twin: `externalExtensions` (`HashMultimap<Direction, LEdge>`, Java :215) and the union extension's `edges`
// (`Sets.newHashSet`, :296/:670) are identity-keyed and iterated (`getExternalEdges`); the twin reverses the edge set of
// every union extension right after `transformLGraph` built it.

interface TwinStats {
  sets: number;
  multiEdgeSets: number;
}

type TransformLGraph = (graph: unknown) => { getExternalExtensions(): unknown[] };

function withReversedEdgeSets<T>(stats: TwinStats, body: () => T): T {
  const prototype = ComponentsCompactor.prototype as unknown as { transformLGraph: TransformLGraph };
  const original = prototype.transformLGraph;
  prototype.transformLGraph = function (this: unknown, graph: unknown) {
    const component = original.call(this, graph);
    for (const extension of component.getExternalExtensions() as ComponentsCompactorInternalUnionExternalExtension[]) {
      stats.sets++;
      stats.multiEdgeSets += extension.edges.size > 1 ? 1 : 0;
      extension.edges = new Set([...extension.edges].reverse());
    }
    return component;
  };
  try {
    return body();
  } finally {
    prototype.transformLGraph = original;
  }
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('the rows of ComponentsCompactor', () => {
  it('replays all 110 rows (30 scenarios, 79 full, 1 converted) and skips none', () => {
    expect(scenarioRows().length).toBe(30);
    expect(fullRows().filter((row) => row.id.startsWith(FULL_PREFIX)).length).toBe(79);
    expect(fullRows().filter((row) => row.id === CONVERTED_ROW).length).toBe(1);
    expect(replayable.length).toBe(110);
    expect(skipped.length).toBe(0);
  });
});

describe('ComponentsCompactor (oracle rows)', () => {
  for (const row of replayable) {
    it(`replays ${row.id}`, () => {
      expect(replayLoopsRow(row)).toEqual([]);
    });
  }
});

describe('ComponentsCompactor (W6 reversal twin of the external extensions edge sets)', () => {
  const stats: TwinStats = { sets: 0, multiEdgeSets: 0 };
  for (const row of replayable) {
    it(`replays ${row.id} with the edge sets iterated in reverse`, () => {
      expect(withReversedEdgeSets(stats, () => replayLoopsRow(row))).toEqual([]);
    });
  }

  it('reached union extensions, some of them with more than one edge', () => {
    expect(stats.sets).toBeGreaterThan(0);
    expect(stats.multiEdgeSets).toBeGreaterThan(0);
  });
});

describe('ComponentsCompactorInternalExternalExtension', () => {
  it('rejects an edge that touches no external port dummy (Java :737)', () => {
    const edge = new LEdge();
    const source = new LPort();
    source.setNode(new LNode(null));
    const target = new LPort();
    target.setNode(new LNode(null));
    edge.setSource(source);
    edge.setTarget(target);
    expect(() => new ComponentsCompactorInternalExternalExtension(edge)).toThrow(IllegalArgumentException);
    expect(() => new ComponentsCompactorInternalExternalExtension(edge)).toThrow(/is not an external edge\.$/);
  });
});

describe('the modules load in a fresh process (F10)', () => {
  it.each([
    'ComponentsCompactor',
    'ComponentsCompactorHullpoints',
    'ComponentsCompactorInternalComponent',
    'ComponentsCompactorInternalConnectedComponents',
    'ComponentsCompactorInternalExternalExtension',
    'ComponentsCompactorInternalUnionExternalExtension',
    'ComponentsCompactorOuterSegments',
    'ComponentsCompactorPortSides',
    'ComponentsCompactorSegments',
  ])(
    '%s',
    (name) => {
      const script = `import(${JSON.stringify(join(repoRoot(), 'src/alg/layered/components', `${name}.ts`))})`;
      let stderr = '';
      try {
        execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
          cwd: repoRoot(),
          stdio: ['ignore', 'ignore', 'pipe'],
          timeout: SPAWN_TIMEOUT_MS,
        });
      } catch (error) {
        stderr = String((error as { stderr?: Buffer | string }).stderr ?? error);
      }
      expect(stderr).toBe('');
    },
    SPAWN_TIMEOUT_MS,
  );
});
