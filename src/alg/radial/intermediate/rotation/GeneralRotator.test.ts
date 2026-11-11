// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { buildTree, nodeOf } from '../../../../../test/helpers/radial-replay-graphs.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { rowsWithStepPair, type RadialDump, type RadialStop } from '../../../../../test/helpers/radial-replay-rows.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { InternalProperties } from '../../InternalProperties.js';
import { GeneralRotator } from './GeneralRotator.js';

const pairs = rowsWithStepPair('GeneralRotator');

describe('GeneralRotator', () => {
  it('has recorded stop pairs around GeneralRotator (the rotate rows of the ref)', () => {
    expect(pairs.length).toBe(22);
    expect(pairs.some(([row]) => layoutOptionsOf(row)['rotation.computeAdditionalWedgeSpace'] === 'true')).toBe(true);
    expect(pairs.some(([row]) => layoutOptionsOf(row)['rotation.targetAngle'] !== undefined)).toBe(true);
  });

  // acceptance: given the stop before GeneralRotator, the TS rotator produces the recorded stop after it (ids and order exact,
  // numbers within 1e-6)
  it.each(pairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'turns the recorded before state into the recorded after state: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      new GeneralRotator().process(graph, new BasicProgressMonitor());
      expect(compareStop(pair.after, dumpRadial(graph, pair.after.step))).toEqual([]);
    },
  );

  it('actually moves nodes in the rows where the recorded step changed the state', () => {
    // `step` differs between two stops by definition: compare the sections only
    const sections = (stop: RadialStop): RadialDump => ({ ...stop, step: undefined }) as unknown as RadialDump;
    const moved = pairs.filter(([, pair]) => compareStop(sections(pair.before), sections(pair.after)).length > 0);
    expect(moved.length).toBeGreaterThan(0);
    for (const [row, pair] of moved) {
      const before = buildStopState(row, pair.beforeIndex);
      expect(compareStop(sections(pair.after), dumpRadial(before)).length).toBeGreaterThan(0);
    }
  });

  // GeneralRotator.java:30-45: begin("General 'Rotator", 1) (the stray quote is corrected in the port), logGraph "Before" and "After" only when logging is enabled
  it('begins the task, logs the graph before and after when logging is enabled, and does not call done', () => {
    const tree = buildTree({ id: 'r', width: 10, height: 10, children: [{ id: 'a', width: 10, height: 10 }] });
    nodeOf(tree, 'a').setLocation(20, 0);
    const root = nodeOf(tree, 'r');
    tree.graph.setProperty(InternalProperties.ROOT_NODE, root);
    const monitor = {
      begin: vi.fn(() => true),
      done: vi.fn(),
      isLoggingEnabled: vi.fn(() => true),
      logGraph: vi.fn(),
    };
    new GeneralRotator().process(tree.graph, monitor as never);
    expect(monitor.begin).toHaveBeenCalledWith('General Rotator', 1);
    expect(monitor.logGraph.mock.calls.map((call) => (call as unknown[])[1])).toEqual(['Before', 'After']);
    expect(monitor.logGraph.mock.calls.every((call) => (call as unknown[])[0] === tree.graph)).toBe(true);
    expect(monitor.done).not.toHaveBeenCalled();
  });

  it('does not log when logging is disabled', () => {
    const tree = buildTree({ id: 'r' });
    const monitor = { begin: vi.fn(() => true), isLoggingEnabled: vi.fn(() => false), logGraph: vi.fn() };
    new GeneralRotator().process(tree.graph, monitor as never);
    expect(monitor.logGraph).not.toHaveBeenCalled();
  });

  it('rotates by the ROTATION_TARGET_ANGLE option of the graph', () => {
    const tree = buildTree({ id: 'r', width: 2, height: 2, children: [{ id: 'a', width: 2, height: 2 }] });
    nodeOf(tree, 'a').setLocation(9, -1); // center (10, 0)
    tree.graph.setProperty(RadialOptions.ROTATION_TARGET_ANGLE, Math.PI / 2);
    new GeneralRotator().process(tree.graph, new BasicProgressMonitor());
    const a = nodeOf(tree, 'a');
    // the center (10, 0) turns to (0, 10) (AngleRotation.java:75-80)
    expect(a.getX() + a.getWidth() / 2).toBeCloseTo(0, 9);
    expect(a.getY() + a.getHeight() / 2).toBeCloseTo(10, 9);
  });
});
