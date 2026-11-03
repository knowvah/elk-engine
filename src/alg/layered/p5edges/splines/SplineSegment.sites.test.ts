// SPDX-License-Identifier: EPL-2.0
// Structural case for the one SplineSegment branch no oracle row reaches (mission 7e, T14b, unreached.md J):
// `anchorY` unboxes the `Double` `SPLINE_NS_PORT_Y_COORD` of a north or south port (SplineSegment.java:247), which is a
// NullPointerException when the north/south postprocessor has not set it. The recorder records no throwing row, so the
// expectation is the Java text: the port raises the AD-16 `TypeError` for the unboxing NPE, for the source and the
// target end alike, and a port that has the property is read (the twin: SplineSegment.test.ts).
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LEdge } from '../../graph/LEdge.js';
import { LNode } from '../../graph/LNode.js';
import { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { SplineEdgeRouterSideToProcess as SideToProcess } from './SplineEdgeRouterSideToProcess.js';
import { SplineSegment } from './SplineSegment.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const UNBOXING_MESSAGE = /Cannot unbox the spline north\/south y coordinate/;

function portOn(side: PortSide): LPort {
  const node = new LNode(null);
  const port = new LPort();
  port.setNode(node);
  port.setSide(side);
  return port;
}

function edgeBetween(source: LPort, target: LPort): LEdge {
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return edge;
}

describe('SplineSegment.anchorY on a north/south port without SPLINE_NS_PORT_Y_COORD (T14b, J)', () => {
  it('throws the unboxing TypeError for a target port on the north side', () => {
    // J: SplineSegment.java:247 (the target end of the edge information)
    const edge = edgeBetween(portOn(PortSide.EAST), portOn(PortSide.NORTH));
    expect(() => new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT)).toThrow(TypeError);
    expect(() => new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT)).toThrow(UNBOXING_MESSAGE);
  });

  it('throws the unboxing TypeError for a source port on the south side', () => {
    // J: SplineSegment.java:247 (the source end of the edge information)
    const edge = edgeBetween(portOn(PortSide.SOUTH), portOn(PortSide.WEST));
    expect(() => new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT)).toThrow(TypeError);
  });

  it('reads the property once the north/south postprocessor has set it', () => {
    // J: SplineSegment.java:247; the twin of the throwing cases with the property present
    const north = portOn(PortSide.NORTH);
    north.setProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD, 12);
    const edge = edgeBetween(portOn(PortSide.EAST), north);
    const segment = new SplineSegment(edge, SideToProcess.RIGHT, SideToProcess.LEFT);
    expect(segment.edgeInformation.get(edge)!.endY).toBe(12);
  });
});
