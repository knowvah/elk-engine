// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/vertiflex-extra.json (tree-recorder-gaps #66, D3; the second plan of
// tools/vectors/VertiFlexVectors.java, whose header is the contract) through the real VertiFlexLayoutProvider at the AD-4 bar
// (ids, counts and order exact, numbers within 1e-6), as VertiFlexVectors.test.ts does for vertiflex.json:
//   full    the RecursiveGraphLayoutEngine run against the recorded dump;
//   stops   the same run under the recorder's monitor tree, every step against the accumulated recorded state.
// The file has no throws rows. Items: gaps66EqualY (V-a, the tie at RelativeXPlacer.java:95), gaps66BendEpsilon (V-b, the
// BendEdgeRouter.java:74 epsilon).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareStop, formatDifferences, TOLERANCE } from '../../../test/helpers/vertiflex-replay-dump.js';
import {
  loadVertiFlexRows,
  stateAfter,
  vertiflexExtraRefPath,
  type Dump,
} from '../../../test/helpers/vertiflex-replay-rows.js';
import { runFull, runStops } from '../../../test/helpers/vertiflex-replay-run.js';

const HEAVY = { timeout: 60_000 } as const;
const REF = vertiflexExtraRefPath();

const fullRows = loadVertiFlexRows('full', REF);
const stopsRows = loadVertiFlexRows('stops', REF);
const throwsRows = loadVertiFlexRows('throws', REF);

/** A full row's expected value has no `props`; the TS dump drops them too so the key lists agree. */
const withoutProps = (dump: Dump): Dump => {
  const { props: _props, ...rest } = dump;
  return rest as Dump;
};

describe('vertiflex-extra ref: row counts', () => {
  it('has the recorded rowCounts (3 full, 1 stops, 0 throws)', () => {
    const header = JSON.parse(readFileSync(REF, 'utf8')) as { rowCounts: unknown };
    expect(header.rowCounts).toEqual({ full: 3, stops: 1, throws: 0 });
    expect([fullRows.length, stopsRows.length, throwsRows.length]).toEqual([3, 1, 0]);
  });
});

describe('vertiflex-extra ref: full rows through RecursiveGraphLayoutEngine', () => {
  it('every full row matches the recorded dump', HEAVY, () => {
    const failing = fullRows.flatMap((row) => {
      const differences = compareStop(row.expected as Dump, withoutProps(runFull(row)), TOLERANCE);
      return differences.length === 0 ? [] : [`${row.id}\n${formatDifferences(differences, 3)}`];
    });
    expect(failing).toEqual([]);
  });
});

describe('vertiflex-extra ref: stops rows, every step of the engine run', () => {
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
