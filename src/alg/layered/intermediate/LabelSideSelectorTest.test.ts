// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test LabelSideSelectorTest: after the LabelSideSelector every label of every outgoing
 * edge has a label side other than UNKNOWN. The Java has one `@TestAfterProcessor` method and one `@Configurator` (every
 * edge label of the graph is given a placement, HEAD / CENTER / TAIL, drawn from `new Random(0)`) over
 * `realworld/ptolemy/**` (`*.elkg`, read here through the `.json` twins) and `tickets/layered/599_unimportantPortIndex.elkt`
 * with `@DefaultConfiguration()`, 551 oracle runs.
 *
 * The Java configurator polls a node queue it only ever seeds with the graph (children are never added), so it configures
 * the edges contained in the root node only; that is kept as written.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1, 12) plus the 599 ticket, 13 cases (journaled).
 * The 599 ticket is vendored under `labels/` (mission 7f2, T1); under `PIPELINE_SUITES_FULL=1` the root is the models
 * repository and the second path is the live one.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/LabelSideSelectorTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { describe, expect, it } from 'vitest';
import {
  buildLayoutTests,
  defineLayoutTest,
  type GraphSource,
  type LayoutTestSpec,
  type ProcessorCheck,
} from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import { Random } from '../../../java/util/Random.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LabelSideSelector } from './LabelSideSelector.js';

/** The ticket model: vendored under `labels/`, in the models repository at the Java path. */
const TICKET_GRAPHS: readonly GraphSource[] = [
  { path: 'labels/tickets/layered/599_unimportantPortIndex.elkt' },
  { path: 'tickets/layered/599_unimportantPortIndex.elkt' },
];

/** Fixed random seed to keep tests reproducible. */
const RANDOM_SEED = 0;
const HEAD_BELOW = 0.3;
const CENTER_BELOW = 0.7;

function configurator(graph: ElkNode): void {
  const nodeQueue: ElkNode[] = [];
  nodeQueue.push(graph);

  const rand = new Random(RANDOM_SEED);

  while (nodeQueue.length > 0) {
    const node = nodeQueue.shift()!;

    for (const edge of node.getContainedEdges()) {
      if (edge.getLabels().isEmpty()) {
        ElkGraphUtil.createLabelWithText(edge.getIdentifier(), edge);
      }

      const label = edge.getLabels().get(0);

      const r = rand.nextDouble();
      if (r < HEAD_BELOW) {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
      } else if (r < CENTER_BELOW) {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.CENTER);
      } else {
        label.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
      }
    }
  }
}

/** All labels on ports and edges have an assigned {@link LabelSide}. */
function testRemovedNodes(lGraph: LGraph): void {
  lGraph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .flatMap((node) => [...node.getOutgoingEdges()])
    .flatMap((edge) => edge.getLabels())
    .forEach((label) => {
      expect(label.getProperty(InternalProperties.LABEL_SIDE) !== LabelSide.UNKNOWN).toBe(true);
    });
}

const SPEC: LayoutTestSpec = {
  name: 'LabelSideSelectorTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: [...PTOLEMY_GRAPHS, ...TICKET_GRAPHS],
  configurators: { configurator },
  afterProcessor: [{ name: 'testRemovedNodes', cls: LabelSideSelector, check: testRemovedNodes }],
};

defineLayoutTest(SPEC);

describe('LabelSideSelectorTest (non-vacuity)', () => {
  it('(non-vacuity) the selector ran and the checked labels are sized and assigned a side', () => {
    const seen = { runs: 0, labels: 0, sized: 0, placed: 0 };
    const counting: ProcessorCheck = {
      cls: LabelSideSelector,
      check: (lGraph) => {
        seen.runs += 1;
        for (const layer of lGraph) {
          for (const edge of layer.getNodes().flatMap((node) => [...node.getOutgoingEdges()])) {
            for (const label of edge.getLabels()) {
              seen.labels += 1;
              seen.sized += label.getSize().x > 0 && label.getSize().y > 0 ? 1 : 0;
              seen.placed += label.hasProperty(InternalProperties.LABEL_SIDE) ? 1 : 0;
            }
          }
        }
      },
    };
    const cases = buildLayoutTests({ ...SPEC, afterProcessor: [counting] });
    for (const testCase of cases) {
      testCase.run();
    }
    expect(cases.length).toBeGreaterThan(0);
    expect(seen.runs).toBeGreaterThanOrEqual(cases.length);
    expect(seen.labels).toBeGreaterThan(0);
    expect(seen.sized).toBe(seen.labels);
    expect(seen.placed).toBe(seen.labels);
  });
});
