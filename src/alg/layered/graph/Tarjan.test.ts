// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../options/InternalProperties.js';
import {
  type BuiltTarjanGraph,
  type TarjanEffects,
  type TarjanSpec,
  buildTarjanGraph,
  chainSpec,
  randomSpec,
  readEffects,
} from '../../../../test/helpers/tarjan-graphs.js';
import type { LEdge } from './LEdge.js';
import type { LNode } from './LNode.js';
import { Tarjan } from './Tarjan.js';

/**
 * Verbatim recursive transcription of `Tarjan.java` (AC6 reference): the port replaces the recursion of
 * `stronglyConnected` by an explicit work stack and must show every effect of this recursion.
 */
class RecursiveTarjan {
  index = 0;
  stack: LNode[] = [];

  constructor(
    private readonly edgesToBeReversed: LEdge[],
    readonly stronglyConnectedComponents: Set<LNode>[],
    readonly nodeToSCCID: Map<LNode, number>,
  ) {}

  stronglyConnected(v: LNode): void {
    v.setProperty(InternalProperties.TARJAN_ID, this.index);
    v.setProperty(InternalProperties.TARJAN_LOWLINK, this.index);
    this.index++;
    this.stack.push(v);
    v.setProperty(InternalProperties.TARJAN_ON_STACK, true);
    for (const edge of v.getConnectedEdges()) {
      if (edge.getSource()!.getNode() !== v && !this.edgesToBeReversed.includes(edge)) {
        continue;
      }
      if (edge.getSource()!.getNode() === v && this.edgesToBeReversed.includes(edge)) {
        continue;
      }
      let target: LNode;
      if (edge.getTarget()!.getNode() === v) {
        target = edge.getSource()!.getNode()!;
      } else {
        target = edge.getTarget()!.getNode()!;
      }
      this.followTarget(v, target);
    }
    this.closeComponent(v);
  }

  /** Test-only split (complexity limit): the target handling of the Java edge loop. */
  private followTarget(v: LNode, target: LNode): void {
    if (target.getProperty(InternalProperties.TARJAN_ID) === -1) {
      this.stronglyConnected(target);
      v.setProperty(
        InternalProperties.TARJAN_LOWLINK,
        Math.min(
          v.getProperty(InternalProperties.TARJAN_LOWLINK),
          target.getProperty(InternalProperties.TARJAN_LOWLINK),
        ),
      );
    } else if (target.getProperty(InternalProperties.TARJAN_ON_STACK)) {
      v.setProperty(
        InternalProperties.TARJAN_LOWLINK,
        Math.min(v.getProperty(InternalProperties.TARJAN_LOWLINK), target.getProperty(InternalProperties.TARJAN_ID)),
      );
    }
  }

  /** Test-only split (complexity limit): the Java code after the edge loop. */
  private closeComponent(v: LNode): void {
    if (v.getProperty(InternalProperties.TARJAN_LOWLINK) === v.getProperty(InternalProperties.TARJAN_ID)) {
      const sCC = new Set<LNode>();
      let n: LNode;
      do {
        n = this.stack.pop()!;
        n.setProperty(InternalProperties.TARJAN_ON_STACK, false);
        sCC.add(n);
      } while (v !== n);
      if (sCC.size > 1) {
        const index = this.stronglyConnectedComponents.length;
        this.stronglyConnectedComponents.push(sCC);
        for (const node of sCC) {
          this.nodeToSCCID.set(node, index);
        }
      }
    }
  }

  tarjan(layerless: readonly LNode[]): void {
    this.index = 0;
    this.stack = [];
    for (const node of layerless) {
      if (node.getProperty(InternalProperties.TARJAN_ID) === -1) {
        this.stronglyConnected(node);
        this.stack.length = 0;
      }
    }
  }
}

interface Run {
  readonly effects: TarjanEffects;
  readonly index: number;
}

/** Runs the port (`tarjan(graph)`) on a fresh build of the spec. */
function runPort(spec: TarjanSpec): Run {
  const built = buildTarjanGraph(spec);
  const components: Set<LNode>[] = [];
  const nodeToSCCID = new Map<LNode, number>();
  const t = new Tarjan(built.reversed, components, nodeToSCCID);
  t.tarjan(built.graph);
  return { effects: readEffects(built, t['stack'], components, nodeToSCCID), index: t['index'] };
}

/** Runs the recursive reference on a fresh build of the spec. */
function runReference(spec: TarjanSpec): Run {
  const built = buildTarjanGraph(spec);
  const components: Set<LNode>[] = [];
  const nodeToSCCID = new Map<LNode, number>();
  const t = new RecursiveTarjan(built.reversed, components, nodeToSCCID);
  t.tarjan(built.graph.getLayerlessNodes());
  return { effects: readEffects(built, t.stack, components, nodeToSCCID), index: t.index };
}

/** Runs port and reference calling `stronglyConnected` directly (no `tarjan` driver, stack not cleared). */
function runDirect(spec: TarjanSpec): { port: Run; reference: Run } {
  const drive = (
    make: (
      b: BuiltTarjanGraph,
      c: Set<LNode>[],
      m: Map<LNode, number>,
    ) => { sc(v: LNode): void; stack(): LNode[]; idx(): number },
  ): Run => {
    const built = buildTarjanGraph(spec);
    const components: Set<LNode>[] = [];
    const nodeToSCCID = new Map<LNode, number>();
    const t = make(built, components, nodeToSCCID);
    for (const node of built.nodes) {
      if (node.getProperty(InternalProperties.TARJAN_ID) === -1) {
        t.sc(node);
      }
    }
    return { effects: readEffects(built, t.stack(), components, nodeToSCCID), index: t.idx() };
  };
  return {
    port: drive((b, c, m) => {
      const t = new Tarjan(b.reversed, c, m);
      return { sc: (v) => t.stronglyConnected(v), stack: () => t['stack'], idx: () => t['index'] };
    }),
    reference: drive((b, c, m) => {
      const t = new RecursiveTarjan(b.reversed, c, m);
      return { sc: (v) => t.stronglyConnected(v), stack: () => t.stack, idx: () => t.index };
    }),
  };
}

const GENERATED_SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('Tarjan against the recursive reference', () => {
  it.each(GENERATED_SEEDS)('tarjan() on random graph, seed %i: every effect equals the reference', (seed) => {
    const spec = randomSpec(seed, 4 + (seed % 17), 3 + (seed % 41), (seed % 4) * 0.2);
    expect(runPort(spec)).toEqual(runReference(spec));
  });

  it.each(GENERATED_SEEDS)('stronglyConnected() driven directly, seed %i: effects incl. stack equal', (seed) => {
    const spec = randomSpec(1000 + seed, 3 + (seed % 13), 2 + (seed % 29), (seed % 3) * 0.25);
    const { port, reference } = runDirect(spec);
    expect(port).toEqual(reference);
  });

  it.each([false, true])('a 200-node chain (closed: %s) equals the reference', (closed) => {
    const spec = chainSpec(200, closed);
    expect(runPort(spec)).toEqual(runReference(spec));
  });

  it('records nested strongly connected components (cycles sharing a node) like the reference', () => {
    const spec: TarjanSpec = {
      nodeCount: 7,
      edges: [
        [0, 1],
        [1, 2],
        [2, 0],
        [2, 3],
        [3, 4],
        [4, 2],
        [4, 5],
        [5, 6],
      ],
      reversed: [],
    };
    const port = runPort(spec);
    expect(port).toEqual(runReference(spec));
    expect(port.effects.components.length).toBeGreaterThan(0);
  });

  it('records no component for a graph without cycles', () => {
    const port = runPort(chainSpec(50, false));
    expect(port.effects.components).toEqual([]);
    expect(port.effects.nodeToSCCID).toEqual([]);
  });

  it('10,000-node chain: no stack overflow in the port, effects equal the reference', () => {
    const spec = chainSpec(10_000, true);
    const port = runPort(spec);
    expect(port.effects.components).toHaveLength(1);
    expect(port.effects.components[0]).toHaveLength(spec.nodeCount);
    let reference: Run | null = null;
    try {
      reference = runReference(spec);
    } catch (e) {
      // the recursive reference itself overflows the interpreter's stack under --jitless (AC6); the port must not
      expect(e).toBeInstanceOf(RangeError);
    }
    if (reference !== null) {
      expect(port).toEqual(reference);
    }
  });
});

describe('Tarjan.resetTarjan', () => {
  it('resets the tarjan properties of every layerless node and IS_PART_OF_CYCLE of its edges', () => {
    const built = buildTarjanGraph(chainSpec(5, true));
    const t = new Tarjan([], [], new Map());
    t.tarjan(built.graph);
    for (const e of built.edges) {
      e.setProperty(InternalProperties.IS_PART_OF_CYCLE, true);
    }
    t.resetTarjan(built.graph);
    for (const n of built.nodes) {
      expect(n.getProperty(InternalProperties.TARJAN_ID)).toBe(InternalProperties.TARJAN_ID.getDefault());
      expect(n.getProperty(InternalProperties.TARJAN_LOWLINK)).toBe(-1);
      expect(n.getProperty(InternalProperties.TARJAN_ON_STACK)).toBe(false);
    }
    for (const e of built.edges) {
      expect(e.getProperty(InternalProperties.IS_PART_OF_CYCLE)).toBe(false);
    }
    expect(t['stack']).toEqual([]);
  });
});
