// SPDX-License-Identifier: EPL-2.0
// The TS side of the compound sweep (mission 7h, T13, H5). ORIGIN: test/helpers/layered-loops-sweep.ts (7g, T19), whose NaN-canonical hash
// it reuses. Three parts of hierarchical cases laid out through `RecursiveGraphLayoutEngine` and dumped in the oracle's canonical form
// (`elkDump` of `LayeredCompoundVectors.java`, section "--sweep / --dump"):
//   a  the label sweep's models that set INCLUDE_CHILDREN (`.elkt`) x default + 4 directions
//   b  every `.elkt` / `.json` of tests/layered, tickets/layered, examples that sets INCLUDE_CHILDREN x default + 4 directions
//   c  every realworld/ptolemy/hierarchical `.json` with INCLUDE_CHILDREN set on the root x 4 directions
// The variant is `default` or a `Direction` set on the root. The model path carries its extension.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { replayCase as replayLabels, VARIANT_DEFAULT } from './layered-labels-sweep.js';
import { loadInput } from './layered-phase-replay-rows.js';
import { elkDump } from './layered-pipeline-sweep.js';

export {
  isOk,
  isThrows,
  loopsHash as compoundHash,
  PART_A,
  PART_B,
  PART_C,
  readSweep,
  STATUS_TIMEOUT,
  type SweepLine,
} from './layered-loops-sweep.js';

const ELKT_EXTENSION = '.elkt';
const PART_C_ID = 'c';

/** The fields every replayable line (ok or throws) of the compound sweep carries. */
export interface CompoundSweepCase {
  readonly id: string;
  readonly part: 'a' | 'b' | 'c';
  /** The path under the models directory, with its extension. */
  readonly model: string;
  /** `default`, or the `Direction` name set on the root. */
  readonly variant: string;
}
export interface CompoundSweepOk extends CompoundSweepCase {
  readonly sha256: string;
}
export interface CompoundSweepThrows extends CompoundSweepCase {
  readonly status: 'throws';
  readonly class: string;
  readonly message: string;
  /** The first ELK frame of the oracle's exception, `File.java:line`. */
  readonly frame?: string;
}

/** An `.elkt` case goes through the labels sweep's replay (same loader, direction on the root, recursive engine). */
function replayJson(line: CompoundSweepCase, modelsDir: string): { [key: string]: unknown } {
  const root = loadInput({ elk: readFileSync(path.join(modelsDir, line.model), 'utf8') });
  if (line.part === PART_C_ID) {
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
  }
  if (line.variant !== VARIANT_DEFAULT) {
    root.setProperty(CoreOptions.DIRECTION, Direction.valueOf(line.variant));
  }
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return elkDump(root);
}

/** The canonical tree of a case replayed through the port. */
export function replayCase(line: CompoundSweepCase, modelsDir: string): { [key: string]: unknown } {
  if (line.model.endsWith(ELKT_EXTENSION)) {
    return replayLabels(
      {
        id: line.id,
        kind: 'model',
        model: line.model.slice(0, -ELKT_EXTENSION.length),
        target: null,
        variant: line.variant,
      },
      modelsDir,
    );
  }
  return replayJson(line, modelsDir);
}
