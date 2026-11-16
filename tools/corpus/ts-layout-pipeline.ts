// SPDX-License-Identifier: EPL-2.0
// The TS side of one case: the same pipeline as the oracle harness (import, overlay, engine, export), with the
// algorithm registrations the tool needs. Loaded by the in-process path and by every shard worker.
import { readFileSync } from 'node:fs';
import path from 'node:path';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../src/core/options/CoreOptions.js';
import { PolyominoOptions } from '../../src/alg/common/compaction/options/PolyominoOptions.js';
import { DisCoMetaDataProvider } from '../../src/alg/disco/options/DisCoMetaDataProvider.js';
import { DisCoOptions } from '../../src/alg/disco/options/DisCoOptions.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
import { StressOptions } from '../../src/alg/force/options/StressOptions.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { MrTreeMetaDataProvider } from '../../src/alg/mrtree/options/MrTreeMetaDataProvider.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
import { RadialOptions } from '../../src/alg/radial/options/RadialOptions.js';
import { RectPackingMetaDataProvider } from '../../src/alg/rectpacking/options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from '../../src/alg/rectpacking/options/RectPackingOptions.js';
import { SporeCompactionOptions } from '../../src/alg/spore/options/SporeCompactionOptions.js';
import { SporeMetaDataProvider } from '../../src/alg/spore/options/SporeMetaDataProvider.js';
import { SporeOverlapRemovalOptions } from '../../src/alg/spore/options/SporeOverlapRemovalOptions.js';
import { TopdownpackingMetaDataProvider } from '../../src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
import { TopdownpackingOptions } from '../../src/alg/topdownpacking/options/TopdownpackingOptions.js';
import { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { ILayoutMetaDataProvider } from '../../src/core/data/ILayoutMetaDataProvider.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { loadManifest } from '../../test/corpus/corpus.js';
import { applyOverlay } from '../../test/helpers/graph-overlay.js';
import { exportLikeOracle } from '../../test/helpers/graph-json-oracle.js';
import {
  type Census,
  COMMITTED_CENSUS_RELATIVE,
  DEFAULT_ORACLE_RELATIVE,
  ELK_COMMIT_RELATIVE,
  caseOutputName,
} from './census.js';
import { type CaseDeps, type SweepRow, overlayAlgorithm } from './ts-layout-classify.js';

const RUN_A_DIR = 'run-a';
const SWEEP_DIR = 'sweep';
const GENERATED_PREFIX = 'generated/';
const GENERATED_DIR_RELATIVE = path.join('test', 'corpus', 'generated');
const ELKT_SOURCE = 'elkt';

function loadElk(source: string, text: string): ElkNode {
  if (source !== ELKT_SOURCE) return ElkGraphJson.forGraph(text).toElk();
  const loaded = ElkGraphText.load(text);
  if (loaded.root === null || loaded.errors.length > 0) {
    throw new Error(`elkt load failed: ${loaded.errors[0]?.message ?? 'no root'}`);
  }
  return loaded.root;
}

/** An algorithm the tool registers explicitly (TR5: `getInstance()` registers core only): its id and providers. */
interface AlgorithmRegistration {
  readonly id: string;
  readonly providers: () => readonly ILayoutMetaDataProvider[];
}

/**
 * The tree algorithms of mission 8a, force, stress and disco of mission 8b, rectpacking, spore and topdownpacking of
 * mission 8c; the others register in their own missions.
 */
const REGISTRATIONS: readonly AlgorithmRegistration[] = [
  { id: LayeredOptions.ALGORITHM_ID, providers: () => [new LayeredMetaDataProvider()] },
  { id: MrTreeOptions.ALGORITHM_ID, providers: () => [new MrTreeMetaDataProvider()] },
  { id: RadialOptions.ALGORITHM_ID, providers: () => [new RadialMetaDataProvider()] },
  { id: VertiFlexOptions.ALGORITHM_ID, providers: () => [new VertiFlexMetaDataProvider()] },
  { id: ForceOptions.ALGORITHM_ID, providers: () => [new ForceMetaDataProvider()] },
  { id: StressOptions.ALGORITHM_ID, providers: () => [new StressMetaDataProvider()] },
  // PolyominoOptions beside DisCo, as the oracle harness registers it (ElkOracle.java:218-221); it owns no algorithm.
  { id: DisCoOptions.ALGORITHM_ID, providers: () => [new PolyominoOptions(), new DisCoMetaDataProvider()] },
  // Mission 8c: rectpacking, the two spore algorithms (one provider) and topdownpacking.
  { id: RectPackingOptions.ALGORITHM_ID, providers: () => [new RectPackingMetaDataProvider()] },
  { id: SporeOverlapRemovalOptions.ALGORITHM_ID, providers: () => [new SporeMetaDataProvider()] },
  { id: SporeCompactionOptions.ALGORITHM_ID, providers: () => [new SporeMetaDataProvider()] },
  { id: TopdownpackingOptions.ALGORITHM_ID, providers: () => [new TopdownpackingMetaDataProvider()] },
];

/** Registers the tree, force, stress and disco metadata providers once per module registry. */
export function registerTreeAlgorithms(): void {
  const service = LayoutMetaDataService.getInstance();
  for (const { id, providers } of REGISTRATIONS) {
    if (service.getAlgorithmData(id) === null) service.registerLayoutMetaDataProviders(...providers());
  }
}

/** Mirrors `tools/oracle/harness/CaseRunner.java`: read, overlay, lay out, export. */
export function layoutToJson(graphText: string, source: string, row: SweepRow): string {
  registerTreeAlgorithms();
  const graph = loadElk(source, graphText);
  applyOverlay(graph, overlayAlgorithm(row), row.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return exportLikeOracle(graph);
}

/** The sweep directory: `--sweep-dir`, else `<ELK_ORACLE_DIR or ../elk-oracle>/sweep/<elk sha>-<models sha>`. */
export function resolveSweepDir(root: string, override: string | undefined, oracleEnv: string | undefined): string {
  if (override !== undefined) return path.resolve(override);
  const oracle =
    oracleEnv !== undefined && oracleEnv !== '' ? path.resolve(oracleEnv) : path.resolve(root, DEFAULT_ORACLE_RELATIVE);
  const elkCommit = readFileSync(path.join(root, ELK_COMMIT_RELATIVE), 'utf8').trim();
  return path.join(oracle, SWEEP_DIR, `${elkCommit}-${loadManifest().commit}`);
}

/** The directories a comparison reads: the repo root (census, generated inputs), the models and the sweep. */
export interface Dirs {
  readonly root: string;
  readonly modelsDir: string;
  readonly sweepDir: string;
}

/** The input file of a case and its source format (`json` or `elkt`). */
export function inputOf(
  row: SweepRow,
  dirs: Dirs,
  sources: ReadonlyMap<string, string>,
): { file: string; source: string } {
  if (row.modelId.startsWith(GENERATED_PREFIX)) {
    const name = row.modelId.slice(GENERATED_PREFIX.length);
    return { file: path.join(dirs.root, GENERATED_DIR_RELATIVE, `${name}.json`), source: 'json' };
  }
  const source = sources.get(row.modelId) ?? 'json';
  return { file: path.join(dirs.modelsDir, `${row.modelId}.${source}`), source };
}

export function liveDeps(dirs: Dirs): CaseDeps {
  const census = JSON.parse(readFileSync(path.join(dirs.root, COMMITTED_CENSUS_RELATIVE), 'utf8')) as Census;
  const sources = new Map(census.models.map((m) => [m.id, m.source as string]));
  return {
    readOracleOutput: (caseId) => readFileSync(path.join(dirs.sweepDir, RUN_A_DIR, caseOutputName(caseId)), 'utf8'),
    runTs: (row) => {
      const { file, source } = inputOf(row, dirs, sources);
      return layoutToJson(readFileSync(file, 'utf8'), source, row);
    },
  };
}
