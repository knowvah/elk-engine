// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/vertiflex.json (mission 8a, T3 recording, T11 wiring) through the real
// VertiFlexLayoutProvider at the AD-4 bar (ids, counts and order exact, numbers within 1e-6):
//   full    the RecursiveGraphLayoutEngine run (VertiFlexMetaDataProvider registered, TR5) against the recorded dump;
//   stops   the same run under a monitor tree that stops where the recorder stopped (test/helpers/vertiflex-replay-run.ts), every
//           step against the accumulated recorded state; plus each phase alone from the recorded "before" state so a divergence
//           localises (RelativeXPlacer alone is replayed by RelativeXPlacerReplay.test.ts);
//   throws  the class (TS class of the ELK exceptions, `TypeError` for a NullPointerException, ClassCastException) and the first ELK
//           frame; the JVM message texts of the NPE and CCE are not compared.
import { describe, expect, it } from 'vitest';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import {
  compareStop,
  dumpVertiFlex,
  formatDifferences,
  rebuildBefore,
  TOLERANCE,
} from '../../../test/helpers/vertiflex-replay-dump.js';
import { portedTop } from '../../../test/helpers/layered-compound-replay-sites.js';
import {
  loadVertiFlexRows,
  stateAfter,
  STEP_ABSOLUTE_X_PLACER,
  STEP_Y_PLACER,
  type Dump,
  type StopsRow,
  type ThrowsExpected,
} from '../../../test/helpers/vertiflex-replay-rows.js';
import { routerStepOf, runFull, runStops, runThrows } from '../../../test/helpers/vertiflex-replay-run.js';
import { AbsoluteXPlacerStrategy } from './p3absolute/AbsoluteXPlacerStrategy.js';
import { EdgerouterStrategy } from './p4edgerouting/EdgerouterStrategy.js';
import { NodeYPlacerStrategy } from './p1yplacement/NodeYPlacerStrategy.js';

const HEAVY = { timeout: 60_000 } as const;
const NPE_CLASS = 'java.lang.NullPointerException';
const CCE_CLASS = 'java.lang.ClassCastException';
const UCE_CLASS = 'org.eclipse.elk.core.UnsupportedConfigurationException';
/** The port's cast helper: the Java cast is inline at the caller, so the first frame of the caller's file is the ELK frame. */
const CAST_HELPER_FILE = 'RelativeXPlacerChildren';

const fullRows = loadVertiFlexRows('full');
const stopsRows = loadVertiFlexRows('stops');
const throwsRows = loadVertiFlexRows('throws');

/** A full row's expected value has no `props`; the TS dump drops them too so the key lists agree. */
const withoutProps = (dump: Dump): Dump => {
  const { props: _props, ...rest } = dump;
  return rest as Dump;
};

const baseName = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');

/** The diffs between a recorded Java throw and the TS error (class, message for the ELK class, first ELK frame's file). */
function throwDiffs(expected: ThrowsExpected, error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [`no Error was thrown: ${String(error)}`];
  }
  const diffs: string[] = [];
  if (expected.class === UCE_CLASS) {
    if (error.constructor !== UnsupportedConfigurationException) diffs.push(`class ${error.constructor.name}`);
    if (error.message !== expected.message) diffs.push(`message ${JSON.stringify(error.message)}`);
  } else if (expected.class === CCE_CLASS) {
    if (error.constructor !== ClassCastException) diffs.push(`class ${error.constructor.name}`);
  } else if (expected.class === NPE_CLASS) {
    if (!(error instanceof TypeError)) diffs.push(`class ${error.constructor.name}, expected a TypeError`);
  } else {
    diffs.push(`no TS class is mapped to ${expected.class}`);
  }
  const javaClass = expected.frame.slice(0, expected.frame.indexOf('.java'));
  const frames = (error.stack ?? '').split('\n');
  const top = portedTop(frames.filter((line) => !line.includes(`/${CAST_HELPER_FILE}.`)).join('\n'));
  if (top === null || !baseName(top.file).startsWith(javaClass)) {
    diffs.push(`raised in ${top?.file ?? '(no src frame)'}, expected a port of ${expected.frame}`);
  }
  return diffs;
}

describe('vertiflex ref: full rows through RecursiveGraphLayoutEngine', () => {
  it('has the recorded 247 rows', () => {
    expect(fullRows).toHaveLength(247);
  });

  it('every full row matches the recorded dump', HEAVY, () => {
    const failing = fullRows.flatMap((row) => {
      const differences = compareStop(row.expected as Dump, withoutProps(runFull(row)), TOLERANCE);
      return differences.length === 0 ? [] : [`${row.id}\n${formatDifferences(differences, 3)}`];
    });
    expect(failing).toEqual([]);
  });
});

describe('vertiflex ref: stops rows, every step of the engine run', () => {
  it('has the recorded 216 rows', () => {
    expect(stopsRows).toHaveLength(216);
  });

  it('every stop of every row equals the recorded accumulated state', HEAVY, () => {
    const failing = stopsRows.flatMap((row) => {
      const stops = runStops(row);
      if (stops.map((s) => s.step).join() !== row.expected.steps.join()) {
        return [`${row.id}: steps ${stops.map((s) => s.step).join()} != ${row.expected.steps.join()}`];
      }
      return stops.flatMap((stop) => {
        const differences = compareStop(stateAfter(row, stop.step), stop.dump, TOLERANCE);
        return differences.length === 0 ? [] : [`${row.id} @ ${stop.step}\n${formatDifferences(differences, 3)}`];
      });
    });
    expect(failing).toEqual([]);
  });
});

/** One phase alone: the graph the step starts from is the recorded state before it. */
function phaseDiffs(row: StopsRow, step: string, process: (graph: ReturnType<typeof rebuildBefore>) => void): string[] {
  const graph = rebuildBefore(row, step);
  process(graph);
  return compareStop(stateAfter(row, step), dumpVertiFlex(graph), TOLERANCE).map(
    (d) => `${row.id} @ ${step}: ${d.path}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`,
  );
}

describe('vertiflex ref: each phase alone from the recorded before state', () => {
  it('NodeYPlacer', HEAVY, () => {
    const failing = stopsRows.flatMap((row) =>
      phaseDiffs(row, STEP_Y_PLACER, (g) =>
        NodeYPlacerStrategy.SIMPLE_Y_PLACING.create().process(g, new BasicProgressMonitor()),
      ),
    );
    expect(failing).toEqual([]);
  });

  it('AbsoluteXPlacer', HEAVY, () => {
    const failing = stopsRows.flatMap((row) =>
      phaseDiffs(row, STEP_ABSOLUTE_X_PLACER, (g) =>
        AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING.create().process(g, new BasicProgressMonitor()),
      ),
    );
    expect(failing).toEqual([]);
  });

  it('StraightEdgeRouter and BendEdgeRouter, the one each row names', HEAVY, () => {
    const failing = stopsRows.flatMap((row) => {
      const step = routerStepOf(row);
      const strategy = step === 'BendEdgeRouter' ? EdgerouterStrategy.BEND_ROUTING : EdgerouterStrategy.DIRECT_ROUTING;
      return phaseDiffs(row, step, (g) => strategy.create().process(g, new BasicProgressMonitor()));
    });
    expect(failing).toEqual([]);
    expect(new Set(stopsRows.map(routerStepOf))).toEqual(new Set(['StraightEdgeRouter', 'BendEdgeRouter']));
  });
});

describe('vertiflex ref: throws rows, class and first ELK frame', () => {
  it('has the recorded 8 rows', () => {
    expect(throwsRows).toHaveLength(8);
  });

  it.each(throwsRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(throwDiffs(row.expected.throws, runThrows(row))).toEqual([]);
  });
});
