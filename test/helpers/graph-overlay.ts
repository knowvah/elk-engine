// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { isElkNode } from '../../src/graph/ElkNode.js';
import { repoRoot } from '../corpus/corpus.js';

/** `retarget` seeds the root with this value so seeded algorithms stay deterministic. */
export const RANDOM_SEED = 1;

const VARIANTS_FILE = path.join('test', 'corpus', 'variants.json');

/** A harness-side fault (unknown variant, algorithm or option); mirrors `OracleFault.java`. */
export class OracleFault extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OracleFault';
  }
}

function loadVariants(): Record<string, unknown> {
  const text = readFileSync(path.join(repoRoot(), VARIANTS_FILE), 'utf8');
  return JSON.parse(text) as Record<string, unknown>; // variants.json is a repo-controlled test fixture
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Java `JsonElement.getAsString` for a JSON primitive. */
function asString(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new OracleFault(`variant value is not a JSON primitive: ${JSON.stringify(value)}`);
}

function setOption(root: ElkNode, optionId: string, text: string): void {
  const option = LayoutMetaDataService.getInstance().getOptionData(optionId);
  if (option === null) {
    throw new OracleFault(`unknown option '${optionId}'`);
  }
  const value = option.parseValue(text);
  if (value === null) {
    throw new OracleFault(`cannot parse '${text}' for option '${optionId}'`);
  }
  root.setProperty(option, value);
}

function applyVariant(root: ElkNode, variant: string): void {
  const overlay = loadVariants()[variant];
  if (!isPlainObject(overlay)) {
    throw new OracleFault(`unknown variant '${variant}'`);
  }
  for (const [key, value] of Object.entries(overlay)) {
    setOption(root, key, asString(value));
  }
}

function markIfParent(node: ElkNode, algorithm: string): void {
  if (!node.getChildren().isEmpty()) {
    node.setProperty(CoreOptions.ALGORITHM, algorithm);
  }
}

function retarget(root: ElkNode, algorithm: string): void {
  if (LayoutMetaDataService.getInstance().getAlgorithmData(algorithm) === null) {
    throw new OracleFault(`unknown algorithm '${algorithm}'`);
  }
  root.setProperty(CoreOptions.RANDOM_SEED, RANDOM_SEED);
  // Collect first: a property is a contained map entry, so setting one while
  // iterating eAllContents() invalidates the iteration.
  const nodes: ElkNode[] = [root];
  for (const object of root.eAllContents()) {
    if (isElkNode(object)) {
      nodes.push(object);
    }
  }
  for (const node of nodes) {
    markIfParent(node, algorithm);
  }
}

/**
 * Applies a variant overlay at the root, then the retarget (algorithm on every node with children,
 * `randomSeed = 1` on the root); a null variant or algorithm skips that step.
 *
 * @throws OracleFault for an unknown variant, algorithm or option, or an unparsable value
 * @see tools/oracle/harness/GraphOverlay.java
 */
export function applyOverlay(root: ElkNode, algorithm: string | null, variant: string | null): void {
  if (variant !== null) {
    applyVariant(root, variant);
  }
  if (algorithm !== null) {
    retarget(root, algorithm);
  }
}
