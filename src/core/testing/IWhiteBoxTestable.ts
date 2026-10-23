// SPDX-License-Identifier: EPL-2.0
import type { TestController } from './TestController.js';

/**
 * Interface for layout providers that support white box tests. The layout engine installs the test controller
 * before invoking layout.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/testing/IWhiteBoxTestable.java
 */
export interface IWhiteBoxTestable {
  /**
   * Sets the {@link TestController} that controls a white box test. The layout algorithm needs to notify the test
   * controller of interesting events during the layout process.
   *
   * @param controller the test controller to install
   */
  setTestController(controller: TestController): void;
}
