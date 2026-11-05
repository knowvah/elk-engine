// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.layered.test InLayerConstraintProcessorTest: random in-layer constraints
 * (`@Configurator configureRandomInLayerConstraints`, `java.util.Random` seeded 0) must leave every layer ordered TOP,
 * NONE, BOTTOM after the InLayerConstraintProcessor. The Java has one `@TestAfterProcessor` method over
 * `realworld/ptolemy/**` (`*.elkg`, read here through the `.json` twins), 550 models, so 550 oracle runs.
 *
 * Scope: the vendored ptolemy models (13 minus the self-loop model of N1, 12 cases); with `ELK_MODELS_DIR` and
 * `PIPELINE_SUITES_FULL=1` the whole corpus (self-loop models then need mission 7g, SELF_LOOP_PREPROCESSOR).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/intermediate/InLayerConstraintProcessorTest.java
 */
// Entry through the enum, not a processor class (E1).
import './IntermediateProcessorStrategy.js';
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { PTOLEMY_GRAPHS } from '../../../../test/helpers/ptolemy-suite-sources.js';
import { Random } from '../../../java/util/Random.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { InLayerConstraintProcessor } from './InLayerConstraintProcessor.js';

/** Fixed seed to keep tests reproducible. */
const RANDOM_SEED = 0;
const TOP_BELOW = 0.2;
const NONE_BELOW = 0.8;

function configureRandomInLayerConstraints(graph: ElkNode): void {
  const nodeQueue: ElkNode[] = [...graph.getChildren()];
  const rand = new Random(RANDOM_SEED);

  while (nodeQueue.length > 0) {
    const node = nodeQueue.shift()!;
    nodeQueue.push(...node.getChildren());

    const r = rand.nextDouble();
    if (r < TOP_BELOW) {
      node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.TOP);
    } else if (r < NONE_BELOW) {
      node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.NONE);
    } else {
      node.setProperty(InternalProperties.IN_LAYER_CONSTRAINT, InLayerConstraint.BOTTOM);
    }
  }
}

defineLayoutTest({
  name: 'InLayerConstraintProcessorTest',
  algorithm: LayeredOptions.ALGORITHM_ID,
  defaultConfiguration: true,
  graphs: PTOLEMY_GRAPHS,
  configurators: { configureRandomInLayerConstraints },
  afterProcessor: [
    {
      name: 'testValidNodeOrder',
      cls: InLayerConstraintProcessor,
      check: (lGraph: LGraph): void => {
        for (const layer of lGraph) {
          let lastConstraint: InLayerConstraint | null = null;
          for (const node of layer as Iterable<LNode>) {
            const currentConstraint = node.getProperty(InternalProperties.IN_LAYER_CONSTRAINT);

            if (lastConstraint !== null && currentConstraint !== lastConstraint) {
              // if the value changes check valid transitions
              const error = `Invalid constraint transition: ${lastConstraint.name()} -> ${currentConstraint.name()}`;

              if (currentConstraint === InLayerConstraint.NONE) {
                expect(lastConstraint === InLayerConstraint.TOP, error).toBe(true);
              } else if (currentConstraint === InLayerConstraint.BOTTOM) {
                expect(
                  lastConstraint === InLayerConstraint.TOP || lastConstraint === InLayerConstraint.NONE,
                  error,
                ).toBe(true);
              }
              // InLayerConstraintProcessorTest.java:113 repeats the assignment at :116 below; collapsed (F16, CodeQL)
            }

            lastConstraint = currentConstraint;
          }
        }
      },
    },
  ],
});
