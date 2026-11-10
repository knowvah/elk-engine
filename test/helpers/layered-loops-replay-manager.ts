// SPDX-License-Identifier: EPL-2.0
// The label manager of the loops recorder (mission 7g, T20). The `labelManager shrink-width` step of a loops row sets a
// `LayeredLoopsVectors$ShrinkWidthManager` on the root before importGraph; the dump encodes that opaque option value by its
// Java binary name (`<name>@<identity hash>`), so the twin must carry the loops recorder's name, not 7f2's
// (`LayeredLabelsVectors$ShrinkWidthManager` of layered-labels-replay-ops.ts). The behaviour is the same (a label wider than
// the target becomes `target x height`, any other is not shortened); this module installs its own twin and hands the landed
// labels interpreter a row without the step.
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILabelManager } from '../../src/core/labels/ILabelManager.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { KVector } from '../../src/core/math/KVector.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import {
  LABEL_MANAGER_OP,
  LABEL_MANAGER_SHRINK_WIDTH,
  registerLabelManagementOptions,
} from './layered-labels-replay-ops.js';
import type { PhaseStep } from './layered-phase-replay-rows.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';

/** The identity hash of every object under the oracle's `-XX:hashCode=2`. */
const ORACLE_IDENTITY_HASH = 1;

// eslint-disable-next-line @typescript-eslint/naming-convention
class LayeredLoopsVectors$ShrinkWidthManager implements ILabelManager {
  toString(): string {
    return `${LayeredLoopsVectors$ShrinkWidthManager.name}@${ORACLE_IDENTITY_HASH}`;
  }

  manageLabelSize(label: unknown, targetWidth: number): KVector | null {
    const elkLabel = label as ElkLabel;
    return elkLabel.getWidth() > targetWidth ? new KVector(targetWidth, elkLabel.getHeight()) : null;
  }
}

function rootOf(node: ElkNode): ElkNode {
  let root = node;
  for (let parent = root.getParent(); parent !== null; parent = root.getParent()) {
    root = parent;
  }
  return root;
}

const isShrinkStep = (step: PhaseStep | undefined): boolean =>
  step !== undefined && step[0] === LABEL_MANAGER_OP && step[1] === LABEL_MANAGER_SHRINK_WIDTH;

/**
 * Runs `body` with a row whose leading `labelManager shrink-width` step is replaced by the loops twin installed on the root
 * immediately before the import (the transformer is patched for the call only). Any other row is passed through unchanged.
 */
export function withLoopsLabelManager<T>(row: PipelineStopRow, body: (row: PipelineStopRow) => T): T {
  if (row.steps === null || !isShrinkStep(row.steps[0])) {
    return body(row);
  }
  registerLabelManagementOptions();
  const original = ElkGraphTransformer.prototype.importGraph;
  ElkGraphTransformer.prototype.importGraph = function (this: ElkGraphTransformer, graph: ElkNode): LGraph {
    rootOf(graph).setProperty(LabelManagementOptions.LABEL_MANAGER, new LayeredLoopsVectors$ShrinkWidthManager());
    return original.call(this, graph);
  };
  try {
    return body({ ...row, steps: row.steps.slice(1) });
  } finally {
    ElkGraphTransformer.prototype.importGraph = original;
  }
}
