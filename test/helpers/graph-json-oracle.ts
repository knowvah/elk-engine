// SPDX-License-Identifier: EPL-2.0
import { GsonBuilder } from '../../src/gson/GsonBuilder.js';
import { Random } from '../../src/java/util/Random.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { JsonExporter } from '../../src/graph/json/JsonExporter.js';

/** The seed `tools/oracle/run.sh` gives the oracle's JsonExporter (EXPORT_SEED, J4). */
export const ORACLE_EXPORT_SEED = 1;

/**
 * The oracle's `CaseRunner.export` (tools/oracle/harness/CaseRunner.java:71-78): omitLayout false,
 * omitZeroDimension false, omitZeroPositions false, omitUnknownLayoutOptions true, prettyPrint true,
 * short layout option keys (default). The calls `ExportBuilder.toJson` makes, with the seeded exporter
 * (the builder takes no seed, J4). The oracle's file is this text plus "\n".
 */
export function exportLikeOracle(root: ElkNode): string {
  const exporter = new JsonExporter(new Random(ORACLE_EXPORT_SEED));
  exporter.setOptions(false, false, false, true, true);
  const gson = new GsonBuilder().disableHtmlEscaping().setPrettyPrinting().create();
  return gson.toJson(exporter.export(root));
}
