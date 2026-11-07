// SPDX-License-Identifier: EPL-2.0
// Rows pinned to the throw of a later mission's stage (decisions FX6, FX7, user, mission 7f). The recorders check only a row's
// prefix for ported members, while the real driver builds the whole plan first (`AlgorithmAssembler.build`), so these rows throw at
// plan build until the named mission wires the arm. The refs stay frozen: 7f2 deleted its entries (G9) and 7g deletes its
// own; the rows then replay their recorded expectations.

const SELF_LOOP_PREPROCESSOR_7G = 'SelfLoopPreProcessor is ported in mission 7g';

/** The rows of `layered-pipeline.json` (FX7). */
export const PINNED_PIPELINE_ROWS: ReadonlyMap<string, string> = new Map<string, string>([
  ['models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN', SELF_LOOP_PREPROCESSOR_7G],
]);

/** The rows of `layered-phases.json` (FX6). */
export const PINNED_PHASE_ROWS: ReadonlyMap<string, string> = new Map<string, string>([]);
