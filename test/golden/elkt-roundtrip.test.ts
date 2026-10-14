// SPDX-License-Identifier: EPL-2.0
// T22: ElkGraph -> .elkt through the entry point (`ElkGraphText.serialize`), the round trip and the D3 check.
//
// a. every T5 writer row (test/golden/refs/java/graph-text-write.json): `serialize(source graph)` equals the
//    recorded `formatted` text byte for byte; rows with an `error` throw.
// b. round trip: `load(serialize(g))` has no errors and `canonNode` of its root equals `canonGraph(g)`, for every
//    T5 success row and every curated model (test/corpus/elkt-curated.json, from $ELK_MODELS_DIR when present).
// c. D3 (plans/conformance-corpus/decisions.md#d3--model-id-and-source): for every realworld model that has both
//    `<id>.json` and `<id>.elkt`, `ElkGraphJson.forGraph(json).toElk()` and `ElkGraphText.load(elkt).root` are
//    equal graphs.
//
// D3 EQUALITY RULE (plans/graph-text/decisions.md, refinement 9): `canonNode` trees equal (test/helpers/
// graph-json-canon.ts): identifiers, containment structure, edge endpoints and section topology, geometry
// (doubles as `DoubleToString` text, exact), labels' text, and every property as `{id, text}` after proxy
// resolution against the CoreOptions-only registry. No property is excluded and no tolerance is applied. A model
// that differs is checked against the oracle's own core-registry parses of the same two files
// (`ORACLE_REGISTRY=core`); if the oracle differs the same way it is listed in D3_ORACLE_DIFFERENCES with its
// mechanism, otherwise the port is wrong.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compareLayout, formatDiffs } from './compare-json.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText, SerializationException } from '../../src/graph/text/ElkGraphText.js';
import { repoRoot, resolveModelsDir } from '../corpus/corpus.js';
import { isCoverageRun } from '../helpers/coverage-run.js';
import { buildWriteInput, type WriteSource } from '../helpers/elkt-write-cases.js';
import { canonGraph, canonGraphWithoutPortPositions } from '../helpers/elkt-canon.js';

const WRITE_REF = path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'graph-text-write.json');
const CURATED = path.join(repoRoot(), 'test', 'corpus', 'elkt-curated.json');
const REALWORLD = 'realworld';
const ELKT = '.elkt';
const JSON_EXT = '.json';
const REALWORLD_MODEL_COUNT = 550;
const D3_TIMEOUT_MS = 60_000;
const D3_TIMEOUT_COVERAGE_MS = 240_000;

const D3_DIFFERENCES_FILE = path.join(repoRoot(), 'test', 'helpers', 'd3-oracle-differences.json');

/**
 * Realworld ids whose `.json` and `.elkt` differ on the oracle as well (id -> mechanism). All 550: see the
 * mechanism text in the data file. FLAGGED FOR THE USER at mission end: under the strict D3 rule no realworld model
 * has equal `.json` and `.elkt` graphs, because the `.elkt` exports carry port positions.
 */
export const D3_ORACLE_DIFFERENCES: ReadonlyMap<string, string> = (() => {
  const data = JSON.parse(readFileSync(D3_DIFFERENCES_FILE, 'utf8')) as { mechanism: string; ids: string[] };
  return new Map(data.ids.map((id) => [id, data.mechanism]));
})();

interface WriteRow {
  readonly id: string;
  readonly source: WriteSource;
  readonly formatted: string | { readonly error: { readonly cls: string } };
}

const rows = (JSON.parse(readFileSync(WRITE_REF, 'utf8')) as { cases: WriteRow[] }).cases;
const written = rows.filter((r): r is WriteRow & { formatted: string } => typeof r.formatted === 'string');
const failing = rows.filter((r) => typeof r.formatted !== 'string');

const models = resolveModelsDir();
const skipReason = 'skip' in models ? models.skip : '';
const modelsDir = 'dir' in models ? models.dir : '';
const note = skipReason === '' ? '' : ` (skipped: ${skipReason})`;

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function loaded(text: string): ElkNode {
  const result = ElkGraphText.load(text);
  expect(result.errors).toEqual([]);
  return result.root as ElkNode;
}

describe('ElkGraphText.serialize against the recorded writer rows', () => {
  it('covers 113 rows, 106 written and 7 failing', () => {
    expect([rows.length, written.length, failing.length]).toEqual([113, 106, 7]);
  });

  it.each(written.map((r) => [r.id, r] as const))('%s: byte-exact', (_id, row) => {
    expect(ElkGraphText.serialize(buildWriteInput(row.source, row.id))).toBe(row.formatted);
  });

  it.each(failing.map((r) => [r.id, r] as const))('%s: throws', (_id, row) => {
    expect(() => ElkGraphText.serialize(buildWriteInput(row.source, row.id))).toThrow(SerializationException);
  });
});

/**
 * T5 rows whose round trip is lossy in the oracle too (id -> mechanism). Their reload is compared with the oracle's
 * own reparse of the formatted text (`reparse` in the writer ref) instead of with the source graph.
 */
const LOSSY_ROUND_TRIP: Readonly<Record<string, string>> = {
  'java-property-key-keyword': 'the keyword segment of the key is written escaped (`my.^node.k`); the key reads back with the escape',
  'json-str-quote': 'a string needing quotes is written unescaped (G1 quirk), so `"say "hi""` does not re-parse',
  'json-val-nan-infinity': '`Number.toString` saturates through `intValue()`: Infinity writes as 2147483647',
  'shape-fractional': '`Number.toString` saturates through `intValue()`: 1e21 and 1.5e300 write as 2147483647',
  'val-double-exponent': '`Number.toString` saturates through `intValue()`: 1.797e308 and 1e21 write as 2147483647',
  'val-double-integral': '`Number.toString` saturates through `intValue()`: 3e9, 1e10 write as 2147483647, -0.0 as 0',
  'val-string-ids': 'the text does not re-parse in the oracle either (1 error, e.g. the empty value `s.empty:`)',
  'val-string-literals': 'the text does not re-parse in the oracle either (2 errors); values are written bare (G1 quirk)',
};

interface RecordedReparse {
  readonly errors: number;
  readonly json: string | null;
}

const reparses = new Map(
  (JSON.parse(readFileSync(WRITE_REF, 'utf8')) as { cases: (WriteRow & { reparse: RecordedReparse })[] }).cases.map(
    (r) => [r.id, r.reparse] as const,
  ),
);

describe('round trip: load(serialize(g)) equals g', () => {
  const lossless = written.filter((r) => !(r.id in LOSSY_ROUND_TRIP));
  const lossy = written.filter((r) => r.id in LOSSY_ROUND_TRIP);

  it('lists only rows that exist', () => {
    expect(lossy.map((r) => r.id).sort()).toEqual(Object.keys(LOSSY_ROUND_TRIP).sort());
  });

  it.each(lossless.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    const graph = buildWriteInput(row.source, row.id);
    const before = canonGraph(graph);
    expect(canonGraph(loaded(ElkGraphText.serialize(graph)))).toEqual(before);
  });

  it.each(lossy.map((r) => [r.id, r] as const))('%s: reloads as the oracle reparses it', (id, row) => {
    const recorded = reparses.get(id) as RecordedReparse;
    const result = ElkGraphText.load(ElkGraphText.serialize(buildWriteInput(row.source, row.id)));
    expect(result.errors.length > 0).toBe(recorded.errors > 0);
    if (recorded.errors === 0) {
      const diff = compareLayout(JSON.parse(recorded.json as string), JSON.parse(exportLikeOracle(result.root as ElkNode)));
      expect(diff.ok, formatDiffs(diff.diffs)).toBe(true);
    }
  });

  describe.skipIf(skipReason !== '')(`curated models${note}`, () => {
    const curated = (JSON.parse(readFileSync(CURATED, 'utf8')) as { models: { id: string; path: string }[] }).models;

    it.each(curated.map((m) => [m.id, m] as const))('%s', (_id, model) => {
      const graph = loaded(readFileSync(path.join(modelsDir, model.path), 'utf8'));
      const before = canonGraph(graph);
      expect(canonGraph(loaded(ElkGraphText.serialize(graph)))).toEqual(before);
    });
  });
});

/** The ids (without extension) of every realworld model that has both a `.json` and an `.elkt`. */
function realworldIds(dir: string): string[] {
  const root = path.join(dir, REALWORLD);
  return (readdirSync(root, { recursive: true, encoding: 'utf8' }) as string[])
    .filter((f) => f.endsWith(ELKT) && existsSync(path.join(root, f.slice(0, -ELKT.length) + JSON_EXT)))
    .map((f) => f.slice(0, -ELKT.length))
    .sort();
}

describe.skipIf(skipReason !== '')(`D3: realworld .json and .elkt yield the same ElkGraph${note}`, () => {
  if (skipReason !== '') {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  it(
    'every realworld model with both formats is equal under the recorded rule, or listed with its oracle evidence',
    () => {
      const ids = realworldIds(modelsDir);
      const root = path.join(modelsDir, REALWORLD);
      const differing: string[] = [];
      const unconfined: string[] = [];
      for (const id of ids) {
        const fromJson = ElkGraphJson.forGraph(readFileSync(path.join(root, id + JSON_EXT), 'utf8')).toElk();
        const fromText = loaded(readFileSync(path.join(root, id + ELKT), 'utf8'));
        if (JSON.stringify(canonGraph(fromJson)) !== JSON.stringify(canonGraph(fromText))) {
          differing.push(id);
          // a listed difference must be confined to its mechanism (the port positions of the .elkt)
          if (
            JSON.stringify(canonGraphWithoutPortPositions(fromJson)) !==
            JSON.stringify(canonGraphWithoutPortPositions(fromText))
          ) {
            unconfined.push(id);
          }
        }
      }
      console.log(`D3: realworld models=${ids.length} differing=${differing.length} unconfined=${unconfined.length}`);
      expect(ids).toHaveLength(REALWORLD_MODEL_COUNT);
      expect(unconfined).toEqual([]);
      expect(differing).toEqual([...D3_ORACLE_DIFFERENCES.keys()].sort());
    },
    isCoverageRun() ? D3_TIMEOUT_COVERAGE_MS : D3_TIMEOUT_MS,
  );
});
