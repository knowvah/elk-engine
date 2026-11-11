// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { NodeYPlacer } from './p1yplacement/NodeYPlacer.js';
import { NodeYPlacerStrategy } from './p1yplacement/NodeYPlacerStrategy.js';
import { AbsoluteXPlacer } from './p3absolute/AbsoluteXPlacer.js';
import { AbsoluteXPlacerStrategy } from './p3absolute/AbsoluteXPlacerStrategy.js';
import { BendEdgeRouter } from './p4edgerouting/BendEdgeRouter.js';
import { EdgerouterStrategy } from './p4edgerouting/EdgerouterStrategy.js';
import { StraightEdgeRouter } from './p4edgerouting/StraightEdgeRouter.js';

const PKG = 'org.eclipse.elk.alg.vertiflex';

describe('vertiflex phase strategies', () => {
  it('NodeYPlacerStrategy: one constant, creates a NodeYPlacer per call', () => {
    const s = NodeYPlacerStrategy.SIMPLE_Y_PLACING;
    expect(NodeYPlacerStrategy.values()).toEqual([s]);
    expect(NodeYPlacerStrategy.valueOf('SIMPLE_Y_PLACING')).toBe(s);
    expect([s.name(), s.toString(), s.ordinal(), s.compareTo(s)]).toEqual([
      'SIMPLE_Y_PLACING',
      'SIMPLE_Y_PLACING',
      0,
      0,
    ]);
    expect(() => NodeYPlacerStrategy.valueOf('X')).toThrow(
      `No enum constant ${PKG}.p1yplacement.NodeYPlacerStrategy.X`,
    );
    expect(s.create()).toBeInstanceOf(NodeYPlacer);
    expect(s.create()).not.toBe(s.create());
    const stranger = { toString: () => 'OTHER' } as NodeYPlacerStrategy;
    expect(() => s.create.call(stranger)).toThrow(IllegalArgumentException);
    expect(() => s.create.call(stranger)).toThrow('No implementation is available for the node placer OTHER');
  });

  it('AbsoluteXPlacerStrategy: one constant, creates an AbsoluteXPlacer per call', () => {
    const s = AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING;
    expect(AbsoluteXPlacerStrategy.values()).toEqual([s]);
    expect(AbsoluteXPlacerStrategy.valueOf('ABSOLUTE_XPLACING')).toBe(s);
    expect([s.name(), s.toString(), s.ordinal(), s.compareTo(s)]).toEqual([
      'ABSOLUTE_XPLACING',
      'ABSOLUTE_XPLACING',
      0,
      0,
    ]);
    expect(() => AbsoluteXPlacerStrategy.valueOf('X')).toThrow(
      `No enum constant ${PKG}.p3absolute.AbsoluteXPlacerStrategy.X`,
    );
    expect(s.create()).toBeInstanceOf(AbsoluteXPlacer);
    const stranger = { toString: () => 'OTHER' } as AbsoluteXPlacerStrategy;
    expect(() => s.create.call(stranger)).toThrow('No implementation is available for the node placer OTHER');
  });

  it('EdgerouterStrategy: two constants in order, each creating its router', () => {
    const { DIRECT_ROUTING, BEND_ROUTING } = EdgerouterStrategy;
    expect(EdgerouterStrategy.values()).toEqual([DIRECT_ROUTING, BEND_ROUTING]);
    expect(EdgerouterStrategy.valueOf('BEND_ROUTING')).toBe(BEND_ROUTING);
    expect([BEND_ROUTING.name(), BEND_ROUTING.toString(), BEND_ROUTING.ordinal()]).toEqual([
      'BEND_ROUTING',
      'BEND_ROUTING',
      1,
    ]);
    expect(DIRECT_ROUTING.compareTo(BEND_ROUTING)).toBe(-1);
    expect(() => EdgerouterStrategy.valueOf('X')).toThrow(`No enum constant ${PKG}.p4edgerouting.EdgerouterStrategy.X`);
    expect(DIRECT_ROUTING.create()).toBeInstanceOf(StraightEdgeRouter);
    expect(BEND_ROUTING.create()).toBeInstanceOf(BendEdgeRouter);
    const stranger = { toString: () => 'OTHER' } as EdgerouterStrategy;
    expect(() => DIRECT_ROUTING.create.call(stranger)).toThrow(
      'No implementation is available for the edge router OTHER',
    );
  });

  it('the four phases need no further processors and finish their monitor for a childless graph', () => {
    const graph = ElkGraphUtil.createGraph();
    const phases = [new NodeYPlacer(), new AbsoluteXPlacer(), new StraightEdgeRouter(), new BendEdgeRouter()];
    const names = phases.map((phase) => {
      const monitor = new BasicProgressMonitor();
      phase.process(graph, monitor);
      expect(phase.getLayoutProcessorConfiguration(graph)).toBeNull();
      return [monitor.getTaskName(), monitor.isRunning()];
    });
    expect(names).toEqual([
      ['YPlacer', false],
      ['AbsolutePlacer', false], // upstream text "AbsolutPlacer" (AbsoluteXPlacer.java:32), corrected
      ['StraightEdgeRouter', false],
      ['BendEdgeRouter', false],
    ]);
  });
});
