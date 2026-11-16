// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { randomLayeredGraph } from '../../../../../test/helpers/wrapping-graphs.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { Direction } from '../../../../core/options/Direction.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../../../../java/util/NoSuchElementException.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { GraphStats } from './GraphStats.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Independent re-reading of Java `determineLayerWidth` (twin). */
function twinLayerWidth(l: Layer, spacing: number): number {
  let maxW = 0;
  for (const n of l.getNodes()) {
    maxW = Math.max(maxW, n.getSize().x + n.getMargin().right + n.getMargin().left + spacing);
  }
  return maxW;
}

/** Independent re-reading of Java `determineLayerHeight` (twin), including the north/south origin term. */
function twinLayerHeight(l: Layer, inLayer: number): number {
  let lH = 0;
  for (const n of l.getNodes()) {
    lH += n.getSize().y + n.getMargin().bottom + n.getMargin().top + inLayer;
    for (const inc of n.getIncomingEdges()) {
      const src = inc.getSource()!.getNode()!;
      if (src.getType() === NodeType.NORTH_SOUTH_PORT) {
        const o = src.getProperty(InternalProperties.ORIGIN) as LNode;
        lH += o.getSize().y + o.getMargin().bottom + o.getMargin().top;
      }
    }
  }
  return lH;
}

function spacings(g: LGraph): { between: number; inLayer: number } {
  return {
    between: g.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS),
    inLayer: g.getProperty(LayeredOptions.SPACING_NODE_NODE),
  };
}

describe('GraphStats construction', () => {
  it('derives dar from aspect ratio and correction per direction', () => {
    const horizontal = [Direction.LEFT, Direction.RIGHT, Direction.UNDEFINED];
    const vertical = [Direction.UP, Direction.DOWN];
    for (const dir of [...horizontal, ...vertical]) {
      const g = randomLayeredGraph(1);
      g.setProperty(LayeredOptions.DIRECTION, dir);
      const ar = g.getProperty(LayeredOptions.ASPECT_RATIO);
      const corr = g.getProperty(LayeredOptions.WRAPPING_CORRECTION_FACTOR);
      const gs = new GraphStats(g);
      expect(gs.dar).toBe(horizontal.includes(dir) ? ar * corr : 1 / (ar * corr));
    }
  });

  it('takes longestPath from the layer count and keeps the graph', () => {
    for (const seed of SEEDS) {
      const g = randomLayeredGraph(seed);
      const gs = new GraphStats(g);
      expect(gs.longestPath).toBe(g.getLayers().length);
      expect(gs.graph).toBe(g);
    }
  });
});

describe('GraphStats widths and heights (twin of the Java)', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const g = randomLayeredGraph(seed);
    const { between, inLayer } = spacings(g);
    const layers = g.getLayers();
    const widths = layers.map((l) => twinLayerWidth(l, between));
    const heights = layers.map((l) => twinLayerHeight(l, inLayer));
    const gs = new GraphStats(g);

    expect(gs.getWidths()).toEqual(widths);
    expect(gs.getHeights()).toEqual(heights);
    expect(gs.getWidths()).toBe(gs.getWidths());
    expect(gs.getMaxWidth()).toBe(widths.reduce((a, b) => Math.max(a, b)));
    expect(gs.getMaxHeight()).toBe(heights.reduce((a, b) => Math.max(a, b)));
    expect(gs.getSumWidth()).toBe(widths.reduce((a, b) => a + b));
    expect(gs.getApproximateLayeringWidth()).toBe(gs.getSumWidth());
    expect(gs.getApproximateLayeringHeight()).toBe(gs.getMaxHeight());
    layers.forEach((l, i) => {
      expect(gs.getApproximateLayerWidth(l)).toBe(widths[i]);
      expect(gs.getApproximateLayerHeight(l)).toBe(heights[i]);
    });
  });

  it('getHeights initialises widths and heights itself when called first', () => {
    const g = randomLayeredGraph(2);
    const first = new GraphStats(g).getHeights();
    expect(first).toEqual(g.getLayers().map((l) => twinLayerHeight(l, spacings(g).inLayer)));
  });

  it('adds the origin node height of a north/south port source', () => {
    const g = new LGraph();
    const l0 = addLayer(g);
    const l1 = addLayer(g);
    const origin = addNode(g);
    origin.getSize().y = 7;
    origin.getMargin().top = 1;
    origin.getMargin().bottom = 2;
    const dummy = addNode(g, NodeType.NORTH_SOUTH_PORT);
    dummy.setProperty(InternalProperties.ORIGIN, origin);
    dummy.setLayer(l0);
    const target = addNode(g);
    target.setLayer(l1);
    connect(addPort(dummy, PortSide.EAST), addPort(target, PortSide.WEST));
    const { inLayer } = spacings(g);
    const gs = new GraphStats(g);
    expect(gs.getApproximateLayerHeight(l1)).toBe(twinLayerHeight(l1, inLayer));
    expect(gs.getApproximateLayerHeight(l1)).toBe(
      target.getSize().y +
        target.getMargin().bottom +
        target.getMargin().top +
        inLayer +
        (origin.getSize().y + origin.getMargin().bottom + origin.getMargin().top),
    );
  });
});

describe('GraphStats chunk-based approximations', () => {
  it.each(SEEDS)('seed %i matches the twin for every cut list of the layering', (seed) => {
    const g = randomLayeredGraph(seed);
    const { between, inLayer } = spacings(g);
    const layers = g.getLayers();
    const gs = new GraphStats(g);
    const n = layers.length;
    const widthOf = (lo: number, hi: number): number => {
      let sum = 0;
      for (let i = lo; i < hi; i++) sum += twinLayerWidth(layers[i]!, between);
      return sum;
    };
    const heightOf = (lo: number, hi: number): number => {
      let max = 0;
      for (let i = lo; i < hi; i++) max = Math.max(max, twinLayerHeight(layers[i]!, inLayer));
      return max;
    };
    for (let cut = 1; cut < n; cut++) {
      const cuts = [cut];
      expect(gs.getApproximateChunkBasedLayeringWidth(cuts)).toBe(Math.max(widthOf(0, cut), widthOf(cut, n)));
      expect(gs.getApproximateChunkBasedLayeringHeight(cuts)).toBe(heightOf(0, cut) + heightOf(cut, n));
    }
  });

  it('an empty cut list falls back to the current layering', () => {
    const gs = new GraphStats(randomLayeredGraph(3));
    expect(gs.getApproximateChunkBasedLayeringWidth([])).toBe(gs.getApproximateLayeringWidth());
    expect(gs.getApproximateChunkBasedLayeringHeight([])).toBe(0);
  });

  it('an empty chunk (cut at 0 or at the end) contributes 0, as orElse(0)', () => {
    const g = randomLayeredGraph(4);
    const gs = new GraphStats(g);
    const n = g.getLayers().length;
    expect(gs.getApproximateChunkBasedLayeringWidth([0])).toBe(gs.getApproximateLayeringWidth());
    expect(gs.getApproximateChunkBasedLayeringHeight([n])).toBe(gs.getApproximateLayeringHeight());
  });

  it('an out-of-range chunk throws like List.subList', () => {
    const g = randomLayeredGraph(5);
    const gs = new GraphStats(g);
    const n = g.getLayers().length;
    expect(() => gs.getApproximateChunkBasedLayeringWidth([n + 1])).toThrow(IndexOutOfBoundsException);
    expect(() => gs.getApproximateChunkBasedLayeringHeight([n + 1])).toThrow(IndexOutOfBoundsException);
    // descending cuts: fromIndex > toIndex on the second chunk
    expect(() => gs.getApproximateChunkBasedLayeringWidth([n, 0])).toThrow(IndexOutOfBoundsException);
    expect(() => gs.getApproximateChunkBasedLayeringWidth([-1])).toThrow(IndexOutOfBoundsException);
  });
});

describe('GraphStats empty layering (Java stream get() and array bounds)', () => {
  it('throws NoSuchElementException for max/sum, ArrayIndexOutOfBounds for cuts', () => {
    const gs = new GraphStats(new LGraph());
    expect(gs.longestPath).toBe(gs.graph.getLayers().length);
    expect(() => gs.getMaxWidth()).toThrow(NoSuchElementException);
    expect(() => gs.getSumWidth()).toThrow(NoSuchElementException);
    expect(() => gs.getMaxHeight()).toThrow(NoSuchElementException);
    expect(gs.getWidths()).toEqual([]);
    expect(gs.getHeights()).toEqual([]);
    expect(() => gs.isCutAllowed(0)).toThrow(ArrayIndexOutOfBoundsException);
    // Java assigns `cutsAllowed = new boolean[0]` before `cutsAllowed[0] = false` throws, so it stays non-null
    expect(gs.getCutsAllowed()).toEqual([]);
    expect(() => gs.isCutAllowed(0)).toThrow(ArrayIndexOutOfBoundsException);
  });
});

/** A graph of layers given as lists of (target-node -> source-node-index-in-previous-layer) edge counts. */
function twoLayerGraph(edgeSources: readonly number[]): { gs: GraphStats; g: LGraph } {
  const g = new LGraph();
  const l0 = addLayer(g);
  const l1 = addLayer(g);
  const sources = edgeSources.map(() => addNode(g));
  sources.forEach((s) => s.setLayer(l0));
  const target = addNode(g);
  target.setLayer(l1);
  edgeSources.forEach((s) => connect(addPort(sources[s]!, PortSide.EAST), addPort(target, PortSide.WEST)));
  return { gs: new GraphStats(g), g };
}

describe('GraphStats cut permission', () => {
  it('never allows a cut before layer 0', () => {
    for (const seed of SEEDS) {
      expect(new GraphStats(randomLayeredGraph(seed)).isCutAllowed(0)).toBe(false);
    }
  });

  it('allows a cut between layers joined by one node pair (several parallel edges included)', () => {
    const { gs } = twoLayerGraph([0, 0]);
    expect(gs.isCutAllowed(1)).toBe(true);
    expect(gs.getCutsAllowed()).toEqual([false, true]);
    expect(gs.getCutsAllowed()).toBe(gs.getCutsAllowed());
  });

  it('forbids a cut when the target sees two different sources', () => {
    const { gs } = twoLayerGraph([0, 1]);
    expect(gs.isCutAllowed(1)).toBe(false);
  });

  it('forbids a cut when two different targets have incoming edges', () => {
    const g = new LGraph();
    const l0 = addLayer(g);
    const l1 = addLayer(g);
    const src = addNode(g);
    src.setLayer(l0);
    for (let k = 0; k < 2; k++) {
      const t = addNode(g);
      t.setLayer(l1);
      connect(addPort(src, PortSide.EAST), addPort(t, PortSide.WEST));
    }
    expect(new GraphStats(g).isCutAllowed(1)).toBe(false);
  });

  it('with forbidden indices set, every entry stays false (the Java never sets one to true)', () => {
    const { g } = twoLayerGraph([0]);
    g.setProperty(LayeredOptions.WRAPPING_VALIDIFY_FORBIDDEN_INDICES, [1, 0, -1, g.getLayers().length]);
    const gs = new GraphStats(g);
    expect(gs.getCutsAllowed()).toEqual(g.getLayers().map(() => false));
  });

  it('isCutAllowed outside the array throws ArrayIndexOutOfBounds', () => {
    const { gs, g } = twoLayerGraph([0]);
    expect(() => gs.isCutAllowed(g.getLayers().length)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => gs.isCutAllowed(-1)).toThrow(ArrayIndexOutOfBoundsException);
  });
});
