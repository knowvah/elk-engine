// SPDX-License-Identifier: EPL-2.0
// T22: ElkGraph -> .elkt through the entry point (`ElkGraphText.serialize`), the round trip and the D3 check.
//
// a. every T5 writer row (test/golden/refs/java/graph-text-write.json): `serialize(source graph)` equals the
//    recorded `formatted` text byte for byte; rows with an `error` throw.
// b. round trip: `load(serialize(g))` has no errors and `canonNode` of its root equals `canonGraph(g)`, for every
//    T5 success row and every curated model (test/corpus/elkt-curated.json, from $ELK_MODELS_DIR when present).
// c. D3 (plans/conformance-corpus/decisions.md#d3--model-id-and-source): for every realworld model that has both
//    `<id>.json` and `<id>.elkt`, `ElkGraphJson.forGraph(json).toElk()` and `ElkGraphText.load(elkt).root` are
//    equal graphs except for port positions.
//
// D3 EQUALITY RULE (plans/graph-text/decisions.md refinement 9, amended by D3a in
// plans/conformance-corpus/decisions.md, user 2026-10-14): `canonGraph` trees (test/helpers/elkt-canon.ts) equal
// with the x and y of every port blanked: identifiers, containment structure, edge endpoints and section topology,
// all other geometry (doubles as `DoubleToString` text, exact), labels' text, and every property as `{id, text}`
// after proxy resolution against the CoreOptions-only registry. No tolerance. Port positions are excluded because
// every realworld `.elkt` carries the laid-out port positions its `.json` lacks; the oracle's own core-registry
// parses of the two files differ in exactly those fields (T22, all 550 models). The exclusion holds only while
// those positions cannot change a layout: in both graphs every port has an explicit side and `port.index` and no
// node has `FIXED_POS`/`FIXED_RATIO` constraints (`portsWithLayoutRelevantPosition` is empty).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compareLayout, formatDiffs } from './compare-json.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { ElkGraphText, SerializationException } from '../../src/graph/text/ElkGraphText.js';
import { repoRoot, resolveModelsDir } from '../corpus/corpus.js';
import { isCoverageRun } from '../helpers/coverage-run.js';
import { buildWriteInput, type WriteSource } from '../helpers/elkt-write-cases.js';
import { canonGraph, canonGraphWithoutPortPositions, portsWithLayoutRelevantPosition } from '../helpers/elkt-canon.js';

const WRITE_REF = path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'graph-text-write.json');
const CURATED = path.join(repoRoot(), 'test', 'corpus', 'elkt-curated.json');
const REALWORLD = 'realworld';
const ELKT = '.elkt';
const JSON_EXT = '.json';
const REALWORLD_MODEL_COUNT = 550;
const D3_TIMEOUT_MS = 60_000;
const D3_TIMEOUT_COVERAGE_MS = 240_000;

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

describe('D3a guard: port positions that could change a layout', () => {
  function graphWithPort(): { root: ElkNode; node: ElkNode; port: ElkPort } {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('g');
    const node = ElkGraphUtil.createNode(root);
    node.setIdentifier('n');
    const port = ElkGraphUtil.createPort(node);
    port.setIdentifier('p');
    port.setProperty(CoreOptions.PORT_SIDE, PortSide.EAST);
    port.setProperty(CoreOptions.PORT_INDEX, 0);
    return { root, node, port };
  }

  it('accepts a port with an explicit side and index under FIXED_ORDER', () => {
    const { root, node } = graphWithPort();
    node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    expect(portsWithLayoutRelevantPosition(root)).toEqual([]);
  });

  it('flags a port without a side, a port without an index, and FIXED_POS / FIXED_RATIO nodes', () => {
    const noSide = graphWithPort();
    noSide.port.setProperty(CoreOptions.PORT_SIDE, PortSide.UNDEFINED);
    expect(portsWithLayoutRelevantPosition(noSide.root)).toEqual([
      'g/n/p: no side (ELK infers it from the position, LGraphUtil.calcPortSide)',
    ]);
    const noIndex = graphWithPort();
    noIndex.port.getProperties().removeKey(CoreOptions.PORT_INDEX);
    expect(portsWithLayoutRelevantPosition(noIndex.root)).toEqual([
      'g/n/p: no port.index (FIXED_ORDER infers the order from positions, PortListSorter.java:44-47)',
    ]);
    for (const constraints of [PortConstraints.FIXED_POS, PortConstraints.FIXED_RATIO]) {
      const fixed = graphWithPort();
      fixed.node.setProperty(CoreOptions.PORT_CONSTRAINTS, constraints);
      expect(portsWithLayoutRelevantPosition(fixed.root)).toEqual([`g/n/p: constraints ${constraints.toString()}`]);
    }
  });
});

describe.skipIf(skipReason !== '')(`D3: realworld .json and .elkt yield the same ElkGraph${note}`, () => {
  if (skipReason !== '') {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  it(
    'every realworld model with both formats is equal except for port positions (D3a)',
    () => {
      const ids = realworldIds(modelsDir);
      const root = path.join(modelsDir, REALWORLD);
      const differing: string[] = [];
      const layoutRelevant: string[] = [];
      for (const id of ids) {
        const fromJson = ElkGraphJson.forGraph(readFileSync(path.join(root, id + JSON_EXT), 'utf8')).toElk();
        const fromText = loaded(readFileSync(path.join(root, id + ELKT), 'utf8'));
        for (const [source, graph] of [[JSON_EXT, fromJson], [ELKT, fromText]] as const) {
          layoutRelevant.push(...portsWithLayoutRelevantPosition(graph).map((p) => `${id}${source} ${p}`));
        }
        if (
          JSON.stringify(canonGraphWithoutPortPositions(fromJson)) !==
          JSON.stringify(canonGraphWithoutPortPositions(fromText))
        ) {
          differing.push(id);
        }
      }
      console.log(
        `D3: realworld models=${ids.length} differing=${differing.length} layout-relevant ports=${layoutRelevant.length}`,
      );
      expect(ids).toHaveLength(REALWORLD_MODEL_COUNT);
      expect(layoutRelevant).toEqual([]);
      expect(differing).toEqual([]);
    },
    isCoverageRun() ? D3_TIMEOUT_COVERAGE_MS : D3_TIMEOUT_MS,
  );
});
