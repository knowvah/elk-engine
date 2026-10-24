// SPDX-License-Identifier: EPL-2.0
// The minimal equivalent of the alg.test `LayoutTestRunner` for a test with one algorithm and one graph file: load
// the `.elkt`, apply the algorithm to every node (`TestAlgorithm.apply`), run the configurator
// (`TestConfiguration.apply`), lay out through the engine (`ExperimentStatement`), and return the root so the test
// methods can inspect it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';

/** Where the vendored ticket models live (`ModelResourcePath` resolves against the models checkout in Java). */
const MODELS_DIR = path.join(import.meta.dirname, '..', 'golden', 'inputs');

function applyAlgorithm(node: ElkNode, algorithmId: string): void {
  node.setProperty(CoreOptions.ALGORITHM, algorithmId);
  for (const child of node.getChildren()) {
    applyAlgorithm(child, algorithmId);
  }
}

/**
 * Loads `modelPath` (relative to `test/golden/inputs`), sets `algorithmId` on every node, runs `configurator`, lays
 * the graph out and returns its root.
 *
 * @throws Error when the model has syntax or linking errors or no root
 */
export function layoutElkt(
  modelPath: string,
  algorithmId: string,
  configurator: (graph: ElkNode) => void = () => {},
): ElkNode {
  LayoutMetaDataService.getInstance();
  const { root, errors } = ElkGraphText.load(readFileSync(path.join(MODELS_DIR, modelPath), 'utf8'));
  if (root === null || errors.length > 0) {
    throw new Error(`Cannot load ${modelPath}: ${errors[0]?.message ?? 'no root'}`);
  }
  applyAlgorithm(root, algorithmId);
  configurator(root);
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return root;
}
