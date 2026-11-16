// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the self loop port ordering classes (mission 7g, T21a, W14/F12): `PortRestorer` (and its port list),
// `PortSideAssigner` and the loop types they depend on. Every case replays one row of
// test/golden/refs/java/layered-loops.json through the real classes, then asserts a class-level fact against the value the
// row records: the port order a node is left with, the type and ports of each loop, which ports were hidden. No literal is
// typed here; enum constants compare by name.
import { describe, expect, it } from 'vitest';
import { InteractiveLayeredGraphVisitor } from '../../../InteractiveLayeredGraphVisitor.js';
import { ComponentsProcessor } from '../../../components/ComponentsProcessor.js';
import type { LGraph } from '../../../graph/LGraph.js';
import type { LNode } from '../../../graph/LNode.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { registerLayered } from '../../../../../../test/helpers/layered-framework-replay.js';
import { withLoopsLabelManager } from '../../../../../../test/helpers/layered-loops-replay-manager.js';
import { runLoopsRow, strategyFactories } from '../../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  isStopRow,
  loadLoopsRows,
  registerLoopsEnums,
  type PipelineStopRow,
} from '../../../../../../test/helpers/layered-loops-replay-rows.js';
import {
  installWrappingEncoding,
  withListOptions,
} from '../../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { contextOf, elementAt } from '../../../../../../test/helpers/layered-phase-replay-dump.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';

interface PortRow {
  readonly port: string;
  readonly hadOnlySelfLoops: boolean;
  readonly hidden: boolean;
}

interface LoopRow {
  readonly type: string | null;
  readonly ports: readonly string[];
}

interface HolderRow {
  readonly portsHidden: boolean;
  readonly ports: readonly PortRow[];
  readonly loops: readonly LoopRow[];
}

interface Expected {
  readonly ports: Readonly<Record<string, readonly string[]>>;
  readonly selfLoops: Readonly<Record<string, HolderRow>>;
}

const rows = new Map(
  loadLoopsRows()
    .filter(isStopRow)
    .map((row) => [row.id, row] as const),
);

interface Replayed {
  readonly graph: LGraph;
  readonly expected: Expected;
}

function replay(id: string): Replayed {
  const row = rows.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
  const env = {
    factories: strategyFactories,
    components: new ComponentsProcessor(),
    createInteractiveVisitor: () => new InteractiveLayeredGraphVisitor(),
  };
  const result = withLoopsLabelManager(withListOptions(row) as PipelineStopRow, (stepRow) => runLoopsRow(stepRow, env));
  return { graph: result.graph, expected: row.expected as unknown as Expected };
}

const nodeOf = (replayed: Replayed, node: string): LNode => elementAt(replayed.graph, node) as LNode;

const holderOf = (replayed: Replayed, node: string): SelfLoopHolder =>
  nodeOf(replayed, node).getProperty(InternalProperties.SELF_LOOP_HOLDER);

const pathOf = (replayed: Replayed, element: object): string => {
  const path = contextOf(replayed.graph).paths.get(element);
  if (path === undefined) {
    throw new Error('element without a path');
  }
  return path;
};

/** The order of the ports of a node as the processor left it, by path. */
const portOrder = (replayed: Replayed, node: string): string[] =>
  nodeOf(replayed, node)
    .getPorts()
    .map((port) => pathOf(replayed, port));

describe('PortRestorer', () => {
  // oracle: sites/PortRestorer/splitIndex; PortRestorer.java:161-190 (computePortListSplitIndex): the port with the first
  // positive net flow splits the sorted list, so the first group is prepended and the second appended in the middle area
  it('splits the sorted ports of a stacked loop at the first positive net flow', () => {
    const replayed = replay('sites/PortRestorer/splitIndex');
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    expect(String(holderOf(replayed, 'g0/n1').getSLHyperLoops()[0]!.getSelfLoopType())).toBe(
      replayed.expected.selfLoops['g0/n1']!.loops[0]!.type,
    );
  });

  // oracle: sites/PortRestorer/reverseStacked/reverse and /sequenced; PortRestorer.java:120-160 (processOneSideLoops):
  // REVERSE_STACKED reverses the list of one-sided loops, SEQUENCED appends each loop's ports in net flow order
  it('orders two one-sided loops by the node-level ordering strategy', () => {
    const reverse = replay('sites/PortRestorer/reverseStacked/reverse');
    const sequenced = replay('sites/PortRestorer/reverseStacked/sequenced');
    expect(portOrder(reverse, 'g0/n1')).toEqual(reverse.expected.ports['g0/n1']);
    expect(portOrder(sequenced, 'g0/n1')).toEqual(sequenced.expected.ports['g0/n1']);
    expect(portOrder(reverse, 'g0/n1')).not.toEqual(portOrder(sequenced, 'g0/n1'));
  });

  // oracle: scenarios/SelfLoopPortRestorer/parallel/RIGHT; PortRestorer.java:161-172 (computePortListSplitIndex, the first scan
  // stops at the first port with a positive net flow): parallel loops between the same ports are ordered as recorded
  it('orders parallel loops between the same ports by their net flow as recorded', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/parallel/RIGHT');
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    const loops = holderOf(replayed, 'g0/n1').getSLHyperLoops();
    expect(loops.map((loop) => String(loop.getSelfLoopType()))).toEqual(
      replayed.expected.selfLoops['g0/n1']!.loops.map((loop) => loop.type),
    );
  });

  // oracle: scenarios/SelfLoopPortRestorer/hyper-nesw/RIGHT; PortRestorer.java:277 (processFourSideLoops): a four-sided
  // hyper loop on a FIXED_SIDE node keeps its ports on their sides and the restorer places them around the regular ports
  it('restores the ports of a four-sided loop on a fixed-side node in the recorded order', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/hyper-nesw/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    expect(String(holderOf(replayed, 'g0/n1').getSLHyperLoops()[0]!.getSelfLoopType())).toBe(recorded.loops[0]!.type);
    expect(holderOf(replayed, 'g0/n1').arePortsHidden()).toBe(recorded.portsHidden);
  });

  // oracle: scenarios/SelfLoopPortRestorer/mixed-sides/RIGHT; PortRestorer.java:120-160: four one-sided loops on different
  // sides of a FIXED_SIDE node
  it('places one-sided loops of different sides into their side areas', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/mixed-sides/RIGHT');
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });

  // oracle: scenarios/SelfLoopPortRestorer/fixed-order/RIGHT; SelfLoopPreProcessor.java:88-105 (no ports hidden when the
  // order is fixed) and SelfLoopPortRestorer.java:62-92 (no restoring): the ports of the fixed-order node stay as recorded
  it('leaves the ports of a fixed-order node hidden by nobody', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/fixed-order/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    expect(holder.arePortsHidden()).toBe(recorded.portsHidden);
    expect([...holder.getSLPortMap().values()].map((slPort) => slPort.isHidden())).toEqual(
      recorded.ports.map((port) => port.hidden),
    );
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });
});

describe('PortSideAssigner', () => {
  // oracle: scenarios/SelfLoopPortRestorer/free/RIGHT; PortSideAssigner.java:39 (assignPortSides), :68 (default NORTH
  // distribution): a FREE node's hidden loop ports are assigned to one side and restored in the recorded order
  it('assigns the hidden ports of a FREE node to the recorded order', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/free/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    expect(holderOf(replayed, 'g0/n1').arePortsHidden()).toBe(recorded.portsHidden);
  });

  // oracle: scenarios/SelfLoopPortRestorer/free-many-dist-EQUALLY/RIGHT; PortSideAssigner.java:148 (assignToAllSides): eight
  // loops are spread over the four sides
  it('distributes the loops of an EQUALLY node over all sides in the recorded port order', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/free-many-dist-EQUALLY/RIGHT');
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    const loops = holderOf(replayed, 'g0/n1').getSLHyperLoops();
    expect(loops.map((loop) => loop.getSLPorts().map((slPort) => pathOf(replayed, slPort.getLPort())))).toEqual(
      replayed.expected.selfLoops['g0/n1']!.loops.map((loop) => loop.ports),
    );
  });

  // oracle: scenarios/SelfLoopPortRestorer/free-shared/RIGHT; PortSideAssigner.java:209 (hiddenSelfLoopPortStream), SelfLoopPort
  // hadOnlySelfLoops: a port that also carries a regular edge stays visible and keeps its side
  it('leaves ports that carry a regular edge visible', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/free-shared/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const slPorts = [...holderOf(replayed, 'g0/n1').getSLPortMap().values()];
    expect(slPorts.map((slPort) => pathOf(replayed, slPort.getLPort()))).toEqual(
      recorded.ports.map((port) => port.port),
    );
    expect(slPorts.map((slPort) => slPort.hadOnlySelfLoops())).toEqual(
      recorded.ports.map((port) => port.hadOnlySelfLoops),
    );
    expect(slPorts.map((slPort) => slPort.isHidden())).toEqual(recorded.ports.map((port) => port.hidden));
    expect(recorded.ports.some((port) => !port.hadOnlySelfLoops)).toBe(true);
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });

  // oracle: sites/PortSideAssigner/hiddenAndVisible/EQUALLY and /NORTH_SOUTH; PortSideAssigner.java:170-205 (assignToTarget)
  // and :209: a loop over four ports, two of which carry another edge, ends as THREE_SIDES; the visible ports keep their side
  it.each(['EQUALLY', 'NORTH_SOUTH'])(
    'keeps the visible ports of a %s loop and types the loop as recorded',
    (strategy) => {
      const replayed = replay(`sites/PortSideAssigner/hiddenAndVisible/${strategy}`);
      const recorded = replayed.expected.selfLoops['g0/n1']!;
      const holder = holderOf(replayed, 'g0/n1');
      expect(String(holder.getSLHyperLoops()[0]!.getSelfLoopType())).toBe(recorded.loops[0]!.type);
      expect([...holder.getSLPortMap().values()].map((slPort) => slPort.hadOnlySelfLoops())).toEqual(
        recorded.ports.map((port) => port.hadOnlySelfLoops),
      );
      expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    },
  );
});
