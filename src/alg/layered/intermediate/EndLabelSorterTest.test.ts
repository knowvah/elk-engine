// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test EndLabelSorterTest: after the EndLabelSorter the labels of every end-label cell
 * and of every label dummy are in lexicographic order of their texts (the test graphs name their labels so that the expected
 * order is the lexicographical one). The Java has one `@TestAfterProcessor` method over `tests/layered/labels_ordering/**`
 * with `@DefaultConfiguration()`, 4 oracle runs; the four models are vendored under `labels/` (mission 7f2, T1).
 *
 * `String.compareTo` compares UTF-16 code units, as the `<` of two JavaScript strings does.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/EndLabelSorterTest.java
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
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { EndLabelSorter } from './EndLabelSorter.js';

/** `String.compareTo(...) <= 0`. */
function isNotAfter(prev: string, curr: string): boolean {
  return prev <= curr;
}

function failIfUnsorted(strings: readonly string[]): void {
  if (strings.length === 0) {
    return;
  }

  let prev = strings[0]!;
  for (const curr of strings.slice(1)) {
    expect(isNotAfter(prev, curr), `[${strings.join(', ')}]`).toBe(true);
    prev = curr;
  }
}

function testNode(node: LNode): void {
  switch (node.getType()) {
    case NodeType.NORMAL:
      // Build a list of label strings that we can check
      if (node.hasProperty(InternalProperties.END_LABELS)) {
        for (const labelCell of node.getProperty(InternalProperties.END_LABELS).values()) {
          failIfUnsorted(labelCell.getLabels().map((label) => label.getText()));
        }
      }
      break;

    case NodeType.LABEL: {
      const labels = node.getProperty(InternalProperties.REPRESENTED_LABELS);
      expect(labels !== null).toBe(true);

      failIfUnsorted(labels.map((label) => label.getText()));

      break;
    }

    default:
      break;
  }
}

function testCorrectOrder(lGraph: LGraph): void {
  lGraph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .forEach((node) => {
      testNode(node);
    });
}

const SPEC: LayoutTestSpec = {
  name: 'EndLabelSorterTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [
    // vendored under `labels/`; the models repository holds them at the Java path
    { path: 'labels/tests/layered/labels_ordering/**/' },
    { path: 'tests/layered/labels_ordering/**/' },
  ],
  afterProcessor: [{ name: 'testCorrectOrder', cls: EndLabelSorter, check: testCorrectOrder }],
};

defineLayoutTest(SPEC);

describe('EndLabelSorterTest (non-vacuity)', () => {
  it('(non-vacuity) the sorter ran and the sorted lists hold at least two sized labels', () => {
    const seen = { runs: 0, lists: 0, sizedLabels: 0, pairs: 0 };
    const tally = (labels: readonly { getText(): string }[], sized: number): void => {
      seen.lists += 1;
      seen.sizedLabels += sized;
      seen.pairs += Math.max(0, labels.length - 1);
    };
    const counting: ProcessorCheck = {
      cls: EndLabelSorter,
      check: (lGraph) => {
        seen.runs += 1;
        for (const node of lGraph.getLayers().flatMap((layer) => layer.getNodes())) {
          if (node.getType() === NodeType.LABEL) {
            const labels = node.getProperty(InternalProperties.REPRESENTED_LABELS);
            tally(labels, labels.filter((l) => l.getSize().x > 0 && l.getSize().y > 0).length);
          } else if (node.hasProperty(InternalProperties.END_LABELS)) {
            for (const cell of node.getProperty(InternalProperties.END_LABELS).values()) {
              tally(cell.getLabels(), cell.getLabels().length);
            }
          }
        }
      },
    };
    const cases = buildLayoutTests({ ...SPEC, afterProcessor: [counting] });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBe(4);
    expect(seen.runs).toBeGreaterThanOrEqual(cases.length);
    expect(seen.lists).toBeGreaterThan(0);
    expect(seen.pairs).toBeGreaterThan(0);
    expect(seen.sizedLabels).toBeGreaterThan(0);
  });
});
