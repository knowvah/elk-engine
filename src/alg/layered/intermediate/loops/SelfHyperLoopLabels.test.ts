// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { expectSameElements } from '../../../../../test/helpers/junit-asserts.js';
import { SelfLoopTestGraphCreator } from '../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LLabel } from '../../graph/LLabel.js';
import { Alignment, SelfHyperLoopLabels } from './SelfHyperLoopLabels.js';
import { SelfLoopHolder } from './SelfLoopHolder.js';

function labelsOfALoop(): SelfHyperLoopLabels {
  const lNode = SelfLoopTestGraphCreator.basicGraphWithoutSelfLoops().getLayerlessNodes()[1]!;
  SelfLoopTestGraphCreator.ports(lNode, 0, 1, 0, 0);
  SelfLoopTestGraphCreator.edge(lNode.getPorts()[0]!, lNode.getPorts()[1]!).getLabels().push(new LLabel('x'));
  return SelfLoopHolder.install(lNode).getSLHyperLoops()[0]!.getSLLabels()!;
}

describe('SelfHyperLoopLabels', () => {
  it('starts with the labels of its first edge and undetermined side, alignment and reference', () => {
    const labels = labelsOfALoop();
    expect(labels.getLLabels()).toHaveLength(1);
    expect(labels.getSide()).toBeNull();
    expect(labels.getAlignment()).toBeNull();
    expect(labels.getAlignmentReferenceSLPort()).toBeNull();
    expect(labels.id).toBe(0);
  });

  it('addLLabels appends in order', () => {
    const labels = labelsOfALoop();
    const added = [new LLabel('y'), new LLabel('z')];
    labels.addLLabels(added);
    expect(labels.getLLabels()).toHaveLength(3);
    expectSameElements(labels.getLLabels().slice(1), added);
  });

  it('keeps the side, alignment and reference it is given', () => {
    const labels = labelsOfALoop();
    labels.setSide(PortSide.SOUTH);
    labels.setAlignment(Alignment.LEFT);
    expect(labels.getSide()).toBe(PortSide.SOUTH);
    expect(labels.getAlignment()).toBe(Alignment.LEFT);
    labels.setAlignmentReferenceSLPort(null);
    expect(labels.getAlignmentReferenceSLPort()).toBeNull();
  });
});

describe('SelfHyperLoopLabels.Alignment', () => {
  it('lists its constants in declaration order and looks them up by name', () => {
    expect(Alignment.values().map(String)).toEqual(['CENTER', 'LEFT', 'RIGHT', 'TOP']);
    expect(Alignment.valueOf('TOP')).toBe(Alignment.TOP);
    expect(Alignment.TOP.ordinal()).toBe(3);
    expect(Alignment.TOP.name()).toBe('TOP');
    expect(Alignment.RIGHT.compareTo(Alignment.CENTER)).toBeGreaterThan(0);
    expect(() => Alignment.valueOf('MIDDLE')).toThrow(IllegalArgumentException);
  });
});
