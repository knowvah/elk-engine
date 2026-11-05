// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue548Test: the NPE in `EndLabelSorter` with inside self loops. The Java has one test whose body is empty
 * (`testLargeEnoughNodes`); it passes when layout raised no exception.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue548Test.java
 */
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

defineLayoutTest({
  name: 'Issue548Test',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [{ path: 'tickets/layered/548_NPEWithInsideSelfLoops.elkt' }],
  afterLayout: {
    testLargeEnoughNodes: (): void => {
      // We don't actually test anything. This test is only supposed to check whether an NPE occurs in
      // EndLabelSorter.
    },
  },
});
