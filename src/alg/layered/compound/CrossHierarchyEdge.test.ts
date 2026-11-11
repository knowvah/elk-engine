// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { PortType } from '../options/PortType.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';

/** An edge between a port of `sourceNode` and a port of `targetNode`. */
function edgeBetween(sourceNode: LNode, targetNode: LNode): { edge: LEdge; source: LPort; target: LPort } {
  const source = new LPort();
  source.setNode(sourceNode);
  const target = new LPort();
  target.setNode(targetNode);
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return { edge, source, target };
}

describe('CrossHierarchyEdge (the Java structure)', () => {
  it('returns the edge, graph and type it was created with', () => {
    const graph = new LGraph();
    const edge = new LEdge();
    const segment = new CrossHierarchyEdge(edge, graph, PortType.INPUT);
    expect(segment.getEdge()).toBe(edge);
    expect(segment.getGraph()).toBe(graph);
    expect(segment.getType()).toBe(PortType.INPUT);
  });

  it('prints the type and the edge', () => {
    const edge = new LEdge();
    expect(new CrossHierarchyEdge(edge, new LGraph(), PortType.OUTPUT).toString()).toBe(`OUTPUT:${edge.toString()}`);
  });

  it('returns the end ports of the edge when no end is an external port dummy', () => {
    const graph = new LGraph();
    const { edge, source, target } = edgeBetween(new LNode(graph), new LNode(graph));
    const segment = new CrossHierarchyEdge(edge, graph, PortType.OUTPUT);
    expect(segment.getActualSource()).toBe(source);
    expect(segment.getActualTarget()).toBe(target);
  });

  it('returns the ORIGIN port of the dummy for an end on an external port node', () => {
    const graph = new LGraph();
    const sourceDummy = new LNode(graph);
    sourceDummy.setType(NodeType.EXTERNAL_PORT);
    const targetDummy = new LNode(graph);
    targetDummy.setType(NodeType.EXTERNAL_PORT);
    const sourceOrigin = new LPort();
    const targetOrigin = new LPort();
    sourceDummy.setProperty(InternalProperties.ORIGIN, sourceOrigin);
    targetDummy.setProperty(InternalProperties.ORIGIN, targetOrigin);
    const { edge } = edgeBetween(sourceDummy, targetDummy);
    const segment = new CrossHierarchyEdge(edge, graph, PortType.INPUT);
    expect(segment.getActualSource()).toBe(sourceOrigin);
    expect(segment.getActualTarget()).toBe(targetOrigin);
  });
});
