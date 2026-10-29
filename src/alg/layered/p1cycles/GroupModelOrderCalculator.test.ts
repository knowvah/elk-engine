// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GroupModelOrderCalculator } from './GroupModelOrderCalculator.js';

const OFFSET = 10;

function node(constraint: LayerConstraint): LNode {
  const n = addNode(new LGraph());
  n.setProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT, constraint);
  n.setProperty(InternalProperties.MODEL_ORDER, 0);
  return n;
}

// Numeric results are proven through the oracle rows of the subclasses and owners; only structure is asserted here.
describe('GroupModelOrderCalculator.resetInternalCounters', () => {
  it('makes a used calculator answer like a new one, and each separate node advances the counter', () => {
    const calculator = new GroupModelOrderCalculator();
    const first = calculator.computeConstraintModelOrder(node(LayerConstraint.FIRST_SEPARATE), OFFSET);
    const second = calculator.computeConstraintModelOrder(node(LayerConstraint.FIRST_SEPARATE), OFFSET);
    expect(second).not.toBe(first);
    calculator.resetInternalCounters();
    expect(calculator.computeConstraintModelOrder(node(LayerConstraint.FIRST_SEPARATE), OFFSET)).toBe(first);
    const lastFirst = calculator.computeConstraintModelOrder(node(LayerConstraint.LAST_SEPARATE), OFFSET);
    calculator.resetInternalCounters();
    expect(calculator.computeConstraintModelOrder(node(LayerConstraint.LAST_SEPARATE), OFFSET)).toBe(lastFirst);
  });
});
