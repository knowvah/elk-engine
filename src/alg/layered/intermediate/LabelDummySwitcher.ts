// SPDX-License-Identifier: EPL-2.0
// @staged 7f
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';

/**
 * Staged class (L1): mission 7a references only `INCLUDE_LABEL` (read by `ElkGraphLayoutTransferrer`); the processor
 * itself, its configuration and every private helper are ported in mission 7f. `process` throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java
 */
export class LabelDummySwitcher {
  /** A property to communicate with the analyses that can be run on a graph. */
  static readonly INCLUDE_LABEL: IProperty<boolean> = new Property<boolean>(
    'edgelabelcenterednessanalysis.includelabel',
    false,
  );

  process(_layeredGraph: LGraph, _monitor: IElkProgressMonitor): never {
    throw new UnsupportedOperationException('LabelDummySwitcher.process is ported in mission 7f');
  }
}
