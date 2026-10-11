// SPDX-License-Identifier: EPL-2.0
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type Census,
  type CensusModel,
  DEFAULT_ALGORITHM,
  assembleCensus,
  caseOutputName,
  classifyModel,
  diffCensus,
  discoverModels,
  normalizeAlgorithm,
  serializeCensus,
} from '../../tools/corpus/census.js';
import { loadManifest, repoRoot, resolveModelsDir } from './corpus.js';

const LAYERED = 'org.eclipse.elk.layered';
const STRESS = 'org.eclipse.elk.stress';
const ID = 'tickets/layered/546_borderGaps';
const ALL_FORMATS = ['elkg', 'elkt', 'json'];

const resolution = resolveModelsDir({});
const modelsDir = 'dir' in resolution ? resolution.dir : undefined;
const skipReason = 'skip' in resolution ? resolution.skip : '';
const committed = JSON.parse(
  readFileSync(path.join(repoRoot(), 'test', 'corpus', 'census.json'), 'utf8'),
) as Census;

describe('normalizeAlgorithm', () => {
  it.each([
    ['layered', LAYERED],
    ['elk.layered', LAYERED],
    ['org.eclipse.elk.layered', LAYERED],
    ['stress', STRESS],
    ['elk.stress', STRESS],
    ['rectpacking', 'org.eclipse.elk.rectpacking'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeAlgorithm(raw)).toBe(expected);
  });
});

describe('classifyModel', () => {
  it('defaults the root algorithm to layered when none is declared', () => {
    const m = classifyModel({ id: 'r' }, ID, ['elkt']);
    expect(m.rootAlgorithm).toBe(DEFAULT_ALGORITHM);
    expect(m.rootAlgorithm).toBe(LAYERED);
    expect(m.declaredAlgorithms).toEqual([]);
  });

  it('normalizes elk.stress declared on the root', () => {
    const m = classifyModel(
      { id: 'r', layoutOptions: { 'elk.algorithm': 'elk.stress' } },
      ID,
      ['elkt'],
    );
    expect(m.rootAlgorithm).toBe(STRESS);
    expect(m.declaredAlgorithms).toEqual([STRESS]);
  });

  it.each(['algorithm', 'elk.algorithm', 'org.eclipse.elk.algorithm'])(
    'reads the %s key from layoutOptions',
    (key) => {
      const m = classifyModel({ layoutOptions: { [key]: 'box' } }, ID, ['elkt']);
      expect(m.rootAlgorithm).toBe('org.eclipse.elk.box');
    },
  );

  it('reads the algorithm from properties as well', () => {
    const m = classifyModel({ properties: { algorithm: 'fixed' } }, ID, ['elkt']);
    expect(m.rootAlgorithm).toBe('org.eclipse.elk.fixed');
  });

  it('collects sorted unique algorithms from nested nodes; root stays default', () => {
    const m = classifyModel(
      {
        children: [
          { layoutOptions: { algorithm: 'stress' }, children: [{ layoutOptions: { algorithm: 'box' } }] },
          { layoutOptions: { 'elk.algorithm': 'elk.stress' } },
        ],
      },
      ID,
      ['elkt'],
    );
    expect(m.declaredAlgorithms).toEqual(['org.eclipse.elk.box', STRESS]);
    expect(m.rootAlgorithm).toBe(LAYERED);
  });

  it('ignores non-string algorithm values', () => {
    const m = classifyModel({ layoutOptions: { algorithm: 3 } }, ID, ['elkt']);
    expect(m.declaredAlgorithms).toEqual([]);
  });

  it('counts the root as the graph, not a node; depth 0 for a flat graph', () => {
    const m = classifyModel({ id: 'r' }, ID, ['elkt']);
    expect(m).toMatchObject({ nodes: 0, edges: 0, ports: 0, labels: 0, maxDepth: 0 });
  });

  it('counts nested elements and reports maxDepth 2 for two nesting levels', () => {
    const m = classifyModel(
      {
        labels: [{ text: 'root' }],
        ports: [{ id: 'rp', labels: [{ text: 'pl' }] }],
        edges: [{ id: 'e0', labels: [{ text: 'el' }, { text: 'el2' }] }],
        children: [
          {
            id: 'a',
            labels: [{ text: 'a' }],
            ports: [{ id: 'ap' }],
            edges: [{ id: 'e1' }],
            children: [{ id: 'b', ports: [{ id: 'bp' }, { id: 'bq' }] }],
          },
          { id: 'c' },
        ],
      },
      ID,
      ['elkt'],
    );
    expect(m).toMatchObject({
      nodes: 3,
      edges: 2,
      ports: 4,
      labels: 5,
      maxDepth: 2,
    });
  });

  it('derives folder from the first id segment', () => {
    expect(classifyModel({}, ID, ['elkt']).folder).toBe('tickets');
    expect(classifyModel({}, 'realworld/x/y', ['json']).folder).toBe('realworld');
    expect(classifyModel({}, 'examples/a', ['elkt']).folder).toBe('examples');
    expect(classifyModel({}, 'tests/a', ['elkt']).folder).toBe('tests');
  });

  it('picks json as source when a json exists and sorts formats', () => {
    const m = classifyModel({}, 'realworld/p/m', ['json', 'elkg', 'elkt']);
    expect(m.source).toBe('json');
    expect(m.formats).toEqual(ALL_FORMATS);
  });

  it('picks elkt as source when no json exists', () => {
    const m = classifyModel({}, ID, ['elkt', 'elkg']);
    expect(m.source).toBe('elkt');
    expect(m.formats).toEqual(['elkg', 'elkt']);
  });

  it('marks undefined input as parse error with zero counts and default algorithm', () => {
    const m = classifyModel(undefined, ID, ['elkt']);
    expect(m).toEqual({
      id: ID,
      folder: 'tickets',
      source: 'elkt',
      formats: ['elkt'],
      parse: 'error',
      nodes: 0,
      edges: 0,
      ports: 0,
      labels: 0,
      maxDepth: 0,
      declaredAlgorithms: [],
      rootAlgorithm: LAYERED,
    });
  });

  it('marks a non-object parse result as a parse error', () => {
    expect(classifyModel(42, ID, ['elkt']).parse).toBe('error');
    expect(classifyModel(null, ID, ['elkt']).parse).toBe('error');
    expect(classifyModel({}, ID, ['elkt']).parse).toBe('ok');
  });
});

describe('caseOutputName', () => {
  it('replaces slashes with double underscores', () => {
    expect(caseOutputName(ID)).toBe('tickets__layered__546_borderGaps.json');
  });
});

describe('discoverModels', () => {
  it('groups files by id, sorts formats, ignores non-model files', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'census-'));
    for (const folder of ['tests', 'tickets']) mkdirSync(path.join(root, folder));
    mkdirSync(path.join(root, 'realworld', 'p'), { recursive: true });
    mkdirSync(path.join(root, 'examples', 'g'), { recursive: true });
    mkdirSync(path.join(root, 'other'), { recursive: true });
    for (const f of ['realworld/p/m.json', 'realworld/p/m.elkt', 'realworld/p/m.elkg', 'realworld/p/README.txt', 'examples/g/z.elkt', 'other/q.elkt']) {
      writeFileSync(path.join(root, f), '');
    }
    expect(discoverModels(root)).toEqual([
      { id: 'examples/g/z', formats: ['elkt'] },
      { id: 'realworld/p/m', formats: ALL_FORMATS },
    ]);
  });
});

function model(id: string, extra: Partial<CensusModel> = {}): CensusModel {
  return { ...classifyModel({}, id, ['elkt']), ...extra };
}

describe('assembleCensus', () => {
  it('sorts models by id and records count and commits', () => {
    const c = assembleCensus([model('tests/b'), model('examples/a')], 'M', 'E');
    expect(c.models.map((m) => m.id)).toEqual(['examples/a', 'tests/b']);
    expect(c.count).toBe(2);
    expect(c.modelsCommit).toBe('M');
    expect(c.elkCommit).toBe('E');
  });

  it('rejects duplicate ids', () => {
    expect(() => assembleCensus([model('tests/b'), model('tests/b')], 'M', 'E')).toThrow(
      /duplicate/i,
    );
  });
});

describe('serializeCensus / diffCensus', () => {
  const base = assembleCensus([model('tests/a'), model('tests/b')], 'M', 'E');

  it('serializes with a trailing newline', () => {
    const text = serializeCensus(base);
    expect(text.endsWith('}\n')).toBe(true);
    expect(JSON.parse(text)).toEqual(base);
  });

  it('reports no differences for equal censuses', () => {
    expect(diffCensus(base, base)).toEqual([]);
  });

  it('reports added, removed and changed models', () => {
    const next = assembleCensus(
      [model('tests/a', { nodes: 7 }), model('tests/c')],
      'M',
      'E',
    );
    expect(diffCensus(base, next)).toEqual([
      'changed tests/a',
      'removed tests/b',
      'added tests/c',
    ]);
  });

  it('reports header changes', () => {
    const next = assembleCensus(base.models.slice(), 'M2', 'E');
    expect(diffCensus(base, next)).toEqual(['modelsCommit: M -> M2']);
  });
});

describe('committed census.json', () => {
  it('pins the manifest commit and the oracle ELK commit', () => {
    const elk = readFileSync(path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT'), 'utf8').trim();
    expect(committed.modelsCommit).toBe(loadManifest().commit);
    expect(committed.elkCommit).toBe(elk);
  });

  it('is sorted, unique, and count matches models', () => {
    const ids = committed.models.map((m) => m.id);
    expect(committed.count).toBe(ids.length);
    expect(ids).toEqual([...new Set(ids)].sort());
  });

  it.skipIf(modelsDir === undefined)(
    `matches the discovered corpus (${skipReason || 'pinned clone'})`,
    () => {
      const found = discoverModels(modelsDir ?? '');
      expect(found.length).toBe(898);
      expect(committed.count).toBe(898);
      expect(committed.models.map((m) => m.id)).toEqual(found.map((f) => f.id));
      expect(committed.models.map((m) => m.formats)).toEqual(found.map((f) => f.formats));
    },
  );

  it('classifies a realworld model with json, elkt and elkg as source json', () => {
    const real = committed.models.find((m) => m.formats.join() === ALL_FORMATS.join());
    expect(real?.source).toBe('json');
    expect(real?.folder).toBe('realworld');
  });
});
