// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';

/** A node of the given type whose external-port side is set when given (structural, L4-neutral). */
function node(type: NodeType, extPortSide?: PortSide): LNode {
  const built = new LNode(new LGraph());
  built.setType(type);
  if (extPortSide !== undefined) built.setProperty(InternalProperties.EXT_PORT_SIDE, extPortSide);
  return built;
}

describe('PolylineEdgeRouter (T2 stub)', () => {
  it('PRED_EXTERNAL_WEST_OR_EAST_PORT accepts external-port dummies on WEST or EAST only', () => {
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.WEST))).toBe(true);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.EAST))).toBe(true);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.NORTH))).toBe(
      false,
    );
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT, PortSide.SOUTH))).toBe(
      false,
    );
    // the default side is UNDEFINED
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.EXTERNAL_PORT))).toBe(false);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.NORMAL, PortSide.WEST))).toBe(false);
    expect(PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node(NodeType.LONG_EDGE, PortSide.EAST))).toBe(false);
  });

  it('the phase methods throw until T5 completes the class', () => {
    const router = new PolylineEdgeRouter();
    const graph = new LGraph();
    expect(() => router.getLayoutProcessorConfiguration(graph)).toThrow(UnsupportedOperationException);
    expect(() => router.getLayoutProcessorConfiguration(graph)).toThrow('PolylineEdgeRouter is completed in T5');
    expect(() => router.process(graph, new BasicProgressMonitor())).toThrow(UnsupportedOperationException);
    expect(() => router.process(graph, new BasicProgressMonitor())).toThrow('PolylineEdgeRouter is completed in T5');
  });
});
