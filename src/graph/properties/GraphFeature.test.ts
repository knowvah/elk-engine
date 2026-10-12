// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { GraphFeature } from './GraphFeature.js';

const DECLARATION_ORDER = [
  'SELF_LOOPS',
  'INSIDE_SELF_LOOPS',
  'MULTI_EDGES',
  'EDGE_LABELS',
  'PORTS',
  'COMPOUND',
  'CLUSTERS',
  'DISCONNECTED',
];

describe('GraphFeature', () => {
  it('lists the constants in declaration order', () => {
    expect(GraphFeature.values().map((f) => f.name())).toEqual(DECLARATION_ORDER);
    expect(GraphFeature.values().map((f) => f.ordinal())).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('exposes the description of each constant', () => {
    expect(GraphFeature.SELF_LOOPS.getDescription()).toBe('Edges connecting a node with itself.');
    expect(GraphFeature.INSIDE_SELF_LOOPS.getDescription()).toBe(
      'Self-loops routed through a node instead of around it.',
    );
    expect(GraphFeature.MULTI_EDGES.getDescription()).toBe('Multiple edges with the same source and target node.');
    expect(GraphFeature.EDGE_LABELS.getDescription()).toBe('Labels that are associated with edges.');
    expect(GraphFeature.PORTS.getDescription()).toBe('Edges are connected to nodes over ports.');
    // Upstream reads "levelsand" (missing space); accepted divergence, see docs/conformance.md.
    expect(GraphFeature.COMPOUND.getDescription()).toBe(
      'Edges that connect nodes from different hierarchy levels and are incident to compound nodes.',
    );
    expect(GraphFeature.CLUSTERS.getDescription()).toBe(
      'Edges that connect nodes from different clusters, but not the cluster parent nodes.',
    );
    expect(GraphFeature.DISCONNECTED.getDescription()).toBe('Multiple connected components.');
  });

  it('valueOf finds a constant by name', () => {
    expect(GraphFeature.valueOf('PORTS')).toBe(GraphFeature.PORTS);
  });

  it('valueOf throws the JDK message for an unknown name', () => {
    expect(() => GraphFeature.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => GraphFeature.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.graph.properties.GraphFeature.NOPE',
    );
  });

  it('toString is the name and compareTo is by ordinal', () => {
    expect(GraphFeature.CLUSTERS.toString()).toBe('CLUSTERS');
    expect(GraphFeature.PORTS.compareTo(GraphFeature.SELF_LOOPS)).toBe(4);
    expect(GraphFeature.SELF_LOOPS.compareTo(GraphFeature.PORTS)).toBe(-4);
    expect(GraphFeature.PORTS.compareTo(GraphFeature.PORTS)).toBe(0);
  });
});
