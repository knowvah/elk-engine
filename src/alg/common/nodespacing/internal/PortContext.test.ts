// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../test/helpers/node-context-fixtures.js';
import { ElkMargin } from '../../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { PortContext } from './PortContext.js';

const { INSIDE, OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE } = PortLabelPlacement;

beforeAll(loadLayoutMetaData);

type Wiring = 'none' | 'outgoing' | 'incoming' | 'compound';

/** Builds a node with a single western port, wires it as asked, and returns the port context. */
function portContext(placement: EnumSet<PortLabelPlacement>, compound: boolean, wiring: Wiring = 'none'): PortContext {
  let port: ElkPort | undefined;
  const fixture = nodeFixture((node: ElkNode, root: ElkNode) => {
    node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
    port = addPort(node, PortSide.WEST, 3, 4);
    const child = compound || wiring === 'compound' ? ElkGraphUtil.createNode(node) : null;
    const sibling = ElkGraphUtil.createNode(root);
    if (wiring === 'outgoing') {
      ElkGraphUtil.createSimpleEdge(port, sibling);
    } else if (wiring === 'incoming') {
      ElkGraphUtil.createSimpleEdge(sibling, port);
    } else if (wiring === 'compound') {
      ElkGraphUtil.createSimpleEdge(port, child);
    }
  });
  const context = contextOf(fixture);
  return new PortContext(context, fixture.nodeAdapter.getPorts()[0]!);
}

describe('PortContext fields', () => {
  it('copies the port position and starts with an empty margin and no label cell', () => {
    const fixture = nodeFixture((node) => addPort(node, PortSide.NORTH, 3, 4));
    const context = contextOf(fixture);
    const port = fixture.nodeAdapter.getPorts()[0]!;
    const portContext = new PortContext(context, port);
    expect(portContext.parentNodeContext).toBe(context);
    expect(portContext.port).toBe(port);
    expect([portContext.portPosition.x, portContext.portPosition.y]).toEqual([3, 4]);
    expect(portContext.portMargin).toEqual(new ElkMargin());
    expect(portContext.portLabelCell).toBeNull();
  });

  it('applies the position to the port only on request', () => {
    const fixture = nodeFixture((node) => addPort(node, PortSide.NORTH, 3, 4));
    const port = fixture.nodeAdapter.getPorts()[0]!;
    const portContext = new PortContext(contextOf(fixture), port);
    portContext.portPosition.x = 11;
    portContext.portPosition.y = 12;
    expect([fixture.node.getPorts().get(0).getX(), fixture.node.getPorts().get(0).getY()]).toEqual([3, 4]);
    portContext.applyPortPosition();
    expect([fixture.node.getPorts().get(0).getX(), fixture.node.getPorts().get(0).getY()]).toEqual([11, 12]);
  });
});

describe('PortContext.labelsNextToPort', () => {
  it('is true for inside labels on a non-compound node, with or without NEXT_TO_PORT_IF_POSSIBLE', () => {
    expect(portContext(EnumSet.of(INSIDE), false).labelsNextToPort).toBe(true);
    expect(portContext(EnumSet.of(INSIDE, NEXT_TO_PORT_IF_POSSIBLE), false).labelsNextToPort).toBe(true);
  });

  it('is true for inside labels on a compound node when asked and the port has no compound connection', () => {
    expect(portContext(EnumSet.of(INSIDE, NEXT_TO_PORT_IF_POSSIBLE), true).labelsNextToPort).toBe(true);
  });

  it('is false for inside labels on a compound node when the port has a compound connection', () => {
    expect(portContext(EnumSet.of(INSIDE, NEXT_TO_PORT_IF_POSSIBLE), true, 'compound').labelsNextToPort).toBe(false);
  });

  it('is false for inside labels on a compound node that does not ask for next-to-port', () => {
    expect(portContext(EnumSet.of(INSIDE), true).labelsNextToPort).toBe(false);
  });

  it('is true for outside labels next to a port without incident edges', () => {
    expect(portContext(EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE), false).labelsNextToPort).toBe(true);
  });

  it('is false for outside labels next to a port with an outgoing or an incoming edge', () => {
    expect(portContext(EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE), false, 'outgoing').labelsNextToPort).toBe(false);
    expect(portContext(EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE), false, 'incoming').labelsNextToPort).toBe(false);
  });

  it('is false for outside labels that do not ask for next-to-port', () => {
    expect(portContext(EnumSet.of(OUTSIDE), false).labelsNextToPort).toBe(false);
  });

  it('is false for fixed labels, even with NEXT_TO_PORT_IF_POSSIBLE', () => {
    expect(portContext(EnumSet.of(NEXT_TO_PORT_IF_POSSIBLE), false).labelsNextToPort).toBe(false);
  });
});
