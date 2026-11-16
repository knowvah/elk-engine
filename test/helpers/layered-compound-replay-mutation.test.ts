// SPDX-License-Identifier: EPL-2.0
// Mutation checks of the tree comparison (mission 7h, T9, audit of `compareTree` and its value-form maps). A recorded tree (a `scenarios`
// row's tree at its last stop) is replayed through the real driver; the TS dump must equal the recording, then one value of each kind is
// perturbed in a copy of the TS dump and the comparison must name it. This shows the comparison is not vacuous: the maps that bridge the
// recorder's property encoding and the TS dump's (`actualLeaf` / `expectedLeaf`) hide no kind of difference below. The marker for an
// element outside the dumped tree names its LGraph class, so an outside edge and an outside node differ.
import { describe, expect, it } from 'vitest';
import {
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
} from './layered-compound-replay-rows.js';
import { runRow } from './layered-compound-replay-run.js';
import { compareTree } from './layered-compound-replay-dump.js';

type Json = unknown;
type Path = readonly (string | number)[];
interface Site {
  readonly path: Path;
  readonly value: Json;
}

const isObject = (value: Json): value is Record<string, Json> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Every value of the tree (with its path) for which `pick` answers true. */
function sitesOf(tree: Json, pick: (value: Json, path: Path) => boolean, path: Path = []): Site[] {
  const here: Site[] = pick(tree, path) ? [{ path, value: tree }] : [];
  const children: [string | number, Json][] = Array.isArray(tree)
    ? tree.map((item, i) => [i, item])
    : isObject(tree)
      ? Object.entries(tree)
      : [];
  return [...here, ...children.flatMap(([key, child]) => sitesOf(child, pick, [...path, key]))];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** A copy of `tree` with the value at `path` replaced. */
function withValue(tree: Json, path: Path, replacement: Json): Json {
  const copy = clone(tree);
  let holder = copy as Record<string | number, Json>;
  for (const key of path.slice(0, -1)) {
    holder = holder[key] as Record<string | number, Json>;
  }
  holder[path.at(-1)!] = replacement;
  return copy;
}

/** The IEEE bits of the recorder's hex form shifted by one whole unit: a change far beyond the 1e-6 tolerance. */
const flipHex = (hex: unknown): string => {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, BigInt(`0x${String(hex)}`));
  view.setFloat64(0, view.getFloat64(0) + 1);
  return view.getBigUint64(0).toString(16).padStart(16, '0');
};

/** The kinds the audit perturbs: how to find a site and what to put there. */
const KINDS: Record<string, { pick: (value: Json, path: Path) => boolean; perturb: (value: Json) => Json }> = {
  'node position': {
    pick: (v, p) => typeof v === 'string' && p.length === 6 && p[2] === 'layerlessNodes' && p.at(-2) === 'pos',
    perturb: flipHex,
  },
  'port side': {
    pick: (v, p) => typeof v === 'string' && p.at(-1) === 'side' && p.at(-3) === 'ports',
    perturb: (v) => (v === 'NORTH' ? 'SOUTH' : 'NORTH'),
  },
  'bend point': {
    pick: (v, p) => typeof v === 'string' && p.at(-3) === 'bendPoints' && p.at(-1) === 0,
    perturb: flipHex,
  },
  // the recorder writes `int` / `double` (a double's v is its text), the TS dump `number`
  'property number': {
    pick: (v, p) => isObject(v) && ['number', 'int', 'double'].includes(String(v.t)) && p.includes('properties'),
    perturb: (v) => {
      const number = v as { t: string; v: number | string };
      return { ...number, v: number.t === 'double' ? String(Number(number.v) + 1) : Number(number.v) + 1 };
    },
  },
  'property enum': {
    pick: (v, p) => isObject(v) && v.t === 'enum' && p.includes('properties'),
    perturb: (v) => ({ ...(v as Record<string, Json>), n: `${String((v as { n: string }).n)}_MUTATED` }),
  },
  'reference target': {
    pick: (v, p) => isObject(v) && typeof v.ref === 'string' && p.includes('properties'),
    perturb: () => ({ ref: 'g0/n9999' }),
  },
  'edge endpoint': {
    pick: (v, p) => typeof v === 'string' && p.at(-1) === 'source' && p.at(-3) === 'edges',
    perturb: () => 'g0/n9999/p9999',
  },
  'crossHierarchyMap segment': {
    pick: (v, p) => typeof v === 'string' && p.at(-1) === 'graph' && p[0] === 'crossHierarchyMap',
    perturb: () => 'g9999',
  },
  'crossHierarchyMap key': {
    pick: (v, p) => typeof v === 'string' && p.at(-1) === 'origEdge' && p[0] === 'crossHierarchyMap',
    perturb: () => 'g9999/e9999',
  },
  'layerNodes entry': {
    pick: (v, p) => typeof v === 'string' && p.length === 6 && p[2] === 'layerNodes' && p.at(-2) === 'pos',
    perturb: flipHex,
  },
  'level path': {
    pick: (v, p) => typeof v === 'string' && p.at(-1) === 'levelPath' && p.length === 3,
    perturb: (v) => `${String(v)}/mutated`,
  },
};

interface Subject {
  readonly row: CompoundModelsRow;
  readonly expected: Json;
  readonly actual: Json;
}

/** The first models row whose recorded tree holds a site of every kind (a stop between layering and the postprocessor: the tree still has layer nodes), run through the real driver. */
function subject(): Subject {
  for (const row of loadCompoundRowsIfPresent().filter(isCompoundModelsRow)) {
    const tree = row.expected.tree;
    if (Object.values(KINDS).every((kind) => sitesOf(tree, kind.pick).length > 0)) {
      const run = runRow(row, { wantTree: (stop) => stop.index === row.expected.stop.index });
      return { row, expected: tree, actual: run.stops[row.expected.stop.index]!.tree };
    }
  }
  throw new Error('no models row holds a site of every kind');
}

describe('compareTree is not vacuous (mutation checks on a replayed recorded tree)', () => {
  const { expected, actual } = subject();

  it('accepts the replayed tree unchanged', () => {
    expect(compareTree(expected, actual)).toEqual([]);
  });

  describe.each(Object.entries(KINDS))('%s', (_name, kind) => {
    const sites = sitesOf(actual, kind.pick);

    it('has a site in the replayed tree', () => {
      expect(sites.length).toBeGreaterThan(0);
    });

    it('names a perturbation of the actual tree', () => {
      const site = sites[0]!;
      const diffs = compareTree(expected, withValue(actual, site.path, kind.perturb(site.value)));
      expect(diffs.length).toBeGreaterThan(0);
    });

    it('names a perturbation of the expected tree', () => {
      const site = sitesOf(expected, kind.pick)[0]!;
      const diffs = compareTree(withValue(expected, site.path, kind.perturb(site.value)), actual);
      expect(diffs.length).toBeGreaterThan(0);
    });
  });

  describe('the marker of an element outside the tree', () => {
    const outsideRefs = (tree: Json): Site[] =>
      sitesOf(tree, (v) => isObject(v) && typeof v.ref === 'string' && v.ref.startsWith('x/'));
    /** The TS dump's unpatched form inside a list: `{ class: '<simple name>' }`. */
    const outsideSimple = (tree: Json): Site[] =>
      sitesOf(tree, (v) => isObject(v) && Object.keys(v).length === 1 && /^L[A-Z][a-z]+$/.test(String(v.class)));
    const outsideRecorded = (tree: Json): Site[] =>
      sitesOf(tree, (v) => isObject(v) && String(v.class).startsWith('org.eclipse.elk.alg.layered.graph.'));
    const withoutItems = (site: Site): Path => site.path.filter((key) => key !== 'items');

    it('is present in the replayed tree and in the recording, in the same places', () => {
      const replayed = [...outsideRefs(actual), ...outsideSimple(actual)].map(withoutItems);
      expect(replayed.length).toBeGreaterThan(0);
      expect(outsideRecorded(expected).map((site) => site.path)).toEqual(
        expect.arrayContaining(replayed.map((path) => path)),
      );
      expect(outsideRecorded(expected)).toHaveLength(replayed.length);
    });

    it('differs when the class of an outside element differs', () => {
      const site = outsideRefs(actual)[0]!;
      const other = String((site.value as { ref: string }).ref).startsWith('x/e') ? 'x/n0' : 'x/e0';
      expect(compareTree(expected, withValue(actual, site.path, { ref: other })).length).toBeGreaterThan(0);
    });

    it('differs when an element of the tree stands where an outside element is recorded', () => {
      const site = outsideRefs(actual)[0]!;
      expect(compareTree(expected, withValue(actual, site.path, { ref: 'g0/e0' })).length).toBeGreaterThan(0);
    });

    it('differs when the class of an outside element in a list differs', () => {
      const site = outsideSimple(actual)[0]!;
      expect(compareTree(expected, withValue(actual, site.path, { class: 'LNode' })).length).toBeGreaterThan(0);
    });

    it('differs when the recording names another class than the replay', () => {
      const site = outsideRefs(actual)[0]!;
      const renamed = { class: 'org.eclipse.elk.alg.layered.graph.LPort' };
      expect(compareTree(withValue(expected, site.path, renamed), actual).length).toBeGreaterThan(0);
    });

    it('compares the class name of an opaque value', () => {
      const site = outsideRefs(actual)[0]!;
      const opaque = { class: 'org.eclipse.elk.alg.layered.OpaqueThing' };
      expect(compareTree(withValue(expected, site.path, opaque), withValue(actual, site.path, opaque))).toEqual([]);
      const other = withValue(actual, site.path, { class: 'org.eclipse.elk.alg.layered.OtherThing' });
      expect(compareTree(withValue(expected, site.path, opaque), other).length).toBeGreaterThan(0);
    });
  });
});
