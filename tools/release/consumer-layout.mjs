// SPDX-License-Identifier: EPL-2.0
// Run by tools/release/pack-smoke.ts inside a clean consumer project, never from the repository: it imports only the
// installed package (and node:fs for its input), so it proves what a consumer of the tarball can do.
// Usage: node consumer-layout.mjs <input.json>   (ELK JSON in, laid-out ELK JSON on stdout)
import { readFileSync } from 'node:fs';
import {
  BasicProgressMonitor,
  DisCoMetaDataProvider,
  ElkGraphJson,
  ForceMetaDataProvider,
  LayeredMetaDataProvider,
  LayoutMetaDataService,
  MrTreeMetaDataProvider,
  PolyominoOptions,
  RadialMetaDataProvider,
  RectPackingMetaDataProvider,
  RecursiveGraphLayoutEngine,
  SporeMetaDataProvider,
  StressMetaDataProvider,
  TopdownpackingMetaDataProvider,
  VertiFlexMetaDataProvider,
} from '@knowvah/elk-engine';

// Every provider the oracle registers (tools/oracle/harness/ElkOracle.java:218-221): the exporter names an option by
// its shortest unique suffix, so the oracle ref's option keys need the same registry.
LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
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
);

const graph = ElkGraphJson.forGraph(readFileSync(process.argv[2], 'utf8')).toElk();
new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
// The oracle's export settings (tools/oracle/harness/CaseRunner.java:71-78).
const json = ElkGraphJson.forGraph(graph)
  .omitLayout(false)
  .omitZeroDimension(false)
  .omitZeroPositions(false)
  .omitUnknownLayoutOptions(true)
  .prettyPrint(true)
  .toJson();
process.stdout.write(`${json}\n`);
