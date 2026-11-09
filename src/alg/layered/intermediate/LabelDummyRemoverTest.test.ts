// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test LabelDummyRemoverTest: after the LabelDummyRemover no label dummy node is left
 * in any layer. The Java has one `@TestAfterProcessor` method over `realworld/ptolemy/**` (`*.elkg`, read here through the
 * `.json` twins) with `@DefaultConfiguration(edgeLabels = true)`, 550 oracle runs.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1, 12 cases; journaled). With `ELK_MODELS_DIR` and
 * `PIPELINE_SUITES_FULL=1` the whole corpus (self-loop models then need mission 7g).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LabelDummyRemoverTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type LayoutTestSpec,
  type ProcessorCheck,
} from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';

function testRemovedNodes(lGraph: LGraph): void {
  for (const layer of lGraph) {
    for (const node of layer.getNodes()) {
      expect(node.getType() !== NodeType.LABEL).toBe(true);
    }
  }
}

const SPEC: LayoutTestSpec = {
  name: 'LabelDummyRemoverTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: { edgeLabels: true },
  graphs: PTOLEMY_GRAPHS,
  afterProcessor: [{ name: 'testRemovedNodes', cls: LabelDummyRemover, check: testRemovedNodes }],
};

defineLayoutTest(SPEC);

describe('LabelDummyRemoverTest (non-vacuity)', () => {
  it('(non-vacuity) the remover ran, and label dummies with sized labels existed before it', () => {
    const seen = { removerRuns: 0, labelDummies: 0, sizedLabels: 0 };
    const beforeRemover: ProcessorCheck = {
      cls: LabelDummyRemover,
      check: (lGraph) => {
        seen.removerRuns += 1;
        for (const layer of lGraph) {
          for (const node of layer.getNodes().filter((n) => n.getType() === NodeType.LABEL)) {
            seen.labelDummies += 1;
            for (const label of node.getProperty(InternalProperties.REPRESENTED_LABELS)) {
              seen.sizedLabels += label.getSize().x > 0 && label.getSize().y > 0 ? 1 : 0;
            }
          }
        }
      },
    };
    const cases = buildLayoutTests({ ...SPEC, afterProcessor: [], beforeProcessor: [beforeRemover] });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBeGreaterThan(0);
    expect(seen.removerRuns).toBeGreaterThanOrEqual(cases.length);
    expect(seen.labelDummies).toBeGreaterThan(0);
    expect(seen.sizedLabels).toBe(seen.labelDummies);
  });
});
