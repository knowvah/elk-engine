// SPDX-License-Identifier: EPL-2.0
// Proof of DotDebugUtil / JsonDebugUtil / DebugUtil (mission 7f2, T9): the `logged` rows of layered-labels.json
// (`full/logged/*` and `scenarios/Layout/logging/*`) replayed through `monitor.logGraph` and compared with the
// recorded DOT and JSON strings by `compareLogged` (G3, G3a: DOT exact, JSON exact except the order inside property
// lists, identity-hash tokens normalised). The enum arms of 7f2's classes that are not wired yet are replaced by a
// stub that stops the run when it first executes; `ElkLayered` logs slot `i` before processor `i` runs, so every
// graph logged up to that point is the real one, and exactly that prefix of the recording is compared. When no arm
// throws any more, the whole recording is compared. Expectations come only from the rows (L4, AD-13).
import { describe, expect, it, vi } from 'vitest';
import { importRow } from '../../../test/helpers/layered-phase-replay-rows.js';
import { applyOptions, loadInput } from '../../../test/helpers/layered-phase-replay-rows.js';
import { rowsByGroup } from '../../../test/helpers/layered-labels-replay-rows.js';
import { compareLogged, type Logged } from '../../../test/helpers/layered-labels-replay-logged.js';
import { capturedLogged } from '../../../test/helpers/layered-labels-replay-ops.js';
import type { FullRow } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { LGraph } from './graph/LGraph.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayeredLayoutProvider } from './LayeredLayoutProvider.js';

const STOP_MARKER = 'T9 stub processor reached';
const NOT_PORTED = /^(\w+) is ported in mission 7f2$/;

vi.mock('./intermediate/IntermediateProcessorStrategyCreate.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./intermediate/IntermediateProcessorStrategyCreate.js')>();
  const { UnsupportedOperationException } = await import('../../java/lang/UnsupportedOperationException.js');
  return {
    ...actual,
    createIntermediateProcessor: (strategy: Parameters<typeof actual.createIntermediateProcessor>[0]) => {
      try {
        return actual.createIntermediateProcessor(strategy);
      } catch (error) {
        const name = error instanceof UnsupportedOperationException ? NOT_PORTED.exec(error.message)?.[1] : undefined;
        if (name === undefined) {
          throw error;
        }
        // a class named as the Java class: the `processors` property prints its simple name
        const named = {
          [name]: class {
            process(): void {
              throw new Error(STOP_MARKER);
            }
          },
        };
        return new named[name]!();
      }
    },
  };
});

const loggedRows = (group: 'full' | 'scenarios'): FullRow[] =>
  (rowsByGroup(group) as unknown as FullRow[]).filter(
    (row) => (row.expected as { logged?: Logged }).logged !== undefined,
  );

const expectedOf = (row: FullRow): Logged => (row.expected as unknown as { logged: Logged }).logged;

/** The first `count` graphs of a recording. */
const prefixOf = (logged: Logged, count: number): Logged => ({
  tags: logged.tags.slice(0, count),
  dot: logged.dot.slice(0, count),
  json: logged.json.slice(0, count),
});

/** Runs a layout on a logging monitor and returns what was logged; a stub stops the run, anything else is a failure. */
function logOf(layout: (monitor: BasicProgressMonitor) => void): { logged: Logged; stopped: boolean } {
  const monitor = new BasicProgressMonitor().withLogging(true);
  let stopped = false;
  try {
    layout(monitor);
  } catch (error) {
    stopped = String(error).includes(STOP_MARKER) || String((error as Error).cause).includes(STOP_MARKER);
    if (!stopped) {
      throw error;
    }
  }
  return { logged: capturedLogged(monitor), stopped };
}

function differences(row: FullRow, run: { logged: Logged; stopped: boolean }): string[] {
  const expected = run.stopped ? prefixOf(expectedOf(row), run.logged.tags.length) : expectedOf(row);
  return compareLogged(run.logged, expected);
}

const originOf = (graph: LGraph): ElkNode => graph.getProperty(InternalProperties.ORIGIN) as ElkNode;

describe('DebugUtil logged rows', () => {
  const full = loggedRows('full');
  const scenarios = loggedRows('scenarios');

  it('finds the recorded logged rows', () => {
    expect([full.length, scenarios.length]).toEqual([3, 4]);
  });

  it.each(full.map((row) => [row.id, row] as const))('%s: the logged strings equal the recording', (_id, row) => {
    const root = loadInput(row.input);
    applyOptions(root, row.options);
    const run = logOf((monitor) => new RecursiveGraphLayoutEngine().layout(root, monitor));
    expect(run.logged.tags.length).toBeGreaterThan(0);
    expect(differences(row, run)).toEqual([]);
  });

  it.each(scenarios.map((row) => [row.id, row] as const))('%s: the logged strings equal the recording', (_id, row) => {
    const node = originOf(importRow(row as never).graph);
    const run = logOf((monitor) => new LayeredLayoutProvider().layout(node, monitor));
    expect(run.logged.tags.length).toBeGreaterThan(0);
    expect(differences(row, run)).toEqual([]);
  });
});
