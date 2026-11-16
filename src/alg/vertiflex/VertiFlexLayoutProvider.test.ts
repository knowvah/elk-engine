// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { registerVertiFlex } from '../../../test/helpers/vertiflex-replay-dump.js';
import { EdgeRoutingStrategy } from './EdgeRoutingStrategy.js';
import { VertiFlexLayoutProvider } from './VertiFlexLayoutProvider.js';
import { VertiFlexOptions } from './options/VertiFlexOptions.js';
import { NodeYPlacer } from './p1yplacement/NodeYPlacer.js';
import { RelativeXPlacer } from './p2relative/RelativeXPlacer.js';
import { AbsoluteXPlacer } from './p3absolute/AbsoluteXPlacer.js';
import { BendEdgeRouter } from './p4edgerouting/BendEdgeRouter.js';
import { StraightEdgeRouter } from './p4edgerouting/StraightEdgeRouter.js';

const processorClasses = (strategy?: EdgeRoutingStrategy): unknown[] => {
  registerVertiFlex();
  const graph = ElkGraphUtil.createGraph();
  if (strategy !== undefined) {
    graph.setProperty(VertiFlexOptions.LAYOUT_STRATEGY, strategy);
  }
  return new VertiFlexLayoutProvider().assembleAlgorithm(graph).map((p) => p.constructor);
};

describe('VertiFlexLayoutProvider (VertiFlexLayoutProvider.java)', () => {
  it('is a layout provider', () => {
    expect(new VertiFlexLayoutProvider()).toBeInstanceOf(AbstractLayoutProvider);
  });

  it('assembles the four phases with the straight router by default (Java :101-129)', () => {
    expect(processorClasses()).toEqual([NodeYPlacer, RelativeXPlacer, AbsoluteXPlacer, StraightEdgeRouter]);
    expect(processorClasses(EdgeRoutingStrategy.STRAIGHT)).toEqual([
      NodeYPlacer,
      RelativeXPlacer,
      AbsoluteXPlacer,
      StraightEdgeRouter,
    ]);
  });

  it('assembles the bend router for BEND (Java :118-120)', () => {
    expect(processorClasses(EdgeRoutingStrategy.BEND)).toEqual([
      NodeYPlacer,
      RelativeXPlacer,
      AbsoluteXPlacer,
      BendEdgeRouter,
    ]);
  });

  it('rejects a graph without a root called directly (Java :63-66)', () => {
    registerVertiFlex();
    const graph = ElkGraphUtil.createGraph();
    expect(() => new VertiFlexLayoutProvider().layout(graph, new BasicProgressMonitor())).toThrow(
      UnsupportedConfigurationException,
    );
    expect(() => new VertiFlexLayoutProvider().layout(graph, new BasicProgressMonitor())).toThrow(
      'The given graph is not a tree!',
    );
  });
});
