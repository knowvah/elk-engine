// SPDX-License-Identifier: EPL-2.0
// @staged 7f
import type { TestController } from '../../core/testing/TestController.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { ElkLayeredTestExecutionState } from './ElkLayeredTestExecutionState.js';
import type { LGraph } from './graph/LGraph.js';

const PORTED_IN_7F = 'ElkLayered is ported in mission 7f';

/**
 * Staged class (L1, L2): mission 7a ports only what {@link LayeredLayoutProvider} references (the test controller
 * slot; the nested `TestExecutionState` is `ElkLayeredTestExecutionState`, M15); every method that would run layout throws until mission 7f ports the algorithm driver.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/ElkLayered.java
 */
export class ElkLayered {
  /** Test controller for a white box test. */
  private testController: TestController | null = null;

  doLayout(_lgraph: LGraph, _monitor: IElkProgressMonitor): never {
    throw new UnsupportedOperationException(PORTED_IN_7F);
  }

  doCompoundLayout(_lgraph: LGraph, _monitor: IElkProgressMonitor): never {
    throw new UnsupportedOperationException(PORTED_IN_7F);
  }

  prepareLayoutTest(_lgraph: LGraph): ElkLayeredTestExecutionState {
    throw new UnsupportedOperationException(PORTED_IN_7F);
  }

  /**
   * Installs the given test controller to be notified of layout events.
   *
   * @param testController the test controller to be installed. May be `null`.
   */
  setTestController(testController: TestController | null): void {
    this.testController = testController;
  }
}
