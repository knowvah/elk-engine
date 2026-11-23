// SPDX-License-Identifier: EPL-2.0
// The accepted export surface (npm-1-0-release N1, N3): the table of docs/architecture/public-api.md and `src/index.ts`
// name the same exports, the package name resolves to `src/index.ts`, and a graph can be built, configured and laid
// out with its exports alone. Exact coordinates are asserted only where an oracle ref exists (test/docs/examples.test.ts
// and src/layout.test.ts); this file asserts structure.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { repoRoot } from '../test/corpus/corpus.js';
import * as candidate from './index.js';

const ROOT = repoRoot();
const PROPOSAL_FILE = path.join(ROOT, 'docs', 'architecture', 'public-api.md');
const CANDIDATE_FILE = path.join(ROOT, 'src', 'index.ts');
const PORT_LOCAL_TIER = '5';
const PACKAGE_NAME = '@knowvah/elk-engine';
const KIND_VALUE = 'value';
const KIND_TYPE = 'type';
const LAYERED_ID = 'org.eclipse.elk.layered';
const NODE_SIZE = 30;
const JAVA_SEE_PREFIX = 'org.eclipse.elk.';
const JAVA_SEE_SUFFIX = '.java';
const SRC_PREFIX = 'src/';

interface ExportRow {
  readonly name: string;
  readonly kind: string;
  readonly tier: string;
  readonly module: string;
  readonly see: string;
  readonly why: string;
}

function unquote(cell: string): string {
  return cell.replaceAll('`', '').trim();
}

/** The export rows of the proposal: table lines whose first cell is a code-quoted name and whose second is a kind. */
function proposalRows(): readonly ExportRow[] {
  const rows: ExportRow[] = [];
  for (const line of readFileSync(PROPOSAL_FILE, 'utf8').split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const [, name, kind, tier, module, see, why] = cells;
    if (name === undefined || !name.startsWith('`') || (kind !== KIND_VALUE && kind !== KIND_TYPE)) continue;
    rows.push({
      name: unquote(name),
      kind,
      tier: tier ?? '',
      module: unquote(module ?? ''),
      see: unquote(see ?? ''),
      why: why ?? '',
    });
  }
  return rows;
}

/** The export statements of the candidate, from its source: `[name, kind, module]` in file order. */
function candidateStatements(): readonly (readonly [string, string, string])[] {
  const statement = new RegExp('^export (type )?\\{ (\\w+) \\} from \\x27\\./([^\\x27]+)\\.js\\x27;$');
  const found: [string, string, string][] = [];
  for (const line of readFileSync(CANDIDATE_FILE, 'utf8').split('\n')) {
    const match = statement.exec(line);
    if (match === null) continue;
    found.push([match[2] ?? '', match[1] === undefined ? KIND_VALUE : KIND_TYPE, `${SRC_PREFIX}${match[3] ?? ''}.ts`]);
  }
  return found;
}

const rows = proposalRows();

describe('src/index.ts and the accepted export surface (AD-14, N1, N3)', () => {
  it('the runtime exports of the candidate are the value rows of the proposal', () => {
    const values = rows.filter((row) => row.kind === KIND_VALUE).map((row) => row.name);
    expect(values.length).toBeGreaterThan(0);
    expect(Object.keys(candidate).sort()).toEqual([...values].sort());
  });

  it('every export statement of the candidate is a row of the proposal, with its kind and module, in order', () => {
    expect(candidateStatements()).toEqual(rows.map((row) => [row.name, row.kind, row.module]));
  });

  it('the candidate has no export other than single named re-exports', () => {
    const exportLines = readFileSync(CANDIDATE_FILE, 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('export'));
    expect(exportLines).toHaveLength(candidateStatements().length);
  });

  it('every row names an src module that exists, a tier and a reason, and every ported one its Java class', () => {
    const portLocal = (row: ExportRow): boolean => row.tier === PORT_LOCAL_TIER;
    const incomplete = rows.filter(
      (row) =>
        (!portLocal(row) && (!row.see.startsWith(JAVA_SEE_PREFIX) || !row.see.endsWith(JAVA_SEE_SUFFIX))) ||
        !row.module.startsWith(SRC_PREFIX) ||
        !['1', '2', '3', '4', PORT_LOCAL_TIER].includes(row.tier) ||
        row.why === '',
    );
    expect(incomplete).toEqual([]);
    const sources = rows.map((row) => readFileSync(path.join(ROOT, row.module), 'utf8'));
    const unseen = rows.filter((row, i) => !portLocal(row) && !(sources[i] ?? '').includes(`@see ${row.see}`));
    expect(unseen).toEqual([]);
  });

  it('only the port-local tier lacks a Java class: exactly layout, ElkJsonGraph and LayoutOptions', () => {
    expect(rows.filter((row) => row.tier === PORT_LOCAL_TIER).map((row) => row.name)).toEqual([
      'layout',
      'ElkJsonGraph',
      'LayoutOptions',
    ]);
  });

  it('exports nothing from the internal families', () => {
    const internal = ['src/java/', 'src/guava/', 'src/emf/', 'src/xtext/', 'src/equinox/', 'src/gson/'];
    expect(rows.filter((row) => internal.some((prefix) => row.module.startsWith(prefix)))).toEqual([]);
  });

  it(`${PACKAGE_NAME} resolves to src/index.ts in a fresh module graph`, async () => {
    vi.resetModules();
    const byName: Record<string, unknown> = await import(PACKAGE_NAME);
    const util = await import('./graph/util/ElkGraphUtil.js');
    const engine = await import('./core/RecursiveGraphLayoutEngine.js');
    const json = await import('./graph/json/ElkGraphJson.js');
    expect(byName['ElkGraphUtil']).toBe(util.ElkGraphUtil);
    expect(byName['RecursiveGraphLayoutEngine']).toBe(engine.RecursiveGraphLayoutEngine);
    expect(byName['ElkGraphJson']).toBe(json.ElkGraphJson);
    expect(Object.keys(byName).sort()).toEqual(Object.keys(candidate).sort());
  });

  it('builds, configures and lays out a two-node graph with the exports alone', () => {
    const { ElkGraphUtil, CoreOptions, LayeredOptions, LayeredMetaDataProvider } = candidate;
    const { LayoutMetaDataService, RecursiveGraphLayoutEngine, BasicProgressMonitor } = candidate;
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
    const nodes = [ElkGraphUtil.createNode(graph), ElkGraphUtil.createNode(graph)] as const;
    for (const node of nodes) node.setDimensions(NODE_SIZE, NODE_SIZE);
    const edge = ElkGraphUtil.createSimpleEdge(nodes[0], nodes[1]);

    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());

    // RecursiveGraphLayoutEngine records the algorithm it resolved on the graph it laid out.
    expect(graph.getProperty(CoreOptions.RESOLVED_ALGORITHM).getId()).toBe(LAYERED_ID);
    expect(edge.getSections().size()).toBe(1);
    const coordinates = nodes.flatMap((node) => [node.getX(), node.getY()]);
    expect(coordinates.map((value) => Number.isFinite(value))).toEqual([true, true, true, true]);
    expect([graph.getWidth() >= NODE_SIZE, graph.getHeight() >= NODE_SIZE]).toEqual([true, true]);
  });
});
