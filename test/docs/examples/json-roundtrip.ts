// SPDX-License-Identifier: EPL-2.0
import {
  BasicProgressMonitor,
  ElkGraphJson,
  LayeredMetaDataProvider,
  LayoutMetaDataService,
  RecursiveGraphLayoutEngine,
} from '@knowvah/elk-engine';

/** Reads a graph from ELK JSON, lays it out, and writes it back as ELK JSON with positions and edge routes. */
export function layoutJson(json: string): string {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());

  const graph = ElkGraphJson.forGraph(json).toElk();
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());

  // Keep zero coordinates and sizes in the output; by default the exporter leaves them out.
  return ElkGraphJson.forGraph(graph).omitZeroPositions(false).omitZeroDimension(false).prettyPrint(true).toJson();
}
