// SPDX-License-Identifier: EPL-2.0
// H13 (mission 7h): two models lay a child out with `elk.stress`, which has no TypeScript port yet (roadmap 8b, issue #58).
// `Issue665Test` and `Issue700Test` keep the Java's providers and drop exactly these inputs through `STRESS_PENDING`;
// nothing else is filtered. Remove this file and its uses when `elk.stress` lands.
import path from 'node:path';
import { inputsRoot, listGraphFiles, type FileGraphSource } from './layout-test-sources.js';

/** The ruling issue of H13. */
export const STRESS_PENDING_ISSUE = 'https://github.com/knowvah/elk-engine/issues/58';

/** Models (paths as in the ELK models repository) that need `elk.stress`; see {@link STRESS_PENDING_ISSUE}. */
export const STRESS_PENDING: readonly string[] = [
  'tickets/layered/665_includeChildrenDoesntStop.elkt',
  'examples/hierarchy/hierarchicalLayoutMixing.elkt',
];

/** `Issue665Test.testGraphs`: `ModelResourcePath("tickets/layered/**").withFilter(FileNameFilter("665.+\\.elkt"))`. */
export const ISSUE665_GRAPHS: readonly FileGraphSource[] = [{ path: 'tickets/layered/**', filter: /665.+\.elkt/ }];

/** `Issue700Test.testGraphs`. */
export const ISSUE700_GRAPHS: readonly FileGraphSource[] = [
  { path: 'tickets/layered/**', filter: /665.+\.elkt/ },
  { path: 'tickets/layered/**', filter: /700.+\.elkt/ },
  { path: 'examples/hierarchy/**' },
];

const VENDORED_PREFIX = 'compound/';

/** The twin of a models-repository source under the vendored inputs (mission 7h, T1), same filter. */
export function vendored(source: FileGraphSource): FileGraphSource {
  return { ...source, path: `${VENDORED_PREFIX}${source.path}` };
}

function isPending(root: string, file: string): boolean {
  const relative = path.relative(root, file).split(path.sep).join('/');
  // the vendored inputs carry a leading `compound/` that the models repository does not
  return STRESS_PENDING.some((pending) => relative === pending || relative.endsWith(`/${pending}`));
}

/**
 * Resolves the sources against the inputs root and returns the remaining files, one single-file source each (the runner
 * titles a case by the file path, so the case titles stay those of the unfiltered suite).
 */
export function withoutStressPending(
  sources: readonly FileGraphSource[],
  root: string = inputsRoot(),
): FileGraphSource[] {
  return sources
    .flatMap((source) => listGraphFiles(source, root))
    .filter((file) => !isPending(root, file))
    .map((file) => ({ path: path.relative(root, file).split(path.sep).join('/') }));
}
