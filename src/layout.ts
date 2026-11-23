// SPDX-License-Identifier: EPL-2.0
import { DisCoMetaDataProvider } from './alg/disco/options/DisCoMetaDataProvider.js';
import { PolyominoOptions } from './alg/common/compaction/options/PolyominoOptions.js';
import { ForceMetaDataProvider } from './alg/force/options/ForceMetaDataProvider.js';
import { StressMetaDataProvider } from './alg/force/options/StressMetaDataProvider.js';
import { LayeredMetaDataProvider } from './alg/layered/options/LayeredMetaDataProvider.js';
import { MrTreeMetaDataProvider } from './alg/mrtree/options/MrTreeMetaDataProvider.js';
import { RadialMetaDataProvider } from './alg/radial/options/RadialMetaDataProvider.js';
import { RectPackingMetaDataProvider } from './alg/rectpacking/options/RectPackingMetaDataProvider.js';
import { SporeMetaDataProvider } from './alg/spore/options/SporeMetaDataProvider.js';
import { TopdownpackingMetaDataProvider } from './alg/topdownpacking/options/TopdownpackingMetaDataProvider.js';
import { VertiFlexMetaDataProvider } from './alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { LayoutMetaDataService } from './core/data/LayoutMetaDataService.js';
import type { ILayoutMetaDataProvider } from './core/data/ILayoutMetaDataProvider.js';
import { RecursiveGraphLayoutEngine } from './core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from './core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from './graph/json/ElkGraphJson.js';

/**
 * An ELK JSON graph as a plain object: the shape elkjs takes and returns (`id`, `children`, `edges`, `layoutOptions`,
 * and so on). Port-local type: ELK's Java has no counterpart (AD-14 amendment, `plans/npm-1-0-release/decisions.md`).
 */
export interface ElkJsonGraph {
  readonly [key: string]: unknown;
}

/** Options of {@link layout}. Port-local, as {@link ElkJsonGraph}. */
export interface LayoutOptions {
  /** Layout options merged over the `layoutOptions` of the root node; a key given here wins. */
  readonly layoutOptions?: Readonly<Record<string, string>>;
}

const LAYOUT_OPTIONS_KEY = 'layoutOptions';

/** The services whose registry already holds every ported algorithm; `LayoutMetaDataService.unload()` drops the key. */
const REGISTERED = new WeakSet<LayoutMetaDataService>();

/** One provider per ported algorithm bundle, in the order the oracle registers them (`ElkOracle.java:218-221`). */
function allProviders(): ILayoutMetaDataProvider[] {
  return [
    new PolyominoOptions(),
    new DisCoMetaDataProvider(),
    new ForceMetaDataProvider(),
    new LayeredMetaDataProvider(),
    new MrTreeMetaDataProvider(),
    new RadialMetaDataProvider(),
    new RectPackingMetaDataProvider(),
    new SporeMetaDataProvider(),
    new StressMetaDataProvider(),
    new TopdownpackingMetaDataProvider(),
    new VertiFlexMetaDataProvider(),
  ];
}

/**
 * Registers every ported algorithm once per service instance. A provider the caller registered first is registered
 * again: the registry keys data by id (`Map.set`), so the entries are replaced by equivalent ones, as in Java.
 */
function ensureAlgorithmsRegistered(): void {
  const service = LayoutMetaDataService.getInstance();
  if (REGISTERED.has(service)) return;
  service.registerLayoutMetaDataProviders(...allProviders());
  REGISTERED.add(service);
}

/** The graph as ELK JSON text, with `options.layoutOptions` merged over the root's own. */
function jsonTextOf(graph: string | ElkJsonGraph, options: LayoutOptions | undefined): string {
  const extra = options?.layoutOptions;
  if (extra === undefined) return typeof graph === 'string' ? graph : JSON.stringify(graph);
  const root = (typeof graph === 'string' ? JSON.parse(graph) : structuredClone(graph)) as Record<string, unknown>;
  root[LAYOUT_OPTIONS_KEY] = { ...(root[LAYOUT_OPTIONS_KEY] as Record<string, unknown> | undefined), ...extra };
  return JSON.stringify(root);
}

/**
 * Lays an ELK JSON graph out and returns the laid-out graph as ELK JSON: nodes get `x`, `y`, `width`, `height`, edges
 * get `sections` with bend points. The input is not changed. Every ported algorithm is registered on first use, so the
 * caller registers nothing. A malformed graph, an unknown option or a layout failure rejects the returned promise.
 *
 * The work runs to completion inside one call; the promise is the stable contract, as in `@knowvah/dot-engine`.
 *
 * @param graph the root node, as an object or as JSON text
 * @param options per-call options
 */
export async function layout(graph: string | ElkJsonGraph, options?: LayoutOptions): Promise<ElkJsonGraph> {
  const text = jsonTextOf(graph, options);
  ensureAlgorithmsRegistered();
  const root = ElkGraphJson.forGraph(text).toElk();
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  // Keep zero coordinates and sizes: a consumer reads `x`/`y` without a missing-means-zero rule.
  const out = ElkGraphJson.forGraph(root).omitZeroPositions(false).omitZeroDimension(false).toJson();
  return JSON.parse(out) as ElkJsonGraph;
}
