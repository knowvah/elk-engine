// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addPort, loadLayoutMetaData, nodeFixture } from '../../../../test/helpers/node-context-fixtures.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { NodeLabelAndSizeCalculator } from './NodeLabelAndSizeCalculator.js';

beforeAll(loadLayoutMetaData);

const { INSIDE, V_TOP, H_LEFT } = NodeLabelPlacement;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 60;

function sizedByMinimum(n: ElkNode): void {
  n.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
  n.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(MIN_WIDTH, MIN_HEIGHT));
}

function insideTopLeftLabels(n: ElkNode, ...sizes: [number, number][]): void {
  n.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
  for (const [w, h] of sizes) {
    ElkGraphUtil.createLabel(n).setDimensions(w, h);
  }
}

describe('NodeLabelAndSizeCalculator.process', () => {
  it('process(graph) applies the sizes and positions to every child', () => {
    const { graph, node } = nodeFixture((n) => {
      sizedByMinimum(n);
      addPort(n, PortSide.EAST);
    });
    expect(NodeLabelAndSizeCalculator.process(graph)).toBeUndefined();
    expect([node.getWidth(), node.getHeight()]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
    // vertical port on the EAST side: x = node width
    expect(node.getPorts().get(0).getX()).toBe(MIN_WIDTH);
  });

  it('process(graph, node, true, false) returns the applied size', () => {
    const { graph, nodeAdapter, node } = nodeFixture(sizedByMinimum);
    const size = NodeLabelAndSizeCalculator.process(graph, nodeAdapter, true, false);
    expect([size.x, size.y]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
    expect([node.getWidth(), node.getHeight()]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
  });

  it('process(graph, node, false, false) returns the size without applying anything', () => {
    const { graph, nodeAdapter, node } = nodeFixture((n) => {
      sizedByMinimum(n);
      addPort(n, PortSide.EAST);
    });
    const size = NodeLabelAndSizeCalculator.process(graph, nodeAdapter, false, false);
    expect([size.x, size.y]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
    expect([node.getWidth(), node.getHeight()]).toEqual([40, 30]);
    expect(node.getPorts().get(0).getX()).toBe(0);
  });

  it('uses the horizontal layout mode when the graph has no direction, and for UNDEFINED and horizontal ones', () => {
    // Two inside labels at one location stack vertically in horizontal mode: height 10 + 7, width 20.
    // Minimum size is the only constraint, with no content contribution, so the node stays at the minimum; the
    // labels are placed from the top-left: the second label sits below the first.
    const place = (direction: Direction | null): number[] => {
      const { graph, nodeAdapter, node } = nodeFixture((n, root) => {
        sizedByMinimum(n);
        insideTopLeftLabels(n, [20, 10], [15, 7]);
        if (direction !== null) {
          root.setProperty(CoreOptions.DIRECTION, direction);
        }
      });
      NodeLabelAndSizeCalculator.process(graph, nodeAdapter, true, false);
      return [...node.getLabels()].flatMap((l) => [l.getX(), l.getY()]);
    };
    const stacked = place(null);
    expect(place(Direction.UNDEFINED)).toEqual(stacked);
    expect(place(Direction.RIGHT)).toEqual(stacked);
    // vertical layout mode: side-by-side, so the second label's x moves right and its y returns to the first one's
    const sideBySide = place(Direction.DOWN);
    expect(stacked[0]).toBe(sideBySide[0]);
    expect(stacked[3]).toBeGreaterThan(stacked[1] as number);
    expect(sideBySide[3]).toBe(sideBySide[1]);
    expect(sideBySide[2]).toBeGreaterThan(sideBySide[0] as number);
  });
});

describe('NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding', () => {
  /* Inside node labels padding defaults to 5 on each side and the label spacing to 0, so the padding is the label
   * extent plus 5 on the label's sides (NodeLabelAndSizeCalculator.java:225-290). */
  it('is zero without inside labels', () => {
    const { graph, nodeAdapter } = nodeFixture();
    const padding = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(graph, nodeAdapter, Direction.RIGHT);
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([0, 0, 0, 0]);
  });

  it('reserves the top and left of a top-left label, plus the container padding', () => {
    const { graph, nodeAdapter } = nodeFixture((n) => insideTopLeftLabels(n, [20, 10]));
    const padding = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(graph, nodeAdapter, Direction.RIGHT);
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([15, 0, 0, 25]);
  });

  it('reserves the bottom and right of a bottom-right label', () => {
    const { graph, nodeAdapter } = nodeFixture((n) => {
      n.setProperty(
        CoreOptions.NODE_LABELS_PLACEMENT,
        EnumSet.of(INSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_RIGHT),
      );
      ElkGraphUtil.createLabel(n).setDimensions(20, 10);
    });
    const padding = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(graph, nodeAdapter, Direction.RIGHT);
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([0, 25, 15, 0]);
  });

  it('stacks labels vertically for horizontal directions and side by side for vertical ones', () => {
    // Label spacing 3 on the root: label gap 3, container gap 2 * 3 = 6; container padding 5.
    const configure = (n: ElkNode, root: ElkNode): void => {
      root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 3);
      insideTopLeftLabels(n, [20, 10], [15, 7]);
    };
    const horizontal = nodeFixture(configure);
    const stacked = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(
      horizontal.graph,
      horizontal.nodeAdapter,
      Direction.RIGHT,
    );
    // top: 10 + 3 + 7 + 5 + 6 = 31; left: 20 + 5 + 6 = 31
    expect([stacked.top, stacked.left]).toEqual([31, 31]);
    const vertical = nodeFixture(configure);
    const sideBySide = NodeLabelAndSizeCalculator.computeInsideNodeLabelPadding(
      vertical.graph,
      vertical.nodeAdapter,
      Direction.DOWN,
    );
    // top: 10 + 5 + 6 = 21; left: 20 + 3 + 15 + 5 + 6 = 49
    expect([sideBySide.top, sideBySide.left]).toEqual([21, 49]);
  });
});
