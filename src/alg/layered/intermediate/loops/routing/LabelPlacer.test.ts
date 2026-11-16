// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { SelfLoopTestGraphCreator as Creator } from '../../../../../../test/helpers/SelfLoopTestGraphCreator.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../../../core/util/NullElkProgressMonitor.js';
import { LGraph } from '../../../graph/LGraph.js';
import { LLabel } from '../../../graph/LLabel.js';
import type { LNode } from '../../../graph/LNode.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { SelfLoopOrderingStrategy } from '../../../options/SelfLoopOrderingStrategy.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { Alignment } from '../SelfHyperLoopLabelsAlignment.js';
import { SelfLoopHolder } from '../SelfLoopHolder.js';
import { LabelPlacer } from './LabelPlacer.js';
import { RoutingDirector } from './RoutingDirector.js';

type PortCounts = readonly [north: number, east: number, south: number, west: number];

/** A node with the given ports; `edges` lists pairs of port indices, each edge gets one label. */
function labelledNode(counts: PortCounts, edges: readonly (readonly [number, number])[], inline = false): LNode {
  const node = Creator.node(new LGraph());
  Creator.ports(node, ...counts);
  for (const [source, target] of edges) {
    const edge = Creator.edge(node.getPorts()[source]!, node.getPorts()[target]!);
    const label = new LLabel('label');
    label.setProperty(LayeredOptions.EDGE_LABELS_INLINE, inline);
    edge.getLabels().push(label);
  }
  return node;
}

/** Installs the holder, routes the loops and places the labels without a label manager. */
function place(node: LNode): SelfLoopHolder {
  const slHolder = SelfLoopHolder.install(node);
  for (const slLoop of slHolder.getSLHyperLoops()) {
    slLoop.computePortsPerSide();
  }
  new RoutingDirector().determineLoopRoutes(slHolder);
  new LabelPlacer().placeLabels(slHolder, null, new NullElkProgressMonitor());
  return slHolder;
}

function placement(slLoop: SelfHyperLoop): { side: PortSide | null; alignment: Alignment | null } {
  const slLabels = slLoop.getSLLabels()!;
  return { side: slLabels.getSide(), alignment: slLabels.getAlignment() };
}

describe('LabelPlacer', () => {
  describe('one-sided loops', () => {
    it('centers the labels of a stacked northern loop and clears the inline property', () => {
      const slHolder = place(labelledNode([2, 0, 0, 0], [[0, 1]], true));
      const slLoop = slHolder.getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.NORTH, alignment: Alignment.CENTER });
      expect(slLoop.getSLLabels()!.getAlignmentReferenceSLPort()).toBeNull();
      expect(slLoop.getSLLabels()!.getLLabels()[0]!.getProperty(LayeredOptions.EDGE_LABELS_INLINE)).toBe(false);
    });

    it('centers the labels of a stacked southern loop', () => {
      const slLoop = place(labelledNode([0, 0, 2, 0], [[0, 1]])).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.SOUTH, alignment: Alignment.CENTER });
    });

    it.each([
      [PortSide.EAST, [0, 2, 0, 0]],
      [PortSide.WEST, [0, 0, 0, 2]],
    ] as const)('aligns the labels of an %s loop to its topmost port', (side, counts) => {
      const node = labelledNode(counts, [[0, 1]]);
      const slLoop = place(node).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side, alignment: Alignment.TOP });
      // Both ports are at the same y position, so the leftmost port stays the reference.
      expect(slLoop.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(slLoop.getLeftmostPort());
    });

    it('takes the rightmost port as reference when it lies above the leftmost one', () => {
      const node = labelledNode([0, 2, 0, 0], [[0, 1]]);
      node.getPorts()[0]!.getPosition().y = 10;
      const slLoop = place(node).getSLHyperLoops()[0]!;

      expect(slLoop.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(slLoop.getRightmostPort());
    });

    it('pairs northern loops from the outside in when sequenced', () => {
      const node = labelledNode(
        [6, 0, 0, 0],
        [
          [0, 1],
          [2, 3],
          [4, 5],
        ],
      );
      node.setProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING, SelfLoopOrderingStrategy.SEQUENCED);
      const [first, second, third] = place(node).getSLHyperLoops() as [SelfHyperLoop, SelfHyperLoop, SelfHyperLoop];

      expect(placement(first)).toEqual({ side: PortSide.NORTH, alignment: Alignment.RIGHT });
      expect(first.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(first.getRightmostPort());
      expect(placement(third)).toEqual({ side: PortSide.NORTH, alignment: Alignment.LEFT });
      expect(third.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(third.getLeftmostPort());
      expect(placement(second)).toEqual({ side: PortSide.NORTH, alignment: Alignment.CENTER });
      expect(second.getSLLabels()!.getAlignmentReferenceSLPort()).toBeNull();
    });

    it('pairs southern loops from the outside in, in reverse order, when sequenced', () => {
      const node = labelledNode(
        [0, 0, 4, 0],
        [
          [0, 1],
          [2, 3],
        ],
      );
      node.setProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING, SelfLoopOrderingStrategy.SEQUENCED);
      const [first, second] = place(node).getSLHyperLoops() as [SelfHyperLoop, SelfHyperLoop];

      // The list is sorted descendingly by the leftmost port ID, so the loop at ports 2 and 3 comes first.
      expect(placement(second)).toEqual({ side: PortSide.SOUTH, alignment: Alignment.RIGHT });
      expect(second.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(second.getLeftmostPort());
      expect(placement(first)).toEqual({ side: PortSide.SOUTH, alignment: Alignment.LEFT });
      expect(first.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(first.getRightmostPort());
    });

    it('places sequenced eastern loops like stacked ones', () => {
      const node = labelledNode([0, 2, 0, 0], [[0, 1]]);
      node.setProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING, SelfLoopOrderingStrategy.SEQUENCED);
      const slLoop = place(node).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.EAST, alignment: Alignment.TOP });
    });
  });

  describe('corner loops', () => {
    it.each([
      ['north-east', [1, 1, 0, 0], PortSide.NORTH, Alignment.LEFT, 'leftmost'],
      ['west-north', [1, 0, 0, 1], PortSide.NORTH, Alignment.RIGHT, 'rightmost'],
      ['south-west', [0, 0, 1, 1], PortSide.SOUTH, Alignment.RIGHT, 'leftmost'],
      ['east-south', [0, 1, 1, 0], PortSide.SOUTH, Alignment.LEFT, 'rightmost'],
    ] as const)('places the labels of a %s loop', (_name, counts, side, alignment, reference) => {
      const slLoop = place(labelledNode(counts, [[0, 1]], true)).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side, alignment });
      const expected = reference === 'leftmost' ? slLoop.getLeftmostPort() : slLoop.getRightmostPort();
      expect(slLoop.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(expected);
      expect(slLoop.getSLLabels()!.getLLabels()[0]!.getProperty(LayeredOptions.EDGE_LABELS_INLINE)).toBe(false);
    });
  });

  describe('loops over three or more sides', () => {
    // Three-sided loops over ports 0-1 and 1-2 (one loop, ports shared at 1).
    const THREE = [
      [0, 1],
      [1, 2],
    ] as const;

    it.each([
      ['missing north', [0, 1, 1, 1], false, PortSide.SOUTH, Alignment.CENTER, null],
      ['missing south', [1, 1, 0, 1], false, PortSide.NORTH, Alignment.CENTER, null],
      ['missing south, inline', [1, 1, 0, 1], true, PortSide.NORTH, Alignment.CENTER, null],
      ['missing west', [1, 1, 1, 0], false, PortSide.NORTH, Alignment.LEFT, 'leftmost'],
      ['missing west, inline', [1, 1, 1, 0], true, PortSide.EAST, Alignment.CENTER, null],
      ['missing east', [1, 0, 1, 1], false, PortSide.NORTH, Alignment.RIGHT, 'rightmost'],
      ['missing east, inline', [1, 0, 1, 1], true, PortSide.WEST, Alignment.CENTER, null],
    ] as const)('places the labels of a loop %s', (_name, counts, inline, side, alignment, reference) => {
      const slLoop = place(labelledNode(counts, THREE, inline)).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side, alignment });
      const expected =
        reference === null ? null : reference === 'leftmost' ? slLoop.getLeftmostPort() : slLoop.getRightmostPort();
      expect(slLoop.getSLLabels()!.getAlignmentReferenceSLPort()).toBe(expected);
    });

    it('places the labels of an opposing loop on the side not occupied by it', () => {
      // North-south loop between unconnected neighbours: both routes cost the same, so the first one is chosen.
      const slLoop = place(labelledNode([1, 1, 1, 1], [[0, 2]])).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.NORTH, alignment: Alignment.LEFT });
    });

    it('centers the labels of a four-sided loop on the south side if the leftmost port is on the north side', () => {
      const node = labelledNode(
        [1, 1, 1, 1],
        [
          [0, 1],
          [1, 2],
          [2, 3],
        ],
        true,
      );
      const slLoop = place(node).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.SOUTH, alignment: Alignment.CENTER });
      expect(slLoop.getSLLabels()!.getLLabels()[0]!.getProperty(LayeredOptions.EDGE_LABELS_INLINE)).toBe(false);
    });

    it('centers the labels of a four-sided loop on the north side otherwise', () => {
      // The gap with the highest penalty lies between the east and the south port, so the loop starts at the south port.
      const node = labelledNode(
        [1, 3, 1, 1],
        [
          [0, 1],
          [1, 4],
          [4, 5],
        ],
      );
      const slLoop = place(node).getSLHyperLoops()[0]!;

      expect(placement(slLoop)).toEqual({ side: PortSide.NORTH, alignment: Alignment.CENTER });
    });
  });

  it('leaves loops without labels alone', () => {
    const node = Creator.node(new LGraph());
    Creator.ports(node, 2, 0, 0, 0);
    Creator.edge(node.getPorts()[0]!, node.getPorts()[1]!);
    const slLoop = place(node).getSLHyperLoops()[0]!;

    expect(slLoop.getSLLabels()).toBeNull();
  });

  it('throws a TypeError for a loop whose type was not determined', () => {
    const node = labelledNode([2, 0, 0, 0], [[0, 1]]);
    const slHolder = SelfLoopHolder.install(node);

    expect(() => new LabelPlacer().placeLabels(slHolder, null, new NullElkProgressMonitor())).toThrow(
      new TypeError('The self loop type of a hyper loop must be determined before placing labels.'),
    );
  });
});
